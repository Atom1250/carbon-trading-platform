import { BalanceService } from './BalanceService';

jest.mock('@libs/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

const ACCOUNT_ID = 'a10e8400-e29b-41d4-a716-446655440001';

const CASH_ACCOUNT = {
  id: ACCOUNT_ID,
  code: '1000',
  name: 'Cash',
  category: 'asset',
  isActive: true,
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

function makeMockCache() {
  const store = new Map<string, string>();
  return {
    get: jest.fn().mockImplementation((key: string) => Promise.resolve(store.get(key) ?? null)),
    set: jest.fn().mockImplementation((key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve();
    }),
    del: jest.fn().mockImplementation((key: string) => {
      store.delete(key);
      return Promise.resolve();
    }),
    delByPattern: jest.fn().mockResolvedValue(undefined),
    _store: store,
  };
}

// ─── getAccountBalance ──────────────────────────────────────────────────────

describe('BalanceService', () => {
  describe('getAccountBalance', () => {
    it('should compute balance for asset account (debit normal)', async () => {
      const db = makeMockDb([
        [CASH_ACCOUNT],
        [{ totalDebits: '500.00', totalCredits: '200.00' }],
      ]);
      const service = new BalanceService(db as never);

      const result = await service.getAccountBalance(ACCOUNT_ID);

      expect(result.balance).toBe('300.00');
      expect(result.totalDebits).toBe('500.00');
      expect(result.totalCredits).toBe('200.00');
    });

    it('should compute balance for liability account (credit normal)', async () => {
      const liabilityAccount = { ...CASH_ACCOUNT, category: 'liability', code: '2000', name: 'Payable' };
      const db = makeMockDb([
        [liabilityAccount],
        [{ totalDebits: '100.00', totalCredits: '400.00' }],
      ]);
      const service = new BalanceService(db as never);

      const result = await service.getAccountBalance(ACCOUNT_ID);

      expect(result.balance).toBe('300.00');
    });

    it('should throw NotFoundError for unknown account', async () => {
      const db = makeMockDb([[]]);
      const service = new BalanceService(db as never);

      await expect(service.getAccountBalance('nonexistent')).rejects.toThrow('GL Account');
    });

    it('should cache balance result', async () => {
      const db = makeMockDb([
        [CASH_ACCOUNT],
        [{ totalDebits: '500.00', totalCredits: '200.00' }],
      ]);
      const cache = makeMockCache();
      const service = new BalanceService(db as never, cache);

      await service.getAccountBalance(ACCOUNT_ID);

      expect(cache.set).toHaveBeenCalledWith(
        expect.stringContaining(ACCOUNT_ID),
        expect.any(String),
        300,
      );
    });

    it('should return cached balance on second call', async () => {
      const db = makeMockDb([
        [CASH_ACCOUNT],
        [{ totalDebits: '500.00', totalCredits: '200.00' }],
      ]);
      const cache = makeMockCache();
      const service = new BalanceService(db as never, cache);

      // First call - computes and caches
      await service.getAccountBalance(ACCOUNT_ID);
      // Second call - returns from cache
      const result = await service.getAccountBalance(ACCOUNT_ID);

      expect(result.balance).toBe('300.00');
      // DB should only be called twice (first call), not four times
      expect(db.query).toHaveBeenCalledTimes(2);
    });

    it('should work without cache', async () => {
      const db = makeMockDb([
        [CASH_ACCOUNT],
        [{ totalDebits: '0', totalCredits: '0' }],
      ]);
      const service = new BalanceService(db as never);

      const result = await service.getAccountBalance(ACCOUNT_ID);

      expect(result.balance).toBe('0.00');
    });
  });

  // ─── getBalanceSummary ──────────────────────────────────────────────────────

  describe('getBalanceSummary', () => {
    it('should aggregate balances by category', async () => {
      const db = makeMockDb([
        [
          { category: 'asset', totalDebits: '1000.00', totalCredits: '200.00', accountCount: '3' },
          { category: 'liability', totalDebits: '50.00', totalCredits: '500.00', accountCount: '2' },
          { category: 'revenue', totalDebits: '0.00', totalCredits: '300.00', accountCount: '1' },
          { category: 'expense', totalDebits: '100.00', totalCredits: '0.00', accountCount: '1' },
        ],
      ]);
      const service = new BalanceService(db as never);

      const result = await service.getBalanceSummary();

      expect(result.totalAssets).toBe('800.00');
      expect(result.totalLiabilities).toBe('450.00');
      expect(result.totalRevenue).toBe('300.00');
      expect(result.totalExpenses).toBe('100.00');
      expect(result.accountCount).toBe(7);
    });

    it('should compute net position', async () => {
      const db = makeMockDb([
        [
          { category: 'asset', totalDebits: '1000.00', totalCredits: '0.00', accountCount: '1' },
          { category: 'liability', totalDebits: '0.00', totalCredits: '400.00', accountCount: '1' },
          { category: 'revenue', totalDebits: '0.00', totalCredits: '500.00', accountCount: '1' },
          { category: 'expense', totalDebits: '200.00', totalCredits: '0.00', accountCount: '1' },
        ],
      ]);
      const service = new BalanceService(db as never);

      const result = await service.getBalanceSummary();

      // netPosition = assets(1000) - liabilities(400) + revenue(500) - expenses(200) = 900
      expect(result.netPosition).toBe('900.00');
    });

    it('should cache summary result', async () => {
      const db = makeMockDb([[]]);
      const cache = makeMockCache();
      const service = new BalanceService(db as never, cache);

      await service.getBalanceSummary();

      expect(cache.set).toHaveBeenCalledWith(
        expect.stringContaining('summary'),
        expect.any(String),
        600,
      );
    });

    it('should return cached summary on second call', async () => {
      const db = makeMockDb([
        [
          { category: 'asset', totalDebits: '1000.00', totalCredits: '0.00', accountCount: '1' },
        ],
      ]);
      const cache = makeMockCache();
      const service = new BalanceService(db as never, cache);

      await service.getBalanceSummary();
      const result = await service.getBalanceSummary();

      expect(result.totalAssets).toBe('1000.00');
      expect(db.query).toHaveBeenCalledTimes(1);
    });

    it('should return zeros with no data', async () => {
      const db = makeMockDb([[]]);
      const service = new BalanceService(db as never);

      const result = await service.getBalanceSummary();

      expect(result.totalAssets).toBe('0.00');
      expect(result.totalLiabilities).toBe('0.00');
      expect(result.netPosition).toBe('0.00');
      expect(result.accountCount).toBe(0);
    });
  });

  // ─── getBalancesByCategory ────────────────────────────────────────────────

  describe('getBalancesByCategory', () => {
    it('should return balances for asset category', async () => {
      const db = makeMockDb([
        [
          { accountId: 'a1', accountCode: '1000', accountName: 'Cash', category: 'asset', totalDebits: '500.00', totalCredits: '200.00' },
          { accountId: 'a2', accountCode: '1100', accountName: 'Receivable', category: 'asset', totalDebits: '300.00', totalCredits: '100.00' },
        ],
      ]);
      const service = new BalanceService(db as never);

      const result = await service.getBalancesByCategory('asset');

      expect(result).toHaveLength(2);
      expect(result[0].balance).toBe('300.00');
      expect(result[1].balance).toBe('200.00');
    });

    it('should cache category balances', async () => {
      const db = makeMockDb([[]]);
      const cache = makeMockCache();
      const service = new BalanceService(db as never, cache);

      await service.getBalancesByCategory('asset');

      expect(cache.set).toHaveBeenCalledWith(
        expect.stringContaining('category:asset'),
        expect.any(String),
        300,
      );
    });

    it('should pass category filter to query', async () => {
      const db = makeMockDb([[]]);
      const service = new BalanceService(db as never);

      await service.getBalancesByCategory('revenue');

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('ga.category = $1'),
        ['revenue'],
      );
    });
  });

  // ─── invalidateCache ──────────────────────────────────────────────────────

  describe('invalidateCache', () => {
    it('should invalidate specific account cache', async () => {
      const cache = makeMockCache();
      const db = makeMockDb();
      const service = new BalanceService(db as never, cache);

      await service.invalidateCache(ACCOUNT_ID);

      expect(cache.del).toHaveBeenCalledWith(expect.stringContaining(ACCOUNT_ID));
    });

    it('should always invalidate summary and category caches', async () => {
      const cache = makeMockCache();
      const db = makeMockDb();
      const service = new BalanceService(db as never, cache);

      await service.invalidateCache(ACCOUNT_ID);

      expect(cache.del).toHaveBeenCalledWith(expect.stringContaining('summary'));
      expect(cache.delByPattern).toHaveBeenCalledWith(expect.stringContaining('category:*'));
    });

    it('should invalidate summary without specific account', async () => {
      const cache = makeMockCache();
      const db = makeMockDb();
      const service = new BalanceService(db as never, cache);

      await service.invalidateCache();

      expect(cache.del).toHaveBeenCalledWith(expect.stringContaining('summary'));
      // Should not try to delete a specific account key
      expect(cache.del).not.toHaveBeenCalledWith(expect.stringContaining('account:'));
    });

    it('should be a no-op without cache', async () => {
      const db = makeMockDb();
      const service = new BalanceService(db as never);

      // Should not throw
      await service.invalidateCache(ACCOUNT_ID);
    });
  });
});
