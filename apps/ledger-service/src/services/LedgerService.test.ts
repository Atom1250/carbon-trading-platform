import { LedgerService } from './LedgerService';

jest.mock('@libs/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

const ACCOUNT_ID = 'a10e8400-e29b-41d4-a716-446655440001';
const ACCOUNT_ID_2 = 'a10e8400-e29b-41d4-a716-446655440002';
const ENTRY_ID = 'e10e8400-e29b-41d4-a716-446655440001';
const USER_ID = 'u10e8400-e29b-41d4-a716-446655440001';
const REF_ID = 'r10e8400-e29b-41d4-a716-446655440001';

const CASH_ACCOUNT = {
  id: ACCOUNT_ID,
  code: '1000',
  name: 'Cash',
  category: 'asset',
  description: 'Cash and cash equivalents',
  isActive: true,
  parentAccountId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const REVENUE_ACCOUNT = {
  id: ACCOUNT_ID_2,
  code: '3000',
  name: 'Trading Revenue',
  category: 'revenue',
  description: 'Revenue from trading commissions',
  isActive: true,
  parentAccountId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const JOURNAL_ENTRY = {
  id: ENTRY_ID,
  referenceType: 'trade',
  referenceId: REF_ID,
  description: 'Trade settlement fee',
  status: 'posted',
  postedAt: new Date(),
  reversedAt: null,
  reversalOfId: null,
  createdBy: USER_ID,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const ENTRY_LINE_DEBIT = {
  id: 'l10e8400-e29b-41d4-a716-446655440001',
  journalEntryId: ENTRY_ID,
  accountId: ACCOUNT_ID,
  debitAmount: '100.00',
  creditAmount: '0.00',
  description: 'Cash debit',
  createdAt: new Date(),
};

const ENTRY_LINE_CREDIT = {
  id: 'l10e8400-e29b-41d4-a716-446655440002',
  journalEntryId: ENTRY_ID,
  accountId: ACCOUNT_ID_2,
  debitAmount: '0.00',
  creditAmount: '100.00',
  description: 'Revenue credit',
  createdAt: new Date(),
};

function makeMockDb(queryResults: unknown[][] = []) {
  let callIndex = 0;
  return {
    query: jest.fn().mockImplementation(() =>
      Promise.resolve(queryResults[callIndex++] ?? []),
    ),
    transaction: jest.fn(),
    healthCheck: jest.fn(),
    end: jest.fn(),
  };
}

// ─── Chart of Accounts ───────────────────────────────────────────────────────

describe('LedgerService', () => {
  describe('createAccount', () => {
    it('should create a GL account', async () => {
      const db = makeMockDb([[CASH_ACCOUNT]]);
      const service = new LedgerService(db as never);

      const result = await service.createAccount({
        code: '1000',
        name: 'Cash',
        category: 'asset',
        description: 'Cash and cash equivalents',
      });

      expect(result.code).toBe('1000');
      expect(result.name).toBe('Cash');
      expect(result.category).toBe('asset');
    });

    it('should create account with parent', async () => {
      const db = makeMockDb([
        [{ id: ACCOUNT_ID }],  // parent exists
        [{ ...CASH_ACCOUNT, parentAccountId: ACCOUNT_ID }],
      ]);
      const service = new LedgerService(db as never);

      const result = await service.createAccount({
        code: '1010',
        name: 'Petty Cash',
        category: 'asset',
        parentAccountId: ACCOUNT_ID,
      });

      expect(result.parentAccountId).toBe(ACCOUNT_ID);
    });

    it('should throw NotFoundError for invalid parent', async () => {
      const db = makeMockDb([[]]);  // parent not found
      const service = new LedgerService(db as never);

      await expect(
        service.createAccount({
          code: '1010',
          name: 'Petty Cash',
          category: 'asset',
          parentAccountId: 'nonexistent-id',
        }),
      ).rejects.toThrow('GL Account');
    });

    it('should pass correct params', async () => {
      const db = makeMockDb([[CASH_ACCOUNT]]);
      const service = new LedgerService(db as never);

      await service.createAccount({
        code: '1000',
        name: 'Cash',
        category: 'asset',
        description: 'Cash and cash equivalents',
      });

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO gl_accounts'),
        ['1000', 'Cash', 'asset', 'Cash and cash equivalents', null],
      );
    });
  });

  describe('getAccountById', () => {
    it('should return account by id', async () => {
      const db = makeMockDb([[CASH_ACCOUNT]]);
      const service = new LedgerService(db as never);

      const result = await service.getAccountById(ACCOUNT_ID);

      expect(result.id).toBe(ACCOUNT_ID);
      expect(result.code).toBe('1000');
    });

    it('should throw NotFoundError when not found', async () => {
      const db = makeMockDb([[]]);
      const service = new LedgerService(db as never);

      await expect(service.getAccountById('nonexistent')).rejects.toThrow('GL Account');
    });
  });

  describe('getAccountByCode', () => {
    it('should return account by code', async () => {
      const db = makeMockDb([[CASH_ACCOUNT]]);
      const service = new LedgerService(db as never);

      const result = await service.getAccountByCode('1000');

      expect(result.code).toBe('1000');
    });

    it('should throw NotFoundError for unknown code', async () => {
      const db = makeMockDb([[]]);
      const service = new LedgerService(db as never);

      await expect(service.getAccountByCode('9999')).rejects.toThrow('GL Account');
    });
  });

  describe('listAccounts', () => {
    it('should return paginated accounts', async () => {
      const db = makeMockDb([
        [{ count: '2' }],
        [CASH_ACCOUNT, REVENUE_ACCOUNT],
      ]);
      const service = new LedgerService(db as never);

      const result = await service.listAccounts({ limit: 20, offset: 0 });

      expect(result.total).toBe(2);
      expect(result.accounts).toHaveLength(2);
    });

    it('should filter by category', async () => {
      const db = makeMockDb([
        [{ count: '1' }],
        [CASH_ACCOUNT],
      ]);
      const service = new LedgerService(db as never);

      await service.listAccounts({ category: 'asset', limit: 20, offset: 0 });

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('category = $1'),
        ['asset'],
      );
    });

    it('should filter by isActive', async () => {
      const db = makeMockDb([
        [{ count: '1' }],
        [CASH_ACCOUNT],
      ]);
      const service = new LedgerService(db as never);

      await service.listAccounts({ isActive: true, limit: 20, offset: 0 });

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('is_active = $1'),
        [true],
      );
    });
  });

  // ─── Journal Entries ─────────────────────────────────────────────────────────

  describe('createJournalEntry', () => {
    it('should create a balanced journal entry', async () => {
      const db = makeMockDb([
        [{ id: ACCOUNT_ID }, { id: ACCOUNT_ID_2 }],  // account validation
        [JOURNAL_ENTRY],                               // insert header
        [ENTRY_LINE_DEBIT],                            // insert line 1
        [ENTRY_LINE_CREDIT],                           // insert line 2
      ]);
      const service = new LedgerService(db as never);

      const result = await service.createJournalEntry({
        referenceType: 'trade',
        referenceId: REF_ID,
        description: 'Trade settlement fee',
        createdBy: USER_ID,
        lines: [
          { accountId: ACCOUNT_ID, debitAmount: 100, creditAmount: 0 },
          { accountId: ACCOUNT_ID_2, debitAmount: 0, creditAmount: 100 },
        ],
      });

      expect(result.id).toBe(ENTRY_ID);
      expect(result.lines).toHaveLength(2);
      expect(result.status).toBe('posted');
    });

    it('should reject entry with fewer than 2 lines', async () => {
      const db = makeMockDb();
      const service = new LedgerService(db as never);

      await expect(
        service.createJournalEntry({
          referenceType: 'trade',
          referenceId: REF_ID,
          description: 'Bad entry',
          createdBy: USER_ID,
          lines: [
            { accountId: ACCOUNT_ID, debitAmount: 100, creditAmount: 0 },
          ],
        }),
      ).rejects.toThrow('at least 2 lines');
    });

    it('should reject entry where debits != credits', async () => {
      const db = makeMockDb();
      const service = new LedgerService(db as never);

      await expect(
        service.createJournalEntry({
          referenceType: 'trade',
          referenceId: REF_ID,
          description: 'Unbalanced entry',
          createdBy: USER_ID,
          lines: [
            { accountId: ACCOUNT_ID, debitAmount: 100, creditAmount: 0 },
            { accountId: ACCOUNT_ID_2, debitAmount: 0, creditAmount: 50 },
          ],
        }),
      ).rejects.toThrow('not balanced');
    });

    it('should reject line with both debit and credit', async () => {
      const db = makeMockDb();
      const service = new LedgerService(db as never);

      await expect(
        service.createJournalEntry({
          referenceType: 'trade',
          referenceId: REF_ID,
          description: 'Bad line',
          createdBy: USER_ID,
          lines: [
            { accountId: ACCOUNT_ID, debitAmount: 100, creditAmount: 100 },
            { accountId: ACCOUNT_ID_2, debitAmount: 0, creditAmount: 0 },
          ],
        }),
      ).rejects.toThrow('both debit and credit');
    });

    it('should reject line with zero debit and zero credit', async () => {
      const db = makeMockDb();
      const service = new LedgerService(db as never);

      await expect(
        service.createJournalEntry({
          referenceType: 'trade',
          referenceId: REF_ID,
          description: 'Zero line',
          createdBy: USER_ID,
          lines: [
            { accountId: ACCOUNT_ID, debitAmount: 0, creditAmount: 0 },
            { accountId: ACCOUNT_ID_2, debitAmount: 100, creditAmount: 0 },
          ],
        }),
      ).rejects.toThrow('either a debit or credit');
    });

    it('should reject entry with unknown account IDs', async () => {
      const db = makeMockDb([
        [{ id: ACCOUNT_ID }],  // only one found out of two
      ]);
      const service = new LedgerService(db as never);

      await expect(
        service.createJournalEntry({
          referenceType: 'trade',
          referenceId: REF_ID,
          description: 'Unknown account',
          createdBy: USER_ID,
          lines: [
            { accountId: ACCOUNT_ID, debitAmount: 100, creditAmount: 0 },
            { accountId: 'nonexistent-id', debitAmount: 0, creditAmount: 100 },
          ],
        }),
      ).rejects.toThrow('GL Account');
    });

    it('should set status to posted with postedAt', async () => {
      const db = makeMockDb([
        [{ id: ACCOUNT_ID }, { id: ACCOUNT_ID_2 }],
        [JOURNAL_ENTRY],
        [ENTRY_LINE_DEBIT],
        [ENTRY_LINE_CREDIT],
      ]);
      const service = new LedgerService(db as never);

      await service.createJournalEntry({
        referenceType: 'trade',
        referenceId: REF_ID,
        description: 'Test',
        createdBy: USER_ID,
        lines: [
          { accountId: ACCOUNT_ID, debitAmount: 100, creditAmount: 0 },
          { accountId: ACCOUNT_ID_2, debitAmount: 0, creditAmount: 100 },
        ],
      });

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("'posted', NOW()"),
        expect.any(Array),
      );
    });
  });

  describe('getJournalEntryById', () => {
    it('should return entry with lines', async () => {
      const db = makeMockDb([
        [JOURNAL_ENTRY],
        [ENTRY_LINE_DEBIT, ENTRY_LINE_CREDIT],
      ]);
      const service = new LedgerService(db as never);

      const result = await service.getJournalEntryById(ENTRY_ID);

      expect(result.id).toBe(ENTRY_ID);
      expect(result.lines).toHaveLength(2);
    });

    it('should throw NotFoundError when not found', async () => {
      const db = makeMockDb([[]]);
      const service = new LedgerService(db as never);

      await expect(service.getJournalEntryById('nonexistent')).rejects.toThrow('Journal Entry');
    });

    it('should query with entry id', async () => {
      const db = makeMockDb([
        [JOURNAL_ENTRY],
        [ENTRY_LINE_DEBIT],
      ]);
      const service = new LedgerService(db as never);

      await service.getJournalEntryById(ENTRY_ID);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('journal_entries'),
        [ENTRY_ID],
      );
    });
  });

  describe('listJournalEntries', () => {
    it('should return paginated entries with lines', async () => {
      const db = makeMockDb([
        [{ count: '1' }],
        [JOURNAL_ENTRY],
        [ENTRY_LINE_DEBIT, ENTRY_LINE_CREDIT],
      ]);
      const service = new LedgerService(db as never);

      const result = await service.listJournalEntries({ limit: 20, offset: 0 });

      expect(result.total).toBe(1);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].lines).toHaveLength(2);
    });

    it('should filter by referenceType', async () => {
      const db = makeMockDb([
        [{ count: '0' }],
      ]);
      const service = new LedgerService(db as never);

      await service.listJournalEntries({ referenceType: 'trade', limit: 20, offset: 0 });

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('je.reference_type = $1'),
        ['trade'],
      );
    });

    it('should filter by status', async () => {
      const db = makeMockDb([
        [{ count: '0' }],
      ]);
      const service = new LedgerService(db as never);

      await service.listJournalEntries({ status: 'posted', limit: 20, offset: 0 });

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('je.status = $1'),
        ['posted'],
      );
    });

    it('should filter by date range', async () => {
      const db = makeMockDb([
        [{ count: '0' }],
      ]);
      const service = new LedgerService(db as never);

      await service.listJournalEntries({
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        limit: 20,
        offset: 0,
      });

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('je.created_at >= $1'),
        expect.arrayContaining(['2025-01-01']),
      );
    });
  });

  describe('reverseJournalEntry', () => {
    it('should create reversal with swapped debits/credits', async () => {
      const reversalEntry = { ...JOURNAL_ENTRY, id: 'rev-id', reversalOfId: ENTRY_ID };
      const db = makeMockDb([
        [JOURNAL_ENTRY],                               // get original header
        [ENTRY_LINE_DEBIT, ENTRY_LINE_CREDIT],         // get original lines
        [],                                             // update original status
        [reversalEntry],                                // insert reversal header
        [{ ...ENTRY_LINE_CREDIT, journalEntryId: 'rev-id' }],  // insert reversal line 1
        [{ ...ENTRY_LINE_DEBIT, journalEntryId: 'rev-id' }],   // insert reversal line 2
      ]);
      const service = new LedgerService(db as never);

      const result = await service.reverseJournalEntry(ENTRY_ID, USER_ID);

      expect(result.reversalOfId).toBe(ENTRY_ID);
    });

    it('should reject reversal of already reversed entry', async () => {
      const reversedEntry = { ...JOURNAL_ENTRY, status: 'reversed' };
      const db = makeMockDb([
        [reversedEntry],
        [],
      ]);
      const service = new LedgerService(db as never);

      await expect(
        service.reverseJournalEntry(ENTRY_ID, USER_ID),
      ).rejects.toThrow('already been reversed');
    });

    it('should reject reversal of pending entry', async () => {
      const pendingEntry = { ...JOURNAL_ENTRY, status: 'pending' };
      const db = makeMockDb([
        [pendingEntry],
        [],
      ]);
      const service = new LedgerService(db as never);

      await expect(
        service.reverseJournalEntry(ENTRY_ID, USER_ID),
      ).rejects.toThrow('Only posted entries');
    });

    it('should mark original as reversed', async () => {
      const reversalEntry = { ...JOURNAL_ENTRY, id: 'rev-id', reversalOfId: ENTRY_ID };
      const db = makeMockDb([
        [JOURNAL_ENTRY],
        [ENTRY_LINE_DEBIT, ENTRY_LINE_CREDIT],
        [],
        [reversalEntry],
        [ENTRY_LINE_CREDIT],
        [ENTRY_LINE_DEBIT],
      ]);
      const service = new LedgerService(db as never);

      await service.reverseJournalEntry(ENTRY_ID, USER_ID);

      // Third call should be the UPDATE
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'reversed'"),
        [ENTRY_ID],
      );
    });
  });

  // ─── Balances & Reporting ────────────────────────────────────────────────────

  describe('getAccountBalance', () => {
    it('should calculate balance for asset account (debit normal)', async () => {
      const db = makeMockDb([
        [CASH_ACCOUNT],
        [{ totalDebits: '500.00', totalCredits: '200.00' }],
      ]);
      const service = new LedgerService(db as never);

      const result = await service.getAccountBalance(ACCOUNT_ID);

      expect(result.balance).toBe('300.00');
      expect(result.totalDebits).toBe('500.00');
      expect(result.totalCredits).toBe('200.00');
    });

    it('should calculate balance for revenue account (credit normal)', async () => {
      const db = makeMockDb([
        [REVENUE_ACCOUNT],
        [{ totalDebits: '50.00', totalCredits: '300.00' }],
      ]);
      const service = new LedgerService(db as never);

      const result = await service.getAccountBalance(ACCOUNT_ID_2);

      expect(result.balance).toBe('250.00');
    });

    it('should return zero balance when no entries', async () => {
      const db = makeMockDb([
        [CASH_ACCOUNT],
        [{ totalDebits: '0', totalCredits: '0' }],
      ]);
      const service = new LedgerService(db as never);

      const result = await service.getAccountBalance(ACCOUNT_ID);

      expect(result.balance).toBe('0.00');
    });

    it('should throw NotFoundError for unknown account', async () => {
      const db = makeMockDb([[]]);
      const service = new LedgerService(db as never);

      await expect(service.getAccountBalance('nonexistent')).rejects.toThrow('GL Account');
    });

    it('should only sum posted entries', async () => {
      const db = makeMockDb([
        [CASH_ACCOUNT],
        [{ totalDebits: '500.00', totalCredits: '200.00' }],
      ]);
      const service = new LedgerService(db as never);

      await service.getAccountBalance(ACCOUNT_ID);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("je.status = 'posted'"),
        [ACCOUNT_ID],
      );
    });
  });

  describe('getTrialBalance', () => {
    it('should return balanced trial balance', async () => {
      const db = makeMockDb([
        [
          { accountId: ACCOUNT_ID, accountCode: '1000', accountName: 'Cash', category: 'asset', totalDebits: '1000.00', totalCredits: '500.00' },
          { accountId: ACCOUNT_ID_2, accountCode: '3000', accountName: 'Trading Revenue', category: 'revenue', totalDebits: '0.00', totalCredits: '500.00' },
        ],
      ]);
      const service = new LedgerService(db as never);

      const result = await service.getTrialBalance();

      expect(result.accounts).toHaveLength(2);
      expect(result.totalDebits).toBe('1000.00');
      expect(result.totalCredits).toBe('1000.00');
      expect(result.isBalanced).toBe(true);
    });

    it('should detect unbalanced trial balance', async () => {
      const db = makeMockDb([
        [
          { accountId: ACCOUNT_ID, accountCode: '1000', accountName: 'Cash', category: 'asset', totalDebits: '1000.00', totalCredits: '0.00' },
          { accountId: ACCOUNT_ID_2, accountCode: '3000', accountName: 'Revenue', category: 'revenue', totalDebits: '0.00', totalCredits: '500.00' },
        ],
      ]);
      const service = new LedgerService(db as never);

      const result = await service.getTrialBalance();

      expect(result.isBalanced).toBe(false);
    });

    it('should return empty trial balance with no accounts', async () => {
      const db = makeMockDb([[]]);
      const service = new LedgerService(db as never);

      const result = await service.getTrialBalance();

      expect(result.accounts).toHaveLength(0);
      expect(result.totalDebits).toBe('0.00');
      expect(result.totalCredits).toBe('0.00');
      expect(result.isBalanced).toBe(true);
    });

    it('should calculate normal balances by category', async () => {
      const db = makeMockDb([
        [
          { accountId: 'a1', accountCode: '1000', accountName: 'Cash', category: 'asset', totalDebits: '500.00', totalCredits: '200.00' },
          { accountId: 'a2', accountCode: '2000', accountName: 'Payable', category: 'liability', totalDebits: '100.00', totalCredits: '400.00' },
          { accountId: 'a3', accountCode: '3000', accountName: 'Revenue', category: 'revenue', totalDebits: '0.00', totalCredits: '300.00' },
          { accountId: 'a4', accountCode: '4000', accountName: 'Expenses', category: 'expense', totalDebits: '200.00', totalCredits: '0.00' },
        ],
      ]);
      const service = new LedgerService(db as never);

      const result = await service.getTrialBalance();

      // Asset: debit normal → 500 - 200 = 300
      expect(result.accounts[0].balance).toBe('300.00');
      // Liability: credit normal → 400 - 100 = 300
      expect(result.accounts[1].balance).toBe('300.00');
      // Revenue: credit normal → 300 - 0 = 300
      expect(result.accounts[2].balance).toBe('300.00');
      // Expense: debit normal → 200 - 0 = 200
      expect(result.accounts[3].balance).toBe('200.00');
    });
  });
});
