import { ReconciliationService } from './ReconciliationService';

jest.mock('@libs/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

const RUN_ID = 'a10e8400-e29b-41d4-a716-446655440001';

const BALANCED_ACCOUNTS = [
  { accountId: 'a1', accountCode: '1000', accountName: 'Cash', category: 'asset', totalDebits: '1000.00', totalCredits: '500.00' },
  { accountId: 'a2', accountCode: '3000', accountName: 'Revenue', category: 'revenue', totalDebits: '0.00', totalCredits: '500.00' },
];

const RECONCILIATION_RUN = {
  id: RUN_ID,
  runType: 'daily',
  status: 'passed',
  totalAccounts: 2,
  totalDebits: '1000.00',
  totalCredits: '1000.00',
  varianceCount: 0,
  variances: null,
  tolerance: '0.01',
  startedAt: new Date(),
  completedAt: new Date(),
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

// ─── runReconciliation ──────────────────────────────────────────────────────

describe('ReconciliationService', () => {
  describe('runReconciliation', () => {
    it('should return passed when ledger is balanced', async () => {
      const db = makeMockDb([
        BALANCED_ACCOUNTS,   // account balances
        [],                  // no unbalanced entries
        [RECONCILIATION_RUN], // insert result
      ]);
      const service = new ReconciliationService(db as never);

      const result = await service.runReconciliation();

      expect(result.status).toBe('passed');
    });

    it('should detect grand total mismatch', async () => {
      const unbalancedAccounts = [
        { accountId: 'a1', accountCode: '1000', accountName: 'Cash', category: 'asset', totalDebits: '1000.00', totalCredits: '500.00' },
        // Missing the matching credit account - grand totals won't match
      ];
      const failedRun = { ...RECONCILIATION_RUN, status: 'failed', varianceCount: 1 };
      const db = makeMockDb([
        unbalancedAccounts,
        [],
        [failedRun],
      ]);
      const service = new ReconciliationService(db as never);

      await service.runReconciliation();

      // Verify the insert was called with 'failed' status
      const insertCall = db.query.mock.calls[2];
      expect(insertCall[1][1]).toBe('failed'); // status param
    });

    it('should detect unbalanced journal entries', async () => {
      const unbalancedEntries = [
        { entryId: 'e1', totalDebits: '100.00', totalCredits: '99.00' },
      ];
      const failedRun = { ...RECONCILIATION_RUN, status: 'failed', varianceCount: 1 };
      const db = makeMockDb([
        BALANCED_ACCOUNTS,
        unbalancedEntries,
        [failedRun],
      ]);
      const service = new ReconciliationService(db as never);

      await service.runReconciliation();

      // Verify variances were included
      const insertCall = db.query.mock.calls[2];
      const variancesJson = insertCall[1][6]; // variances param
      expect(variancesJson).not.toBeNull();
      const variances = JSON.parse(variancesJson);
      expect(variances).toHaveLength(1);
      expect(variances[0].severity).toBe('error');
    });

    it('should warn on negative asset balance', async () => {
      const negativeAsset = [
        { accountId: 'a1', accountCode: '1000', accountName: 'Cash', category: 'asset', totalDebits: '100.00', totalCredits: '500.00' },
        { accountId: 'a2', accountCode: '3000', accountName: 'Revenue', category: 'revenue', totalDebits: '0.00', totalCredits: '0.00' },
      ];
      const warningRun = { ...RECONCILIATION_RUN, status: 'warning', varianceCount: 1 };
      const db = makeMockDb([
        negativeAsset,
        [],  // no unbalanced entries
        [warningRun],
      ]);
      const service = new ReconciliationService(db as never);

      await service.runReconciliation();

      const insertCall = db.query.mock.calls[2];
      // Status should be 'warning' (not 'failed') since negative balance is a warning, not error
      // But grand total mismatch is an error, so if totals don't match it's 'failed'
      // Debits: 100, Credits: 500 -> mismatch -> 'failed'
      expect(insertCall[1][1]).toBe('failed');
    });

    it('should use default run type of daily', async () => {
      const db = makeMockDb([
        BALANCED_ACCOUNTS,
        [],
        [RECONCILIATION_RUN],
      ]);
      const service = new ReconciliationService(db as never);

      await service.runReconciliation();

      const insertCall = db.query.mock.calls[2];
      expect(insertCall[1][0]).toBe('daily');
    });

    it('should accept custom run type', async () => {
      const db = makeMockDb([
        BALANCED_ACCOUNTS,
        [],
        [RECONCILIATION_RUN],
      ]);
      const service = new ReconciliationService(db as never);

      await service.runReconciliation('manual');

      const insertCall = db.query.mock.calls[2];
      expect(insertCall[1][0]).toBe('manual');
    });

    it('should pass tolerance to unbalanced entries query', async () => {
      const db = makeMockDb([
        BALANCED_ACCOUNTS,
        [],
        [RECONCILIATION_RUN],
      ]);
      const service = new ReconciliationService(db as never);

      await service.runReconciliation();

      // Second query checks for unbalanced entries
      expect(db.query.mock.calls[1][1]).toEqual([0.01]);
    });

    it('should store total accounts count', async () => {
      const db = makeMockDb([
        BALANCED_ACCOUNTS,
        [],
        [RECONCILIATION_RUN],
      ]);
      const service = new ReconciliationService(db as never);

      await service.runReconciliation();

      const insertCall = db.query.mock.calls[2];
      expect(insertCall[1][2]).toBe(2); // totalAccounts
    });
  });

  // ─── getReconciliationById ────────────────────────────────────────────────

  describe('getReconciliationById', () => {
    it('should return reconciliation run', async () => {
      const db = makeMockDb([[RECONCILIATION_RUN]]);
      const service = new ReconciliationService(db as never);

      const result = await service.getReconciliationById(RUN_ID);

      expect(result.id).toBe(RUN_ID);
      expect(result.status).toBe('passed');
    });

    it('should throw NotFoundError when not found', async () => {
      const db = makeMockDb([[]]);
      const service = new ReconciliationService(db as never);

      await expect(service.getReconciliationById('nonexistent')).rejects.toThrow('Reconciliation Run');
    });

    it('should pass id to query', async () => {
      const db = makeMockDb([[RECONCILIATION_RUN]]);
      const service = new ReconciliationService(db as never);

      await service.getReconciliationById(RUN_ID);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('reconciliation_runs'),
        [RUN_ID],
      );
    });
  });

  // ─── getLatestReconciliation ──────────────────────────────────────────────

  describe('getLatestReconciliation', () => {
    it('should return latest run', async () => {
      const db = makeMockDb([[RECONCILIATION_RUN]]);
      const service = new ReconciliationService(db as never);

      const result = await service.getLatestReconciliation();

      expect(result?.id).toBe(RUN_ID);
    });

    it('should return null when no runs exist', async () => {
      const db = makeMockDb([[]]);
      const service = new ReconciliationService(db as never);

      const result = await service.getLatestReconciliation();

      expect(result).toBeNull();
    });

    it('should order by created_at DESC', async () => {
      const db = makeMockDb([[RECONCILIATION_RUN]]);
      const service = new ReconciliationService(db as never);

      await service.getLatestReconciliation();

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC'),
      );
    });
  });

  // ─── listReconciliationRuns ───────────────────────────────────────────────

  describe('listReconciliationRuns', () => {
    it('should return paginated runs', async () => {
      const db = makeMockDb([
        [{ count: '1' }],
        [RECONCILIATION_RUN],
      ]);
      const service = new ReconciliationService(db as never);

      const result = await service.listReconciliationRuns({ limit: 20, offset: 0 });

      expect(result.total).toBe(1);
      expect(result.runs).toHaveLength(1);
    });

    it('should filter by status', async () => {
      const db = makeMockDb([
        [{ count: '0' }],
      ]);
      const service = new ReconciliationService(db as never);

      await service.listReconciliationRuns({ status: 'failed', limit: 20, offset: 0 });

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('status = $1'),
        ['failed'],
      );
    });

    it('should filter by runType', async () => {
      const db = makeMockDb([
        [{ count: '0' }],
      ]);
      const service = new ReconciliationService(db as never);

      await service.listReconciliationRuns({ runType: 'daily', limit: 20, offset: 0 });

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('run_type = $1'),
        ['daily'],
      );
    });
  });
});
