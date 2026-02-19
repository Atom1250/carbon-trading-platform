import type { IDatabaseClient } from '@libs/database';
import { NotFoundError } from '@libs/errors';
import type {
  ReconciliationRun,
  ReconciliationVariance,
  ReconciliationListQuery,
} from '../types/ledger.types.js';

const RECONCILIATION_COLUMNS = `
  id,
  run_type         AS "runType",
  status,
  total_accounts   AS "totalAccounts",
  total_debits     AS "totalDebits",
  total_credits    AS "totalCredits",
  variance_count   AS "varianceCount",
  variances,
  tolerance,
  started_at       AS "startedAt",
  completed_at     AS "completedAt",
  created_at       AS "createdAt"
`;

const DEFAULT_TOLERANCE = 0.01;

export class ReconciliationService {
  constructor(private readonly db: IDatabaseClient) {}

  async runReconciliation(runType: string = 'daily'): Promise<ReconciliationRun> {
    const startedAt = new Date();

    // Fetch all active account balances with debit/credit totals
    const rows = await this.db.query<{
      accountId: string;
      accountCode: string;
      accountName: string;
      category: string;
      totalDebits: string;
      totalCredits: string;
    }>(
      `SELECT
         ga.id                                    AS "accountId",
         ga.code                                  AS "accountCode",
         ga.name                                  AS "accountName",
         ga.category                              AS "category",
         COALESCE(SUM(jel.debit_amount), 0)       AS "totalDebits",
         COALESCE(SUM(jel.credit_amount), 0)      AS "totalCredits"
       FROM gl_accounts ga
       LEFT JOIN journal_entry_lines jel ON jel.account_id = ga.id
       LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.status = 'posted'
       WHERE ga.is_active = true
       GROUP BY ga.id, ga.code, ga.name, ga.category
       ORDER BY ga.code ASC`,
    );

    // Check each posted journal entry for balance (debits = credits)
    const unbalancedEntries = await this.db.query<{
      entryId: string;
      totalDebits: string;
      totalCredits: string;
    }>(
      `SELECT
         je.id                                    AS "entryId",
         COALESCE(SUM(jel.debit_amount), 0)       AS "totalDebits",
         COALESCE(SUM(jel.credit_amount), 0)      AS "totalCredits"
       FROM journal_entries je
       JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id
       WHERE je.status = 'posted'
       GROUP BY je.id
       HAVING ABS(SUM(jel.debit_amount) - SUM(jel.credit_amount)) > $1`,
      [DEFAULT_TOLERANCE],
    );

    // Compute grand totals
    let grandTotalDebits = 0;
    let grandTotalCredits = 0;
    for (const row of rows) {
      grandTotalDebits += parseFloat(row.totalDebits);
      grandTotalCredits += parseFloat(row.totalCredits);
    }

    // Detect variances
    const variances: ReconciliationVariance[] = [];

    // 1. Check overall balance
    if (Math.abs(grandTotalDebits - grandTotalCredits) > DEFAULT_TOLERANCE) {
      variances.push({
        accountId: 'SYSTEM',
        accountCode: 'SYSTEM',
        accountName: 'Grand Total Mismatch',
        expectedBalance: grandTotalDebits.toFixed(2),
        actualBalance: grandTotalCredits.toFixed(2),
        variance: (grandTotalDebits - grandTotalCredits).toFixed(2),
        severity: 'error',
      });
    }

    // 2. Check for unbalanced journal entries
    for (const entry of unbalancedEntries) {
      const variance = parseFloat(entry.totalDebits) - parseFloat(entry.totalCredits);
      variances.push({
        accountId: entry.entryId,
        accountCode: 'ENTRY',
        accountName: `Unbalanced Entry ${entry.entryId}`,
        expectedBalance: entry.totalDebits,
        actualBalance: entry.totalCredits,
        variance: variance.toFixed(2),
        severity: 'error',
      });
    }

    // 3. Check for accounts with unexpected negative balances
    for (const row of rows) {
      const debits = parseFloat(row.totalDebits);
      const credits = parseFloat(row.totalCredits);
      const isDebitNormal = row.category === 'asset' || row.category === 'expense';
      const balance = isDebitNormal ? debits - credits : credits - debits;

      // Asset and expense accounts shouldn't have negative balances normally
      if (balance < -DEFAULT_TOLERANCE && (row.category === 'asset')) {
        variances.push({
          accountId: row.accountId,
          accountCode: row.accountCode,
          accountName: row.accountName,
          expectedBalance: '0.00',
          actualBalance: balance.toFixed(2),
          variance: balance.toFixed(2),
          severity: 'warning',
        });
      }
    }

    // Determine status
    const hasErrors = variances.some((v) => v.severity === 'error');
    const hasWarnings = variances.some((v) => v.severity === 'warning');
    const status = hasErrors ? 'failed' : hasWarnings ? 'warning' : 'passed';

    // Store reconciliation run
    const runRows = await this.db.query<ReconciliationRun>(
      `INSERT INTO reconciliation_runs (
        run_type, status, total_accounts, total_debits, total_credits,
        variance_count, variances, tolerance, started_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING ${RECONCILIATION_COLUMNS}`,
      [
        runType,
        status,
        rows.length,
        grandTotalDebits.toFixed(2),
        grandTotalCredits.toFixed(2),
        variances.length,
        variances.length > 0 ? JSON.stringify(variances) : null,
        DEFAULT_TOLERANCE,
        startedAt,
      ],
    );

    return runRows[0];
  }

  async getReconciliationById(id: string): Promise<ReconciliationRun> {
    const rows = await this.db.query<ReconciliationRun>(
      `SELECT ${RECONCILIATION_COLUMNS} FROM reconciliation_runs WHERE id = $1`,
      [id],
    );

    if (rows.length === 0) {
      throw new NotFoundError('Reconciliation Run', id);
    }

    return rows[0];
  }

  async getLatestReconciliation(): Promise<ReconciliationRun | null> {
    const rows = await this.db.query<ReconciliationRun>(
      `SELECT ${RECONCILIATION_COLUMNS} FROM reconciliation_runs ORDER BY created_at DESC LIMIT 1`,
    );

    return rows.length > 0 ? rows[0] : null;
  }

  async listReconciliationRuns(params: ReconciliationListQuery): Promise<{ runs: ReconciliationRun[]; total: number }> {
    const conditions: string[] = ['1=1'];
    const filterValues: unknown[] = [];

    if (params.status) {
      filterValues.push(params.status);
      conditions.push(`status = $${filterValues.length}`);
    }

    if (params.runType) {
      filterValues.push(params.runType);
      conditions.push(`run_type = $${filterValues.length}`);
    }

    const countRows = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM reconciliation_runs WHERE ${conditions.join(' AND ')}`,
      filterValues,
    );
    const total = parseInt(countRows[0].count, 10);

    const limitParam = filterValues.length + 1;
    const offsetParam = filterValues.length + 2;

    const runs = await this.db.query<ReconciliationRun>(
      `SELECT ${RECONCILIATION_COLUMNS}
       FROM reconciliation_runs
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      [...filterValues, params.limit, params.offset],
    );

    return { runs, total };
  }
}
