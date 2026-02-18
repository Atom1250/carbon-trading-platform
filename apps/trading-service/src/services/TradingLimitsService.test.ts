import { TradingLimitsService } from './TradingLimitsService';
import { NotFoundError, ValidationError } from '@libs/errors';

const INST_ID = '770e8400-e29b-41d4-a716-446655440000';
const ASSET_ID = '660e8400-e29b-41d4-a716-446655440000';

const TRADING_LIMITS_ROW = {
  institutionId: INST_ID,
  dailyLimitUsd: '5000000.00',
  singleTradeMinUsd: '1000.00',
  singleTradeMaxUsd: '10000000.00',
  createdAt: new Date('2025-06-01T00:00:00Z'),
  updatedAt: new Date('2025-06-01T00:00:00Z'),
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

describe('TradingLimitsService', () => {
  // ─── getTradingLimits ─────────────────────────────────────────────────────

  describe('getTradingLimits', () => {
    it('should return trading limits for institution', async () => {
      const db = makeMockDb([[TRADING_LIMITS_ROW]]);
      const service = new TradingLimitsService(db as never);

      const result = await service.getTradingLimits(INST_ID);

      expect(result.institutionId).toBe(INST_ID);
      expect(result.dailyLimitUsd).toBe('5000000.00');
      expect(result.singleTradeMinUsd).toBe('1000.00');
      expect(result.singleTradeMaxUsd).toBe('10000000.00');
    });

    it('should throw NotFoundError when limits do not exist', async () => {
      const db = makeMockDb([[]]);
      const service = new TradingLimitsService(db as never);

      await expect(service.getTradingLimits('bad-id')).rejects.toThrow(NotFoundError);
    });

    it('should query trading_limits table with institution id', async () => {
      const db = makeMockDb([[TRADING_LIMITS_ROW]]);
      const service = new TradingLimitsService(db as never);

      await service.getTradingLimits(INST_ID);

      const params = (db.query as jest.Mock).mock.calls[0][1] as unknown[];
      expect(params[0]).toBe(INST_ID);
    });
  });

  // ─── getDailyVolume ───────────────────────────────────────────────────────

  describe('getDailyVolume', () => {
    it('should return sum of daily settled trades', async () => {
      const db = makeMockDb([[{ volume: '125000.50' }]]);
      const service = new TradingLimitsService(db as never);

      const result = await service.getDailyVolume(INST_ID);

      expect(result).toBe(125000.50);
    });

    it('should return 0 when no trades today', async () => {
      const db = makeMockDb([[{ volume: '0' }]]);
      const service = new TradingLimitsService(db as never);

      const result = await service.getDailyVolume(INST_ID);

      expect(result).toBe(0);
    });

    it('should query trades with institution id', async () => {
      const db = makeMockDb([[{ volume: '0' }]]);
      const service = new TradingLimitsService(db as never);

      await service.getDailyVolume(INST_ID);

      const params = (db.query as jest.Mock).mock.calls[0][1] as unknown[];
      expect(params[0]).toBe(INST_ID);
    });
  });

  // ─── getRemainingDailyLimit ───────────────────────────────────────────────

  describe('getRemainingDailyLimit', () => {
    it('should return remaining daily limit', async () => {
      const db = makeMockDb([
        [TRADING_LIMITS_ROW],       // getTradingLimits
        [{ volume: '1000000.00' }], // getDailyVolume
      ]);
      const service = new TradingLimitsService(db as never);

      const result = await service.getRemainingDailyLimit(INST_ID);

      expect(result.limit).toBe(5000000);
      expect(result.used).toBe(1000000);
      expect(result.remaining).toBe(4000000);
    });

    it('should return -1 for unlimited tier', async () => {
      const db = makeMockDb([
        [{ ...TRADING_LIMITS_ROW, dailyLimitUsd: '0.00' }],
      ]);
      const service = new TradingLimitsService(db as never);

      const result = await service.getRemainingDailyLimit(INST_ID);

      expect(result.limit).toBe(-1);
      expect(result.remaining).toBe(-1);
    });

    it('should not return negative remaining', async () => {
      const db = makeMockDb([
        [TRADING_LIMITS_ROW],       // getTradingLimits (5M limit)
        [{ volume: '6000000.00' }], // getDailyVolume (over limit)
      ]);
      const service = new TradingLimitsService(db as never);

      const result = await service.getRemainingDailyLimit(INST_ID);

      expect(result.remaining).toBe(0);
    });
  });

  // ─── validatePreTrade ─────────────────────────────────────────────────────

  describe('validatePreTrade', () => {
    const VALID_TRADE: Parameters<TradingLimitsService['validatePreTrade']>[0] = {
      institutionId: INST_ID,
      assetId: ASSET_ID,
      totalAmount: 2500,
    };

    it('should pass validation for valid trade', async () => {
      const db = makeMockDb([
        [{ status: 'active' }],     // institution check
        [{ status: 'minted' }],     // asset check
        [TRADING_LIMITS_ROW],       // getTradingLimits
        [{ volume: '0' }],          // getDailyVolume
      ]);
      const service = new TradingLimitsService(db as never);

      await expect(service.validatePreTrade(VALID_TRADE)).resolves.toBeUndefined();
    });

    it('should throw NotFoundError for unknown institution', async () => {
      const db = makeMockDb([[]]);
      const service = new TradingLimitsService(db as never);

      await expect(service.validatePreTrade(VALID_TRADE)).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError for inactive institution', async () => {
      const db = makeMockDb([[{ status: 'suspended' }]]);
      const service = new TradingLimitsService(db as never);

      await expect(service.validatePreTrade(VALID_TRADE)).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError for unknown asset', async () => {
      const db = makeMockDb([
        [{ status: 'active' }],
        [],
      ]);
      const service = new TradingLimitsService(db as never);

      await expect(service.validatePreTrade(VALID_TRADE)).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError for non-minted asset', async () => {
      const db = makeMockDb([
        [{ status: 'active' }],
        [{ status: 'pending' }],
      ]);
      const service = new TradingLimitsService(db as never);

      await expect(service.validatePreTrade(VALID_TRADE)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when below minimum trade amount', async () => {
      const db = makeMockDb([
        [{ status: 'active' }],
        [{ status: 'minted' }],
        [TRADING_LIMITS_ROW],
      ]);
      const service = new TradingLimitsService(db as never);

      await expect(
        service.validatePreTrade({ ...VALID_TRADE, totalAmount: 500 }),
      ).rejects.toThrow(/below minimum/);
    });

    it('should throw ValidationError when above maximum trade amount', async () => {
      const db = makeMockDb([
        [{ status: 'active' }],
        [{ status: 'minted' }],
        [TRADING_LIMITS_ROW],
      ]);
      const service = new TradingLimitsService(db as never);

      await expect(
        service.validatePreTrade({ ...VALID_TRADE, totalAmount: 20000000 }),
      ).rejects.toThrow(/exceeds maximum/);
    });

    it('should throw ValidationError when daily limit exceeded', async () => {
      const db = makeMockDb([
        [{ status: 'active' }],
        [{ status: 'minted' }],
        [TRADING_LIMITS_ROW],       // 5M daily limit
        [{ volume: '4999000.00' }], // only 1000 remaining
      ]);
      const service = new TradingLimitsService(db as never);

      await expect(
        service.validatePreTrade({ ...VALID_TRADE, totalAmount: 2000 }),
      ).rejects.toThrow(/daily limit/);
    });

    it('should skip daily limit check for unlimited tier', async () => {
      const db = makeMockDb([
        [{ status: 'active' }],
        [{ status: 'minted' }],
        [{ ...TRADING_LIMITS_ROW, dailyLimitUsd: '0.00' }],
        // no getDailyVolume call expected
      ]);
      const service = new TradingLimitsService(db as never);

      await expect(service.validatePreTrade(VALID_TRADE)).resolves.toBeUndefined();
      // Should only have 3 DB queries (no daily volume query)
      expect(db.query).toHaveBeenCalledTimes(3);
    });

    it('should allow trade exactly at daily limit boundary', async () => {
      const db = makeMockDb([
        [{ status: 'active' }],
        [{ status: 'minted' }],
        [TRADING_LIMITS_ROW],       // 5M daily limit
        [{ volume: '4997500.00' }], // 2500 remaining
      ]);
      const service = new TradingLimitsService(db as never);

      await expect(service.validatePreTrade(VALID_TRADE)).resolves.toBeUndefined();
    });

    it('should allow trade exactly at minimum amount', async () => {
      const db = makeMockDb([
        [{ status: 'active' }],
        [{ status: 'minted' }],
        [TRADING_LIMITS_ROW],
        [{ volume: '0' }],
      ]);
      const service = new TradingLimitsService(db as never);

      await expect(
        service.validatePreTrade({ ...VALID_TRADE, totalAmount: 1000 }),
      ).resolves.toBeUndefined();
    });

    it('should allow trade exactly at maximum amount', async () => {
      const db = makeMockDb([
        [{ status: 'active' }],
        [{ status: 'minted' }],
        [{ ...TRADING_LIMITS_ROW, dailyLimitUsd: '0.00' }], // unlimited tier
      ]);
      const service = new TradingLimitsService(db as never);

      await expect(
        service.validatePreTrade({ ...VALID_TRADE, totalAmount: 10000000 }),
      ).resolves.toBeUndefined();
    });
  });
});
