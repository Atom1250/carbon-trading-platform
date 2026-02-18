import { FeeCalculationService } from './FeeCalculationService';

const INSTITUTION_ID = '770e8400-e29b-41d4-a716-446655440000';

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

describe('FeeCalculationService', () => {
  // ─── calculateFees ──────────────────────────────────────────────────────────

  describe('calculateFees', () => {
    it('should calculate 0.125% maker fee', () => {
      const db = makeMockDb();
      const service = new FeeCalculationService(db as never);

      const result = service.calculateFees(10000);

      expect(result.makerFee).toBe(12.5);
    });

    it('should calculate 0.125% taker fee', () => {
      const db = makeMockDb();
      const service = new FeeCalculationService(db as never);

      const result = service.calculateFees(10000);

      expect(result.takerFee).toBe(12.5);
    });

    it('should calculate platform fee as sum of maker and taker fees', () => {
      const db = makeMockDb();
      const service = new FeeCalculationService(db as never);

      const result = service.calculateFees(10000);

      expect(result.platformFee).toBe(25);
    });

    it('should round to 2 decimal places', () => {
      const db = makeMockDb();
      const service = new FeeCalculationService(db as never);

      const result = service.calculateFees(1234.56);

      expect(result.makerFee).toBe(1.54);
      expect(result.takerFee).toBe(1.54);
      expect(result.platformFee).toBe(3.08);
    });

    it('should return zero fees for zero amount', () => {
      const db = makeMockDb();
      const service = new FeeCalculationService(db as never);

      const result = service.calculateFees(0);

      expect(result.makerFee).toBe(0);
      expect(result.takerFee).toBe(0);
      expect(result.platformFee).toBe(0);
    });

    it('should handle large amounts', () => {
      const db = makeMockDb();
      const service = new FeeCalculationService(db as never);

      const result = service.calculateFees(10_000_000);

      expect(result.makerFee).toBe(12500);
      expect(result.takerFee).toBe(12500);
      expect(result.platformFee).toBe(25000);
    });
  });

  // ─── getFeeReport ──────────────────────────────────────────────────────────

  describe('getFeeReport', () => {
    it('should return aggregated fee report', async () => {
      const db = makeMockDb([[{
        totalMakerFees: '125.00',
        totalTakerFees: '125.00',
        totalPlatformFees: '250.00',
        tradeCount: '10',
      }]]);
      const service = new FeeCalculationService(db as never);

      const result = await service.getFeeReport({});

      expect(result.totalMakerFees).toBe('125.00');
      expect(result.totalTakerFees).toBe('125.00');
      expect(result.totalPlatformFees).toBe('250.00');
      expect(result.tradeCount).toBe(10);
    });

    it('should filter by startDate', async () => {
      const db = makeMockDb([[{
        totalMakerFees: '0',
        totalTakerFees: '0',
        totalPlatformFees: '0',
        tradeCount: '0',
      }]]);
      const service = new FeeCalculationService(db as never);

      await service.getFeeReport({ startDate: '2025-01-01' });

      const [sql, params] = (db.query as jest.Mock).mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('created_at >=');
      expect(params).toContain('2025-01-01');
    });

    it('should filter by endDate', async () => {
      const db = makeMockDb([[{
        totalMakerFees: '0',
        totalTakerFees: '0',
        totalPlatformFees: '0',
        tradeCount: '0',
      }]]);
      const service = new FeeCalculationService(db as never);

      await service.getFeeReport({ endDate: '2025-12-31' });

      const [sql, params] = (db.query as jest.Mock).mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('created_at <=');
      expect(params).toContain('2025-12-31');
    });

    it('should return null dates when no date filters provided', async () => {
      const db = makeMockDb([[{
        totalMakerFees: '0',
        totalTakerFees: '0',
        totalPlatformFees: '0',
        tradeCount: '0',
      }]]);
      const service = new FeeCalculationService(db as never);

      const result = await service.getFeeReport({});

      expect(result.startDate).toBeNull();
      expect(result.endDate).toBeNull();
    });
  });

  // ─── getFeesByInstitution ──────────────────────────────────────────────────

  describe('getFeesByInstitution', () => {
    it('should return fees for institution', async () => {
      const db = makeMockDb([[{
        totalFeesPaid: '50.00',
        tradeCount: '5',
      }]]);
      const service = new FeeCalculationService(db as never);

      const result = await service.getFeesByInstitution(INSTITUTION_ID);

      expect(result.institutionId).toBe(INSTITUTION_ID);
      expect(result.totalFeesPaid).toBe('50.00');
      expect(result.tradeCount).toBe(5);
    });

    it('should pass institution ID to query', async () => {
      const db = makeMockDb([[{
        totalFeesPaid: '0',
        tradeCount: '0',
      }]]);
      const service = new FeeCalculationService(db as never);

      await service.getFeesByInstitution(INSTITUTION_ID);

      const params = (db.query as jest.Mock).mock.calls[0][1] as unknown[];
      expect(params[0]).toBe(INSTITUTION_ID);
    });

    it('should query both buyer and seller positions', async () => {
      const db = makeMockDb([[{
        totalFeesPaid: '0',
        tradeCount: '0',
      }]]);
      const service = new FeeCalculationService(db as never);

      await service.getFeesByInstitution(INSTITUTION_ID);

      const [sql] = (db.query as jest.Mock).mock.calls[0] as [string];
      expect(sql).toContain('buyer_institution_id');
      expect(sql).toContain('seller_institution_id');
    });
  });
});
