import type { IDatabaseClient } from '@libs/database';
import { NotFoundError, ValidationError } from '@libs/errors';
import type {
  GLAccount,
  CreateGLAccountDTO,
  GLAccountListQuery,
  JournalEntry,
  JournalEntryLine,
  JournalEntryWithLines,
  CreateJournalEntryDTO,
  JournalEntryListQuery,
  AccountBalance,
  TrialBalance,
} from '../types/ledger.types.js';

const GL_ACCOUNT_COLUMNS = `
  id,
  code,
  name,
  category,
  description,
  is_active          AS "isActive",
  parent_account_id  AS "parentAccountId",
  created_at         AS "createdAt",
  updated_at         AS "updatedAt"
`;

const JOURNAL_ENTRY_COLUMNS = `
  id,
  reference_type     AS "referenceType",
  reference_id       AS "referenceId",
  description,
  status,
  posted_at          AS "postedAt",
  reversed_at        AS "reversedAt",
  reversal_of_id     AS "reversalOfId",
  created_by         AS "createdBy",
  created_at         AS "createdAt",
  updated_at         AS "updatedAt"
`;

const JOURNAL_ENTRY_LINE_COLUMNS = `
  id,
  journal_entry_id   AS "journalEntryId",
  account_id         AS "accountId",
  debit_amount       AS "debitAmount",
  credit_amount      AS "creditAmount",
  description,
  created_at         AS "createdAt"
`;

export class LedgerService {
  constructor(private readonly db: IDatabaseClient) {}

  // ─── Chart of Accounts ───────────────────────────────────────────────────────

  async createAccount(data: CreateGLAccountDTO): Promise<GLAccount> {
    if (data.parentAccountId) {
      const parent = await this.db.query<GLAccount>(
        `SELECT id FROM gl_accounts WHERE id = $1`,
        [data.parentAccountId],
      );
      if (parent.length === 0) {
        throw new NotFoundError('GL Account', data.parentAccountId);
      }
    }

    const rows = await this.db.query<GLAccount>(
      `INSERT INTO gl_accounts (code, name, category, description, parent_account_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${GL_ACCOUNT_COLUMNS}`,
      [
        data.code,
        data.name,
        data.category,
        data.description ?? null,
        data.parentAccountId ?? null,
      ],
    );

    return rows[0];
  }

  async getAccountById(id: string): Promise<GLAccount> {
    const rows = await this.db.query<GLAccount>(
      `SELECT ${GL_ACCOUNT_COLUMNS} FROM gl_accounts WHERE id = $1`,
      [id],
    );

    if (rows.length === 0) {
      throw new NotFoundError('GL Account', id);
    }

    return rows[0];
  }

  async getAccountByCode(code: string): Promise<GLAccount> {
    const rows = await this.db.query<GLAccount>(
      `SELECT ${GL_ACCOUNT_COLUMNS} FROM gl_accounts WHERE code = $1`,
      [code],
    );

    if (rows.length === 0) {
      throw new NotFoundError('GL Account', code);
    }

    return rows[0];
  }

  async listAccounts(params: GLAccountListQuery): Promise<{ accounts: GLAccount[]; total: number }> {
    const conditions: string[] = ['1=1'];
    const filterValues: unknown[] = [];

    if (params.category) {
      filterValues.push(params.category);
      conditions.push(`category = $${filterValues.length}`);
    }

    if (params.isActive !== undefined) {
      filterValues.push(params.isActive);
      conditions.push(`is_active = $${filterValues.length}`);
    }

    const countRows = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM gl_accounts WHERE ${conditions.join(' AND ')}`,
      filterValues,
    );
    const total = parseInt(countRows[0].count, 10);

    const limitParam = filterValues.length + 1;
    const offsetParam = filterValues.length + 2;

    const accounts = await this.db.query<GLAccount>(
      `SELECT ${GL_ACCOUNT_COLUMNS}
       FROM gl_accounts
       WHERE ${conditions.join(' AND ')}
       ORDER BY code ASC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      [...filterValues, params.limit, params.offset],
    );

    return { accounts, total };
  }

  // ─── Journal Entries ─────────────────────────────────────────────────────────

  async createJournalEntry(data: CreateJournalEntryDTO): Promise<JournalEntryWithLines> {
    // Validate: at least 2 lines
    if (data.lines.length < 2) {
      throw new ValidationError('Journal entry must have at least 2 lines', [
        { field: 'lines', message: 'At least 2 lines are required', code: 'too_small' },
      ]);
    }

    // Validate: each line must have either debit or credit (not both, not neither)
    for (let i = 0; i < data.lines.length; i++) {
      const line = data.lines[i];
      if (line.debitAmount > 0 && line.creditAmount > 0) {
        throw new ValidationError('A line cannot have both debit and credit', [
          { field: `lines[${i}]`, message: 'Cannot have both debit and credit amounts', code: 'custom' },
        ]);
      }
      if (line.debitAmount <= 0 && line.creditAmount <= 0) {
        throw new ValidationError('A line must have either a debit or credit amount', [
          { field: `lines[${i}]`, message: 'Must have either a debit or credit amount', code: 'custom' },
        ]);
      }
    }

    // Validate: total debits = total credits
    const totalDebits = data.lines.reduce((sum, l) => sum + l.debitAmount, 0);
    const totalCredits = data.lines.reduce((sum, l) => sum + l.creditAmount, 0);

    if (Math.abs(totalDebits - totalCredits) > 0.001) {
      throw new ValidationError('Journal entry is not balanced', [
        {
          field: 'lines',
          message: `Total debits (${totalDebits.toFixed(2)}) must equal total credits (${totalCredits.toFixed(2)})`,
          code: 'custom',
        },
      ]);
    }

    // Validate: all account IDs exist
    const accountIds = [...new Set(data.lines.map((l) => l.accountId))];
    const accountRows = await this.db.query<{ id: string }>(
      `SELECT id FROM gl_accounts WHERE id = ANY($1)`,
      [accountIds],
    );
    if (accountRows.length !== accountIds.length) {
      const found = new Set(accountRows.map((r) => r.id));
      const missing = accountIds.filter((id) => !found.has(id));
      throw new NotFoundError('GL Account', missing.join(', '));
    }

    // Insert journal entry header
    const entryRows = await this.db.query<JournalEntry>(
      `INSERT INTO journal_entries (reference_type, reference_id, description, status, posted_at, created_by)
       VALUES ($1, $2, $3, 'posted', NOW(), $4)
       RETURNING ${JOURNAL_ENTRY_COLUMNS}`,
      [data.referenceType, data.referenceId, data.description, data.createdBy],
    );

    const entry = entryRows[0];

    // Insert journal entry lines
    const lines: JournalEntryLine[] = [];
    for (const line of data.lines) {
      const lineRows = await this.db.query<JournalEntryLine>(
        `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount, description)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING ${JOURNAL_ENTRY_LINE_COLUMNS}`,
        [entry.id, line.accountId, line.debitAmount, line.creditAmount, line.description ?? null],
      );
      lines.push(lineRows[0]);
    }

    return { ...entry, lines };
  }

  async getJournalEntryById(id: string): Promise<JournalEntryWithLines> {
    const entryRows = await this.db.query<JournalEntry>(
      `SELECT ${JOURNAL_ENTRY_COLUMNS} FROM journal_entries WHERE id = $1`,
      [id],
    );

    if (entryRows.length === 0) {
      throw new NotFoundError('Journal Entry', id);
    }

    const lineRows = await this.db.query<JournalEntryLine>(
      `SELECT ${JOURNAL_ENTRY_LINE_COLUMNS}
       FROM journal_entry_lines
       WHERE journal_entry_id = $1
       ORDER BY created_at ASC`,
      [id],
    );

    return { ...entryRows[0], lines: lineRows };
  }

  async listJournalEntries(params: JournalEntryListQuery): Promise<{ entries: JournalEntryWithLines[]; total: number }> {
    const conditions: string[] = ['1=1'];
    const filterValues: unknown[] = [];

    if (params.referenceType) {
      filterValues.push(params.referenceType);
      conditions.push(`je.reference_type = $${filterValues.length}`);
    }

    if (params.referenceId) {
      filterValues.push(params.referenceId);
      conditions.push(`je.reference_id = $${filterValues.length}`);
    }

    if (params.status) {
      filterValues.push(params.status);
      conditions.push(`je.status = $${filterValues.length}`);
    }

    if (params.accountId) {
      filterValues.push(params.accountId);
      conditions.push(`EXISTS (SELECT 1 FROM journal_entry_lines jel WHERE jel.journal_entry_id = je.id AND jel.account_id = $${filterValues.length})`);
    }

    if (params.startDate) {
      filterValues.push(params.startDate);
      conditions.push(`je.created_at >= $${filterValues.length}`);
    }

    if (params.endDate) {
      filterValues.push(params.endDate);
      conditions.push(`je.created_at <= $${filterValues.length}`);
    }

    const countRows = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM journal_entries je WHERE ${conditions.join(' AND ')}`,
      filterValues,
    );
    const total = parseInt(countRows[0].count, 10);

    const limitParam = filterValues.length + 1;
    const offsetParam = filterValues.length + 2;

    const entries = await this.db.query<JournalEntry>(
      `SELECT ${JOURNAL_ENTRY_COLUMNS.replace(/\n/g, '\n  ').split(',').map((c) => `je.${c.trim()}`).join(',\n  ')}
       FROM journal_entries je
       WHERE ${conditions.join(' AND ')}
       ORDER BY je.created_at DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      [...filterValues, params.limit, params.offset],
    );

    // Fetch lines for each entry
    const result: JournalEntryWithLines[] = [];
    for (const entry of entries) {
      const lineRows = await this.db.query<JournalEntryLine>(
        `SELECT ${JOURNAL_ENTRY_LINE_COLUMNS}
         FROM journal_entry_lines
         WHERE journal_entry_id = $1
         ORDER BY created_at ASC`,
        [entry.id],
      );
      result.push({ ...entry, lines: lineRows });
    }

    return { entries: result, total };
  }

  async reverseJournalEntry(id: string, reversedBy: string): Promise<JournalEntryWithLines> {
    // Fetch original entry
    const original = await this.getJournalEntryById(id);

    if (original.status === 'reversed') {
      throw new ValidationError('Journal entry has already been reversed', [
        { field: 'id', message: 'This entry has already been reversed', code: 'custom' },
      ]);
    }

    if (original.status !== 'posted') {
      throw new ValidationError('Only posted entries can be reversed', [
        { field: 'status', message: `Cannot reverse entry with status '${original.status}'`, code: 'custom' },
      ]);
    }

    // Mark original as reversed
    await this.db.query(
      `UPDATE journal_entries SET status = 'reversed', reversed_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [id],
    );

    // Create reversal entry with swapped debits/credits
    const reversalLines = original.lines.map((line) => ({
      accountId: line.accountId,
      debitAmount: parseFloat(line.creditAmount),
      creditAmount: parseFloat(line.debitAmount),
      description: `Reversal: ${line.description ?? ''}`.trim(),
    }));

    // Insert reversal header
    const reversalRows = await this.db.query<JournalEntry>(
      `INSERT INTO journal_entries (reference_type, reference_id, description, status, posted_at, reversal_of_id, created_by)
       VALUES ($1, $2, $3, 'posted', NOW(), $4, $5)
       RETURNING ${JOURNAL_ENTRY_COLUMNS}`,
      [
        original.referenceType,
        original.referenceId,
        `Reversal of: ${original.description}`,
        id,
        reversedBy,
      ],
    );

    const reversalEntry = reversalRows[0];

    // Insert reversal lines
    const lines: JournalEntryLine[] = [];
    for (const line of reversalLines) {
      const lineRows = await this.db.query<JournalEntryLine>(
        `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount, description)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING ${JOURNAL_ENTRY_LINE_COLUMNS}`,
        [reversalEntry.id, line.accountId, line.debitAmount, line.creditAmount, line.description],
      );
      lines.push(lineRows[0]);
    }

    return { ...reversalEntry, lines };
  }

  // ─── Balances & Reporting ────────────────────────────────────────────────────

  async getAccountBalance(accountId: string): Promise<AccountBalance> {
    const accountRows = await this.db.query<GLAccount>(
      `SELECT ${GL_ACCOUNT_COLUMNS} FROM gl_accounts WHERE id = $1`,
      [accountId],
    );

    if (accountRows.length === 0) {
      throw new NotFoundError('GL Account', accountId);
    }

    const account = accountRows[0];

    const balanceRows = await this.db.query<{ totalDebits: string; totalCredits: string }>(
      `SELECT
         COALESCE(SUM(jel.debit_amount), 0)  AS "totalDebits",
         COALESCE(SUM(jel.credit_amount), 0) AS "totalCredits"
       FROM journal_entry_lines jel
       JOIN journal_entries je ON je.id = jel.journal_entry_id
       WHERE jel.account_id = $1
         AND je.status = 'posted'`,
      [accountId],
    );

    const totalDebits = parseFloat(balanceRows[0].totalDebits);
    const totalCredits = parseFloat(balanceRows[0].totalCredits);

    // For asset/expense accounts: balance = debits - credits
    // For liability/revenue accounts: balance = credits - debits
    const isDebitNormal = account.category === 'asset' || account.category === 'expense';
    const balance = isDebitNormal
      ? totalDebits - totalCredits
      : totalCredits - totalDebits;

    return {
      accountId: account.id,
      accountCode: account.code,
      accountName: account.name,
      category: account.category,
      totalDebits: totalDebits.toFixed(2),
      totalCredits: totalCredits.toFixed(2),
      balance: balance.toFixed(2),
    };
  }

  async getTrialBalance(): Promise<TrialBalance> {
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

    let grandTotalDebits = 0;
    let grandTotalCredits = 0;

    const accounts: AccountBalance[] = rows.map((row) => {
      const totalDebits = parseFloat(row.totalDebits);
      const totalCredits = parseFloat(row.totalCredits);
      grandTotalDebits += totalDebits;
      grandTotalCredits += totalCredits;

      const isDebitNormal = row.category === 'asset' || row.category === 'expense';
      const balance = isDebitNormal
        ? totalDebits - totalCredits
        : totalCredits - totalDebits;

      return {
        accountId: row.accountId,
        accountCode: row.accountCode,
        accountName: row.accountName,
        category: row.category as AccountBalance['category'],
        totalDebits: totalDebits.toFixed(2),
        totalCredits: totalCredits.toFixed(2),
        balance: balance.toFixed(2),
      };
    });

    return {
      accounts,
      totalDebits: grandTotalDebits.toFixed(2),
      totalCredits: grandTotalCredits.toFixed(2),
      isBalanced: Math.abs(grandTotalDebits - grandTotalCredits) < 0.01,
      asOf: new Date(),
    };
  }
}
