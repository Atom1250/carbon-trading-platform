import { SettlementService } from './SettlementService';
import { FeeCalculationService } from './FeeCalculationService';
import { NotFoundError, ValidationError } from '@libs/errors';

const TRADE_ID = 'aa0e8400-e29b-41d4-a716-446655440000';
const RFQ_ID = '550e8400-e29b-41d4-a716-446655440000';
const QUOTE_ID = 'bb0e8400-e29b-41d4-a716-446655440000';
const ASSET_ID = '660e8400-e29b-41d4-a716-446655440000';
const BUYER_INST_ID = '770e8400-e29b-41d4-a716-446655440000';
const SELLER_INST_ID = '880e8400-e29b-41d4-a716-446655440000';
const BUYER_USER_ID = '990e8400-e29b-41d4-a716-446655440000';
const SELLER_USER_ID = 'aa1e8400-e29b-41d4-a716-446655440000';

const MOCK_QUOTE = {
  id: QUOTE_ID,
  rfqId: RFQ_ID,
  quoterInstitutionId: SELLER_INST_ID,
  quoterUserId: SELLER_USER_ID,
  pricePerUnit: '25.00000000',
  quantity: '100.00000000',
  totalAmount: '2500.00',
  status: 'accepted' as const,
  expiresAt: new Date('2025-06-01T00:05:00Z'),
  acceptedAt: new Date('2025-06-01T00:02:00Z'),
  withdrawnAt: null,
  createdAt: new Date('2025-06-01T00:00:00Z'),
  updatedAt: new Date('2025-06-01T00:02:00Z'),
};

const MOCK_RFQ = {
  id: RFQ_ID,
  assetId: ASSET_ID,
  requesterInstitutionId: BUYER_INST_ID,
  requesterUserId: BUYER_USER_ID,
  side: 'buy' as const,
  quantity: '100.00000000',
  status: 'accepted' as const,
  expiresAt: new Date('2025-06-01T00:05:00Z'),
  cancelledAt: null,
  cancellationReason: null,
  createdAt: new Date('2025-06-01T00:00:00Z'),
  updatedAt: new Date('2025-06-01T00:02:00Z'),
};

const DB_TRADE_ROW = {
  id: TRADE_ID,
  rfqId: RFQ_ID,
  quoteId: QUOTE_ID,
  assetId: ASSET_ID,
  buyerInstitutionId: BUYER_INST_ID,
  sellerInstitutionId: SELLER_INST_ID,
  buyerUserId: BUYER_USER_ID,
  sellerUserId: SELLER_USER_ID,
  quantity: '100.00000000',
  pricePerUnit: '25.00000000',
  totalAmount: '2500.00',
  makerFee: '3.13',
  takerFee: '3.13',
  platformFee: '6.26',
  status: 'pending_settlement',
  settlementTxHash: null,
  settledAt: null,
  failedAt: null,
  failureReason: null,
  createdAt: new Date('2025-06-01T00:02:00Z'),
  updatedAt: new Date('2025-06-01T00:02:00Z'),
};

const SETTLED_TRADE_ROW = {
  ...DB_TRADE_ROW,
  status: 'settled',
  settlementTxHash: '0x' + 'ab'.repeat(32),
  settledAt: new Date('2025-06-01T00:02:01Z'),
};

const FAILED_TRADE_ROW = {
  ...DB_TRADE_ROW,
  status: 'failed',
  failedAt: new Date('2025-06-01T00:02:01Z'),
  failureReason: 'Insufficient supply',
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

function makeMockFeeService() {
  return {
    calculateFees: jest.fn().mockReturnValue({
      makerFee: 3.13,
      takerFee: 3.13,
      platformFee: 6.26,
    }),
    getFeeReport: jest.fn(),
    getFeesByInstitution: jest.fn(),
  } as unknown as FeeCalculationService;
}

describe('SettlementService', () => {
  // ─── createTradeFromQuote ──────────────────────────────────────────────────

  describe('createTradeFromQuote', () => {
    it('should create a trade with pending_settlement status', async () => {
      const db = makeMockDb([[DB_TRADE_ROW]]);
      const feeService = makeMockFeeService();
      const service = new SettlementService(db as never, feeService);

      const result = await service.createTradeFromQuote(MOCK_QUOTE, MOCK_RFQ);

      expect(result.status).toBe('pending_settlement');
      expect(result.rfqId).toBe(RFQ_ID);
      expect(result.quoteId).toBe(QUOTE_ID);
    });

    it('should determine buyer/seller based on RFQ buy side', async () => {
      const db = makeMockDb([[DB_TRADE_ROW]]);
      const feeService = makeMockFeeService();
      const service = new SettlementService(db as never, feeService);

      await service.createTradeFromQuote(MOCK_QUOTE, MOCK_RFQ);

      const params = (db.query as jest.Mock).mock.calls[0][1] as unknown[];
      // buyer_institution_id = requester (buy side)
      expect(params[3]).toBe(BUYER_INST_ID);
      // seller_institution_id = quoter
      expect(params[4]).toBe(SELLER_INST_ID);
    });

    it('should swap buyer/seller when RFQ is sell side', async () => {
      const db = makeMockDb([[DB_TRADE_ROW]]);
      const feeService = makeMockFeeService();
      const service = new SettlementService(db as never, feeService);

      const sellRfq = { ...MOCK_RFQ, side: 'sell' as const };
      await service.createTradeFromQuote(MOCK_QUOTE, sellRfq);

      const params = (db.query as jest.Mock).mock.calls[0][1] as unknown[];
      // buyer_institution_id = quoter (RFQ is sell)
      expect(params[3]).toBe(SELLER_INST_ID);
      // seller_institution_id = requester
      expect(params[4]).toBe(BUYER_INST_ID);
    });

    it('should calculate fees from total amount', async () => {
      const db = makeMockDb([[DB_TRADE_ROW]]);
      const feeService = makeMockFeeService();
      const service = new SettlementService(db as never, feeService);

      await service.createTradeFromQuote(MOCK_QUOTE, MOCK_RFQ);

      expect(feeService.calculateFees).toHaveBeenCalledWith(2500);
    });

    it('should insert trade into database with fee values', async () => {
      const db = makeMockDb([[DB_TRADE_ROW]]);
      const feeService = makeMockFeeService();
      const service = new SettlementService(db as never, feeService);

      await service.createTradeFromQuote(MOCK_QUOTE, MOCK_RFQ);

      const [sql, params] = (db.query as jest.Mock).mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('INSERT INTO trades');
      expect(params[10]).toBe(3.13); // maker_fee
      expect(params[11]).toBe(3.13); // taker_fee
      expect(params[12]).toBe(6.26); // platform_fee
    });
  });

  // ─── settleTradeSync ──────────────────────────────────────────────────────

  describe('settleTradeSync', () => {
    it('should settle a pending trade', async () => {
      const db = makeMockDb([
        [DB_TRADE_ROW],     // findById
        [SETTLED_TRADE_ROW], // update
      ]);
      const service = new SettlementService(db as never, makeMockFeeService());

      const result = await service.settleTradeSync(TRADE_ID);

      expect(result.status).toBe('settled');
      expect(result.settlementTxHash).toBeDefined();
    });

    it('should generate a 0x-prefixed hex tx hash', async () => {
      const db = makeMockDb([
        [DB_TRADE_ROW],
        [SETTLED_TRADE_ROW],
      ]);
      const service = new SettlementService(db as never, makeMockFeeService());

      await service.settleTradeSync(TRADE_ID);

      const params = (db.query as jest.Mock).mock.calls[1][1] as unknown[];
      const txHash = params[0] as string;
      expect(txHash).toMatch(/^0x[a-f0-9]{64}$/);
    });

    it('should throw NotFoundError when trade does not exist', async () => {
      const db = makeMockDb([[]]);
      const service = new SettlementService(db as never, makeMockFeeService());

      await expect(service.settleTradeSync('nonexistent')).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when trade is already settled', async () => {
      const db = makeMockDb([[SETTLED_TRADE_ROW]]);
      const service = new SettlementService(db as never, makeMockFeeService());

      await expect(service.settleTradeSync(TRADE_ID)).rejects.toThrow(ValidationError);
    });
  });

  // ─── failTrade ─────────────────────────────────────────────────────────────

  describe('failTrade', () => {
    it('should fail a pending trade', async () => {
      const db = makeMockDb([
        [DB_TRADE_ROW],     // findById
        [FAILED_TRADE_ROW], // update
      ]);
      const service = new SettlementService(db as never, makeMockFeeService());

      const result = await service.failTrade(TRADE_ID, 'Insufficient supply');

      expect(result.status).toBe('failed');
      expect(result.failureReason).toBe('Insufficient supply');
    });

    it('should pass failure reason to update query', async () => {
      const db = makeMockDb([
        [DB_TRADE_ROW],
        [FAILED_TRADE_ROW],
      ]);
      const service = new SettlementService(db as never, makeMockFeeService());

      await service.failTrade(TRADE_ID, 'Supply check failed');

      const params = (db.query as jest.Mock).mock.calls[1][1] as unknown[];
      expect(params[0]).toBe('Supply check failed');
    });

    it('should throw NotFoundError when trade does not exist', async () => {
      const db = makeMockDb([[]]);
      const service = new SettlementService(db as never, makeMockFeeService());

      await expect(service.failTrade('nonexistent', 'reason')).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when trade is already settled', async () => {
      const db = makeMockDb([[SETTLED_TRADE_ROW]]);
      const service = new SettlementService(db as never, makeMockFeeService());

      await expect(service.failTrade(TRADE_ID, 'reason')).rejects.toThrow(ValidationError);
    });
  });

  // ─── findById ──────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('should return trade by id', async () => {
      const db = makeMockDb([[DB_TRADE_ROW]]);
      const service = new SettlementService(db as never, makeMockFeeService());

      const result = await service.findById(TRADE_ID);

      expect(result.id).toBe(TRADE_ID);
      expect(result.assetId).toBe(ASSET_ID);
    });

    it('should throw NotFoundError when trade does not exist', async () => {
      const db = makeMockDb([[]]);
      const service = new SettlementService(db as never, makeMockFeeService());

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  // ─── listTrades ────────────────────────────────────────────────────────────

  describe('listTrades', () => {
    it('should return trades with total', async () => {
      const db = makeMockDb([[{ count: '2' }], [DB_TRADE_ROW, DB_TRADE_ROW]]);
      const service = new SettlementService(db as never, makeMockFeeService());

      const result = await service.listTrades({ limit: 20, offset: 0 });

      expect(result.total).toBe(2);
      expect(result.trades).toHaveLength(2);
    });

    it('should filter by status', async () => {
      const db = makeMockDb([[{ count: '0' }], []]);
      const service = new SettlementService(db as never, makeMockFeeService());

      await service.listTrades({ limit: 20, offset: 0, status: 'settled' });

      const [sql] = (db.query as jest.Mock).mock.calls[0] as [string];
      expect(sql).toContain('status');
    });

    it('should filter by assetId', async () => {
      const db = makeMockDb([[{ count: '0' }], []]);
      const service = new SettlementService(db as never, makeMockFeeService());

      await service.listTrades({ limit: 20, offset: 0, assetId: ASSET_ID });

      const [sql] = (db.query as jest.Mock).mock.calls[0] as [string];
      expect(sql).toContain('asset_id');
    });

    it('should filter by institutionId (buyer or seller)', async () => {
      const db = makeMockDb([[{ count: '0' }], []]);
      const service = new SettlementService(db as never, makeMockFeeService());

      await service.listTrades({ limit: 20, offset: 0, institutionId: BUYER_INST_ID });

      const [sql] = (db.query as jest.Mock).mock.calls[0] as [string];
      expect(sql).toContain('buyer_institution_id');
      expect(sql).toContain('seller_institution_id');
    });

    it('should order by created_at DESC', async () => {
      const db = makeMockDb([[{ count: '0' }], []]);
      const service = new SettlementService(db as never, makeMockFeeService());

      await service.listTrades({ limit: 20, offset: 0 });

      const [sql] = (db.query as jest.Mock).mock.calls[1] as [string];
      expect(sql).toContain('ORDER BY created_at DESC');
    });
  });
});
