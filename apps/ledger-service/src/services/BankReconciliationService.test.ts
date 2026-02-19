import { BankReconciliationService } from './BankReconciliationService';
import { BankStatementParser } from './BankStatementParser';

jest.mock('@libs/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

const INSTITUTION_ID = 'a10e8400-e29b-41d4-a716-446655440001';
const USER_ID = 'b10e8400-e29b-41d4-a716-446655440002';
const STATEMENT_ID = 'c10e8400-e29b-41d4-a716-446655440003';
const ENTRY_ID = 'd10e8400-e29b-41d4-a716-446655440004';
const RUN_ID = 'e10e8400-e29b-41d4-a716-446655440005';
const DEPOSIT_ID = 'f10e8400-e29b-41d4-a716-446655440006';

const MOCK_STATEMENT = {
  id: STATEMENT_ID,
  institutionId: INSTITUTION_ID,
  bankName: 'Test Bank',
  accountNumber: '****1234',
  statementDate: new Date('2025-01-31'),
  openingBalance: '10000.00',
  closingBalance: '15000.00',
  entryCount: 2,
  importedBy: USER_ID,
  fileName: 'jan-2025.csv',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const MOCK_ENTRY = {
  id: ENTRY_ID,
  statementId: STATEMENT_ID,
  transactionDate: new Date('2025-01-15'),
  description: 'Wire deposit',
  reference: 'WIRE-001',
  debitAmount: '0.00',
  creditAmount: '5000.00',
  balance: '15000.00',
  matchStatus: 'unmatched',
  matchedDepositId: null,
  matchedWithdrawalId: null,
  matchConfidence: null,
  disputeReason: null,
  resolvedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const MOCK_RUN = {
  id: RUN_ID,
  institutionId: INSTITUTION_ID,
  statementId: STATEMENT_ID,
  status: 'completed',
  totalEntries: 2,
  matchedCount: 2,
  unmatchedCount: 0,
  disputedCount: 0,
  matchRate: '100.00',
  totalVariance: '0.00',
  startedAt: new Date(),
  completedAt: new Date(),
  runBy: USER_ID,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeMockDb() {
  let callIndex = 0;
  const results: unknown[][] = [];
  const mockQuery = jest.fn().mockImplementation(() => {
    const result = results[callIndex] ?? [];
    callIndex++;
    return Promise.resolve(result);
  });
  return { query: mockQuery, results, resetIndex: () => { callIndex = 0; } };
}

describe('BankReconciliationService', () => {
  const parser = new BankStatementParser();

  describe('importStatement', () => {
    it('should create statement and insert entries from CSV', async () => {
      const db = makeMockDb();
      const service = new BankReconciliationService(db as never, parser);
      const csv = [
        'date,description,reference,debit,credit,balance',
        '2025-01-15,Wire deposit,WIRE-001,,5000.00,15000.00',
        '2025-01-16,ACH withdrawal,ACH-002,2500.00,,12500.00',
      ].join('\n');

      // Return statement from INSERT
      db.results[0] = [MOCK_STATEMENT];
      // Return entries from INSERT (one per entry)
      db.results[1] = [MOCK_ENTRY];
      db.results[2] = [{ ...MOCK_ENTRY, id: 'e20e8400-e29b-41d4-a716-446655440007' }];

      const result = await service.importStatement(
        {
          institutionId: INSTITUTION_ID,
          bankName: 'Test Bank',
          accountNumber: '****1234',
          statementDate: '2025-01-31',
          openingBalance: 10000,
          closingBalance: 15000,
          importedBy: USER_ID,
          fileName: 'jan-2025.csv',
        },
        csv,
      );

      expect(result.statement.id).toBe(STATEMENT_ID);
      expect(result.entries).toHaveLength(2);
      expect(db.query).toHaveBeenCalledTimes(3); // 1 statement + 2 entries
    });

    it('should throw for invalid CSV', async () => {
      const db = makeMockDb();
      const service = new BankReconciliationService(db as never, parser);

      await expect(service.importStatement(
        {
          institutionId: INSTITUTION_ID,
          bankName: 'Test Bank',
          accountNumber: '****1234',
          statementDate: '2025-01-31',
          openingBalance: 10000,
          closingBalance: 15000,
          importedBy: USER_ID,
        },
        'invalid csv',
      )).rejects.toThrow();
    });
  });

  describe('runReconciliation', () => {
    it('should match entries against deposits and withdrawals', async () => {
      const db = makeMockDb();
      const service = new BankReconciliationService(db as never, parser);

      // getStatementById
      db.results[0] = [MOCK_STATEMENT];
      // INSERT reconciliation run
      db.results[1] = [{ ...MOCK_RUN, status: 'in_progress' }];
      // SELECT entries
      db.results[2] = [
        MOCK_ENTRY,
        { ...MOCK_ENTRY, id: 'e20e8400-e29b-41d4-a716-446655440007', creditAmount: '0.00', debitAmount: '2500.00', reference: 'ACH-002' },
      ];
      // matchDeposit: ref match query (entry 1 - credit)
      db.results[3] = [{ id: DEPOSIT_ID, amount: '5000.00' }];
      // UPDATE entry as matched
      db.results[4] = [];
      // matchWithdrawal: ref match query (entry 2 - debit)
      db.results[5] = [{ id: 'f20e8400-e29b-41d4-a716-446655440008', net_amount: '2500.00' }];
      // UPDATE entry as matched
      db.results[6] = [];
      // UPDATE run as completed
      db.results[7] = [{ ...MOCK_RUN, matchedCount: 2, unmatchedCount: 0, matchRate: '100.00' }];

      const run = await service.runReconciliation(STATEMENT_ID, USER_ID);

      expect(run.matchedCount).toBe(2);
      expect(run.unmatchedCount).toBe(0);
    });

    it('should handle unmatched entries and track variance', async () => {
      const db = makeMockDb();
      const service = new BankReconciliationService(db as never, parser);

      // getStatementById
      db.results[0] = [MOCK_STATEMENT];
      // INSERT run
      db.results[1] = [{ ...MOCK_RUN, status: 'in_progress' }];
      // SELECT entries - one credit entry
      db.results[2] = [MOCK_ENTRY];
      // matchDeposit: ref match → no result
      db.results[3] = [];
      // matchDeposit: amount match → no result
      db.results[4] = [];
      // UPDATE run as completed with variance
      db.results[5] = [{ ...MOCK_RUN, matchedCount: 0, unmatchedCount: 1, matchRate: '0.00', totalVariance: '5000.00' }];

      const run = await service.runReconciliation(STATEMENT_ID);

      expect(run.unmatchedCount).toBe(1);
      expect(run.totalVariance).toBe('5000.00');
    });

    it('should mark run as failed if an error occurs', async () => {
      const db = makeMockDb();
      const service = new BankReconciliationService(db as never, parser);

      // getStatementById
      db.results[0] = [MOCK_STATEMENT];
      // INSERT run
      db.results[1] = [{ ...MOCK_RUN, status: 'in_progress' }];
      // SELECT entries → throws
      db.query.mockImplementationOnce(() => Promise.resolve(db.results[0]))
        .mockImplementationOnce(() => Promise.resolve(db.results[1]))
        .mockImplementationOnce(() => Promise.reject(new Error('DB error')))
        .mockImplementationOnce(() => Promise.resolve([])); // mark as failed

      await expect(service.runReconciliation(STATEMENT_ID)).rejects.toThrow('DB error');
      // The last call should have been the failure update
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'failed'"),
        expect.any(Array),
      );
    });
  });

  describe('disputeEntry', () => {
    it('should mark entry as disputed', async () => {
      const db = makeMockDb();
      const service = new BankReconciliationService(db as never, parser);

      const matchedEntry = { ...MOCK_ENTRY, matchStatus: 'matched' };
      db.results[0] = [matchedEntry]; // getEntryById
      db.results[1] = [{ ...matchedEntry, matchStatus: 'disputed', disputeReason: 'Wrong amount' }]; // UPDATE

      const result = await service.disputeEntry(ENTRY_ID, 'Wrong amount');

      expect(result.matchStatus).toBe('disputed');
      expect(result.disputeReason).toBe('Wrong amount');
    });

    it('should throw if entry is already disputed', async () => {
      const db = makeMockDb();
      const service = new BankReconciliationService(db as never, parser);

      db.results[0] = [{ ...MOCK_ENTRY, matchStatus: 'disputed' }];

      await expect(service.disputeEntry(ENTRY_ID, 'reason')).rejects.toThrow('Cannot dispute');
    });

    it('should allow disputing unmatched entries', async () => {
      const db = makeMockDb();
      const service = new BankReconciliationService(db as never, parser);

      db.results[0] = [{ ...MOCK_ENTRY, matchStatus: 'unmatched' }];
      db.results[1] = [{ ...MOCK_ENTRY, matchStatus: 'disputed', disputeReason: 'Expected deposit' }];

      const result = await service.disputeEntry(ENTRY_ID, 'Expected deposit');

      expect(result.matchStatus).toBe('disputed');
    });
  });

  describe('resolveEntry', () => {
    it('should mark disputed entry as resolved', async () => {
      const db = makeMockDb();
      const service = new BankReconciliationService(db as never, parser);

      db.results[0] = [{ ...MOCK_ENTRY, matchStatus: 'disputed' }];
      db.results[1] = [{ ...MOCK_ENTRY, matchStatus: 'resolved', resolvedAt: new Date() }];

      const result = await service.resolveEntry(ENTRY_ID);

      expect(result.matchStatus).toBe('resolved');
    });

    it('should throw if entry is not disputed', async () => {
      const db = makeMockDb();
      const service = new BankReconciliationService(db as never, parser);

      db.results[0] = [{ ...MOCK_ENTRY, matchStatus: 'unmatched' }];

      await expect(service.resolveEntry(ENTRY_ID)).rejects.toThrow('Can only resolve disputed');
    });
  });

  describe('getReconciliationReport', () => {
    it('should generate report with summary', async () => {
      const db = makeMockDb();
      const service = new BankReconciliationService(db as never, parser);

      db.results[0] = [MOCK_RUN]; // getRunById
      db.results[1] = [MOCK_STATEMENT]; // getStatementById
      db.results[2] = [ // entries
        { ...MOCK_ENTRY, matchStatus: 'matched', creditAmount: '5000.00', debitAmount: '0.00' },
        { ...MOCK_ENTRY, id: 'e20e8400-e29b-41d4-a716-446655440007', matchStatus: 'unmatched', creditAmount: '0.00', debitAmount: '2000.00' },
      ];

      const report = await service.getReconciliationReport(RUN_ID);

      expect(report.run.id).toBe(RUN_ID);
      expect(report.statement.id).toBe(STATEMENT_ID);
      expect(report.entries).toHaveLength(2);
      expect(report.summary.totalCredits).toBe(5000);
      expect(report.summary.totalDebits).toBe(2000);
      expect(report.summary.matchedCredits).toBe(5000);
      expect(report.summary.unmatchedDebits).toBe(2000);
    });
  });

  describe('getStatementById', () => {
    it('should return statement', async () => {
      const db = makeMockDb();
      const service = new BankReconciliationService(db as never, parser);

      db.results[0] = [MOCK_STATEMENT];

      const result = await service.getStatementById(STATEMENT_ID);

      expect(result.id).toBe(STATEMENT_ID);
    });

    it('should throw NotFoundError for missing statement', async () => {
      const db = makeMockDb();
      const service = new BankReconciliationService(db as never, parser);

      db.results[0] = [];

      await expect(service.getStatementById('missing')).rejects.toThrow('BankStatement');
    });
  });

  describe('listRuns', () => {
    it('should return runs with pagination', async () => {
      const db = makeMockDb();
      const service = new BankReconciliationService(db as never, parser);

      db.results[0] = [{ count: '1' }];
      db.results[1] = [MOCK_RUN];

      const result = await service.listRuns({ limit: 20, offset: 0 });

      expect(result.total).toBe(1);
      expect(result.runs).toHaveLength(1);
    });

    it('should filter by institutionId', async () => {
      const db = makeMockDb();
      const service = new BankReconciliationService(db as never, parser);

      db.results[0] = [{ count: '0' }];

      const result = await service.listRuns({ institutionId: INSTITUTION_ID, limit: 20, offset: 0 });

      expect(result.total).toBe(0);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('institution_id = $1'),
        [INSTITUTION_ID],
      );
    });

    it('should filter by status', async () => {
      const db = makeMockDb();
      const service = new BankReconciliationService(db as never, parser);

      db.results[0] = [{ count: '0' }];

      await service.listRuns({ status: 'completed', limit: 20, offset: 0 });

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('status = $1'),
        ['completed'],
      );
    });
  });

  describe('getEntriesByStatement', () => {
    it('should return all entries for a statement', async () => {
      const db = makeMockDb();
      const service = new BankReconciliationService(db as never, parser);

      db.results[0] = [MOCK_ENTRY];

      const result = await service.getEntriesByStatement(STATEMENT_ID);

      expect(result).toHaveLength(1);
    });

    it('should filter by match status', async () => {
      const db = makeMockDb();
      const service = new BankReconciliationService(db as never, parser);

      db.results[0] = [];

      await service.getEntriesByStatement(STATEMENT_ID, 'unmatched');

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('match_status = $2'),
        [STATEMENT_ID, 'unmatched'],
      );
    });
  });
});
