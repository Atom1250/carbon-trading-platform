import type { IDatabaseClient } from '@libs/database';
import { NotFoundError, ValidationError } from '@libs/errors';
import { createLogger } from '@libs/logger';
import type { BankStatementParser } from './BankStatementParser.js';
import type {
  BankStatement,
  BankStatementEntry,
  BankReconciliationRun,
  BankReconciliationReport,
  BankReconciliationListQuery,
  ImportBankStatementDTO,
} from '../types/ledger.types.js';

const logger = createLogger('bank-reconciliation-service');

const STATEMENT_COLUMNS = `
  id,
  institution_id    AS "institutionId",
  bank_name         AS "bankName",
  account_number    AS "accountNumber",
  statement_date    AS "statementDate",
  opening_balance   AS "openingBalance",
  closing_balance   AS "closingBalance",
  entry_count       AS "entryCount",
  imported_by       AS "importedBy",
  file_name         AS "fileName",
  created_at        AS "createdAt",
  updated_at        AS "updatedAt"
`;

const ENTRY_COLUMNS = `
  id,
  statement_id           AS "statementId",
  transaction_date       AS "transactionDate",
  description,
  reference,
  debit_amount           AS "debitAmount",
  credit_amount          AS "creditAmount",
  balance,
  match_status           AS "matchStatus",
  matched_deposit_id     AS "matchedDepositId",
  matched_withdrawal_id  AS "matchedWithdrawalId",
  match_confidence       AS "matchConfidence",
  dispute_reason         AS "disputeReason",
  resolved_at            AS "resolvedAt",
  created_at             AS "createdAt",
  updated_at             AS "updatedAt"
`;

const RUN_COLUMNS = `
  id,
  institution_id    AS "institutionId",
  statement_id      AS "statementId",
  status,
  total_entries     AS "totalEntries",
  matched_count     AS "matchedCount",
  unmatched_count   AS "unmatchedCount",
  disputed_count    AS "disputedCount",
  match_rate        AS "matchRate",
  total_variance    AS "totalVariance",
  started_at        AS "startedAt",
  completed_at      AS "completedAt",
  run_by            AS "runBy",
  created_at        AS "createdAt",
  updated_at        AS "updatedAt"
`;

// Match confidence thresholds
const EXACT_MATCH_CONFIDENCE = 100;
const HIGH_MATCH_CONFIDENCE = 85;
const AMOUNT_MATCH_TOLERANCE = 0.01;

export class BankReconciliationService {
  constructor(
    private readonly db: IDatabaseClient,
    private readonly parser: BankStatementParser,
  ) {}

  // ─── Import ───────────────────────────────────────────────────────────────

  async importStatement(
    dto: ImportBankStatementDTO,
    csvContent: string,
  ): Promise<{ statement: BankStatement; entries: BankStatementEntry[] }> {
    const parsedEntries = this.parser.parse(csvContent);

    const statementRows = await this.db.query<BankStatement>(
      `INSERT INTO bank_statements
        (institution_id, bank_name, account_number, statement_date, opening_balance, closing_balance, entry_count, imported_by, file_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING ${STATEMENT_COLUMNS}`,
      [
        dto.institutionId,
        dto.bankName,
        dto.accountNumber,
        dto.statementDate,
        dto.openingBalance,
        dto.closingBalance,
        parsedEntries.length,
        dto.importedBy,
        dto.fileName ?? null,
      ],
    );
    const statement = statementRows[0];

    const entries: BankStatementEntry[] = [];
    for (const entry of parsedEntries) {
      const entryRows = await this.db.query<BankStatementEntry>(
        `INSERT INTO bank_statement_entries
          (statement_id, transaction_date, description, reference, debit_amount, credit_amount, balance)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING ${ENTRY_COLUMNS}`,
        [
          statement.id,
          entry.transactionDate,
          entry.description,
          entry.reference ?? null,
          entry.debitAmount,
          entry.creditAmount,
          entry.balance ?? null,
        ],
      );
      entries.push(entryRows[0]);
    }

    logger.info('Bank statement imported', {
      statementId: statement.id,
      institutionId: dto.institutionId,
      entryCount: parsedEntries.length,
    });

    return { statement, entries };
  }

  // ─── Reconciliation Run ────────────────────────────────────────────────────

  async runReconciliation(
    statementId: string,
    runBy?: string,
  ): Promise<BankReconciliationRun> {
    const statement = await this.getStatementById(statementId);

    // Create run record
    const runRows = await this.db.query<BankReconciliationRun>(
      `INSERT INTO bank_reconciliation_runs
        (institution_id, statement_id, status, started_at, run_by)
       VALUES ($1, $2, 'in_progress', NOW(), $3)
       RETURNING ${RUN_COLUMNS}`,
      [statement.institutionId, statementId, runBy ?? null],
    );
    const runId = runRows[0].id;

    try {
      // Get all entries for statement
      const entries = await this.db.query<BankStatementEntry>(
        `SELECT ${ENTRY_COLUMNS} FROM bank_statement_entries WHERE statement_id = $1`,
        [statementId],
      );

      let matchedCount = 0;
      let unmatchedCount = 0;
      let totalVariance = 0;

      for (const entry of entries) {
        const matched = await this.matchEntry(entry, statement.institutionId);
        if (matched) {
          matchedCount++;
        } else {
          unmatchedCount++;
          const amount = parseFloat(entry.debitAmount) || parseFloat(entry.creditAmount);
          totalVariance += amount;
        }
      }

      const totalEntries = entries.length;
      const matchRate = totalEntries > 0
        ? parseFloat(((matchedCount / totalEntries) * 100).toFixed(2))
        : 0;

      // Update run as completed
      const completedRows = await this.db.query<BankReconciliationRun>(
        `UPDATE bank_reconciliation_runs
         SET status = 'completed', total_entries = $2, matched_count = $3,
             unmatched_count = $4, match_rate = $5, total_variance = $6,
             completed_at = NOW(), updated_at = NOW()
         WHERE id = $1
         RETURNING ${RUN_COLUMNS}`,
        [runId, totalEntries, matchedCount, unmatchedCount, matchRate, totalVariance],
      );

      logger.info('Bank reconciliation completed', {
        runId,
        statementId,
        totalEntries,
        matchedCount,
        unmatchedCount,
        matchRate,
      });

      return completedRows[0];
    } catch (err) {
      // Mark run as failed
      await this.db.query(
        `UPDATE bank_reconciliation_runs
         SET status = 'failed', completed_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [runId],
      );
      throw err;
    }
  }

  // ─── Transaction Matching ──────────────────────────────────────────────────

  private async matchEntry(
    entry: BankStatementEntry,
    institutionId: string,
  ): Promise<boolean> {
    const entryAmount = parseFloat(entry.creditAmount) || parseFloat(entry.debitAmount);
    const isCredit = parseFloat(entry.creditAmount) > 0;

    if (isCredit) {
      // Credits = deposits into bank → match against completed deposits
      return this.matchDeposit(entry, institutionId, entryAmount);
    } else {
      // Debits = withdrawals from bank → match against completed withdrawals
      return this.matchWithdrawal(entry, institutionId, entryAmount);
    }
  }

  private async matchDeposit(
    entry: BankStatementEntry,
    institutionId: string,
    amount: number,
  ): Promise<boolean> {
    // Try exact match by reference first
    if (entry.reference) {
      const refMatches = await this.db.query<{ id: string; amount: string }>(
        `SELECT id, amount FROM deposits
         WHERE institution_id = $1 AND status = 'completed'
           AND external_reference = $2
           AND id NOT IN (SELECT matched_deposit_id FROM bank_statement_entries WHERE matched_deposit_id IS NOT NULL)`,
        [institutionId, entry.reference],
      );

      if (refMatches.length > 0) {
        const confidence = Math.abs(parseFloat(refMatches[0].amount) - amount) < AMOUNT_MATCH_TOLERANCE
          ? EXACT_MATCH_CONFIDENCE
          : HIGH_MATCH_CONFIDENCE;

        await this.db.query(
          `UPDATE bank_statement_entries
           SET match_status = 'matched', matched_deposit_id = $2, match_confidence = $3, updated_at = NOW()
           WHERE id = $1`,
          [entry.id, refMatches[0].id, confidence],
        );
        return true;
      }
    }

    // Fall back to amount + date matching
    const amountMatches = await this.db.query<{ id: string; amount: string }>(
      `SELECT id, amount FROM deposits
       WHERE institution_id = $1 AND status = 'completed'
         AND ABS(amount - $2) < $3
         AND id NOT IN (SELECT matched_deposit_id FROM bank_statement_entries WHERE matched_deposit_id IS NOT NULL)
       ORDER BY created_at DESC
       LIMIT 1`,
      [institutionId, amount, AMOUNT_MATCH_TOLERANCE],
    );

    if (amountMatches.length > 0) {
      await this.db.query(
        `UPDATE bank_statement_entries
         SET match_status = 'matched', matched_deposit_id = $2, match_confidence = $3, updated_at = NOW()
         WHERE id = $1`,
        [entry.id, amountMatches[0].id, HIGH_MATCH_CONFIDENCE],
      );
      return true;
    }

    return false;
  }

  private async matchWithdrawal(
    entry: BankStatementEntry,
    institutionId: string,
    amount: number,
  ): Promise<boolean> {
    // Try exact match by reference first
    if (entry.reference) {
      const refMatches = await this.db.query<{ id: string; net_amount: string }>(
        `SELECT id, net_amount FROM withdrawals
         WHERE institution_id = $1 AND status = 'completed'
           AND external_reference = $2
           AND id NOT IN (SELECT matched_withdrawal_id FROM bank_statement_entries WHERE matched_withdrawal_id IS NOT NULL)`,
        [institutionId, entry.reference],
      );

      if (refMatches.length > 0) {
        const confidence = Math.abs(parseFloat(refMatches[0].net_amount) - amount) < AMOUNT_MATCH_TOLERANCE
          ? EXACT_MATCH_CONFIDENCE
          : HIGH_MATCH_CONFIDENCE;

        await this.db.query(
          `UPDATE bank_statement_entries
           SET match_status = 'matched', matched_withdrawal_id = $2, match_confidence = $3, updated_at = NOW()
           WHERE id = $1`,
          [entry.id, refMatches[0].id, confidence],
        );
        return true;
      }
    }

    // Fall back to amount matching
    const amountMatches = await this.db.query<{ id: string; net_amount: string }>(
      `SELECT id, net_amount FROM withdrawals
       WHERE institution_id = $1 AND status = 'completed'
         AND ABS(net_amount - $2) < $3
         AND id NOT IN (SELECT matched_withdrawal_id FROM bank_statement_entries WHERE matched_withdrawal_id IS NOT NULL)
       ORDER BY created_at DESC
       LIMIT 1`,
      [institutionId, amount, AMOUNT_MATCH_TOLERANCE],
    );

    if (amountMatches.length > 0) {
      await this.db.query(
        `UPDATE bank_statement_entries
         SET match_status = 'matched', matched_withdrawal_id = $2, match_confidence = $3, updated_at = NOW()
         WHERE id = $1`,
        [entry.id, amountMatches[0].id, HIGH_MATCH_CONFIDENCE],
      );
      return true;
    }

    return false;
  }

  // ─── Dispute / Resolve ─────────────────────────────────────────────────────

  async disputeEntry(entryId: string, reason: string): Promise<BankStatementEntry> {
    const entry = await this.getEntryById(entryId);

    if (entry.matchStatus !== 'matched' && entry.matchStatus !== 'unmatched') {
      throw new ValidationError(`Cannot dispute entry with status: ${entry.matchStatus}`);
    }

    const rows = await this.db.query<BankStatementEntry>(
      `UPDATE bank_statement_entries
       SET match_status = 'disputed', dispute_reason = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING ${ENTRY_COLUMNS}`,
      [entryId, reason],
    );

    logger.info('Bank entry disputed', { entryId, reason });
    return rows[0];
  }

  async resolveEntry(entryId: string): Promise<BankStatementEntry> {
    const entry = await this.getEntryById(entryId);

    if (entry.matchStatus !== 'disputed') {
      throw new ValidationError(`Can only resolve disputed entries, current status: ${entry.matchStatus}`);
    }

    const rows = await this.db.query<BankStatementEntry>(
      `UPDATE bank_statement_entries
       SET match_status = 'resolved', resolved_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING ${ENTRY_COLUMNS}`,
      [entryId],
    );

    logger.info('Bank entry resolved', { entryId });
    return rows[0];
  }

  // ─── Reports ───────────────────────────────────────────────────────────────

  async getReconciliationReport(runId: string): Promise<BankReconciliationReport> {
    const run = await this.getRunById(runId);
    const statement = await this.getStatementById(run.statementId);
    const entries = await this.db.query<BankStatementEntry>(
      `SELECT ${ENTRY_COLUMNS} FROM bank_statement_entries
       WHERE statement_id = $1 ORDER BY transaction_date, created_at`,
      [statement.id],
    );

    let totalCredits = 0;
    let totalDebits = 0;
    let matchedCredits = 0;
    let matchedDebits = 0;

    for (const entry of entries) {
      const credit = parseFloat(entry.creditAmount);
      const debit = parseFloat(entry.debitAmount);
      totalCredits += credit;
      totalDebits += debit;

      if (entry.matchStatus === 'matched' || entry.matchStatus === 'resolved') {
        matchedCredits += credit;
        matchedDebits += debit;
      }
    }

    return {
      run,
      statement,
      entries,
      summary: {
        totalCredits: parseFloat(totalCredits.toFixed(2)),
        totalDebits: parseFloat(totalDebits.toFixed(2)),
        matchedCredits: parseFloat(matchedCredits.toFixed(2)),
        matchedDebits: parseFloat(matchedDebits.toFixed(2)),
        unmatchedCredits: parseFloat((totalCredits - matchedCredits).toFixed(2)),
        unmatchedDebits: parseFloat((totalDebits - matchedDebits).toFixed(2)),
      },
    };
  }

  // ─── Queries ───────────────────────────────────────────────────────────────

  async getStatementById(id: string): Promise<BankStatement> {
    const rows = await this.db.query<BankStatement>(
      `SELECT ${STATEMENT_COLUMNS} FROM bank_statements WHERE id = $1`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundError('BankStatement', id);
    return rows[0];
  }

  async getEntryById(id: string): Promise<BankStatementEntry> {
    const rows = await this.db.query<BankStatementEntry>(
      `SELECT ${ENTRY_COLUMNS} FROM bank_statement_entries WHERE id = $1`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundError('BankStatementEntry', id);
    return rows[0];
  }

  async getRunById(id: string): Promise<BankReconciliationRun> {
    const rows = await this.db.query<BankReconciliationRun>(
      `SELECT ${RUN_COLUMNS} FROM bank_reconciliation_runs WHERE id = $1`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundError('BankReconciliationRun', id);
    return rows[0];
  }

  async listRuns(params: BankReconciliationListQuery): Promise<{ runs: BankReconciliationRun[]; total: number }> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (params.institutionId) {
      conditions.push(`institution_id = $${paramIndex++}`);
      values.push(params.institutionId);
    }
    if (params.status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(params.status);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRows = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM bank_reconciliation_runs ${where}`,
      values,
    );
    const total = parseInt(countRows[0].count, 10);

    if (total === 0) return { runs: [], total: 0 };

    const runs = await this.db.query<BankReconciliationRun>(
      `SELECT ${RUN_COLUMNS} FROM bank_reconciliation_runs ${where}
       ORDER BY created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...values, params.limit, params.offset],
    );

    return { runs, total };
  }

  async getEntriesByStatement(
    statementId: string,
    matchStatus?: string,
  ): Promise<BankStatementEntry[]> {
    const conditions = ['statement_id = $1'];
    const values: unknown[] = [statementId];

    if (matchStatus) {
      conditions.push('match_status = $2');
      values.push(matchStatus);
    }

    return this.db.query<BankStatementEntry>(
      `SELECT ${ENTRY_COLUMNS} FROM bank_statement_entries
       WHERE ${conditions.join(' AND ')}
       ORDER BY transaction_date, created_at`,
      values,
    );
  }
}
