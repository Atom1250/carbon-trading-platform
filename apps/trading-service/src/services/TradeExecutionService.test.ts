import { TradeExecutionService } from './TradeExecutionService';
import { NotFoundError } from '@libs/errors';

const TRADE_ID = 'aa0e8400-e29b-41d4-a716-446655440000';
const RFQ_ID = '550e8400-e29b-41d4-a716-446655440000';
const QUOTE_ID = 'bb0e8400-e29b-41d4-a716-446655440000';
const ASSET_ID = '660e8400-e29b-41d4-a716-446655440000';
const BUYER_INST_ID = '770e8400-e29b-41d4-a716-446655440000';
const SELLER_INST_ID = '880e8400-e29b-41d4-a716-446655440000';
const BUYER_USER_ID = '990e8400-e29b-41d4-a716-446655440000';
const SELLER_USER_ID = 'aa1e8400-e29b-41d4-a716-446655440000';
const ACCEPTED_USER_ID = 'cc0e8400-e29b-41d4-a716-446655440000';

const ACCEPTED_QUOTE = {
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

const ACCEPTED_RFQ = {
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

const PENDING_TRADE = {
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
  status: 'pending_settlement' as const,
  settlementTxHash: null,
  settledAt: null,
  failedAt: null,
  failureReason: null,
  createdAt: new Date('2025-06-01T00:02:00Z'),
  updatedAt: new Date('2025-06-01T00:02:00Z'),
};

const SETTLED_TRADE = {
  ...PENDING_TRADE,
  status: 'settled' as const,
  settlementTxHash: '0x' + 'ab'.repeat(32),
  settledAt: new Date('2025-06-01T00:02:01Z'),
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

function makeMockQuoteService(overrides: Record<string, jest.Mock> = {}) {
  return {
    acceptQuote: overrides['acceptQuote'] ?? jest.fn().mockResolvedValue(ACCEPTED_QUOTE),
    submitQuote: jest.fn(),
    findById: jest.fn(),
    listQuotesByRFQ: jest.fn(),
    withdrawQuote: jest.fn(),
    expireQuotes: jest.fn(),
  };
}

function makeMockRfqService(overrides: Record<string, jest.Mock> = {}) {
  return {
    findById: overrides['findById'] ?? jest.fn().mockResolvedValue(ACCEPTED_RFQ),
    createRFQ: jest.fn(),
    listRFQs: jest.fn(),
    cancelRFQ: jest.fn(),
    expireRFQs: jest.fn(),
  };
}

function makeMockSettlementService(overrides: Record<string, jest.Mock> = {}) {
  return {
    createTradeFromQuote: overrides['createTradeFromQuote'] ?? jest.fn().mockResolvedValue(PENDING_TRADE),
    settleTradeSync: overrides['settleTradeSync'] ?? jest.fn().mockResolvedValue(SETTLED_TRADE),
    failTrade: jest.fn(),
    findById: overrides['findById'] ?? jest.fn().mockResolvedValue(SETTLED_TRADE),
    listTrades: overrides['listTrades'] ?? jest.fn().mockResolvedValue({ trades: [SETTLED_TRADE], total: 1 }),
  };
}

describe('TradeExecutionService', () => {
  // ─── executeQuoteAcceptance ────────────────────────────────────────────────

  describe('executeQuoteAcceptance', () => {
    it('should accept quote, create trade, and settle', async () => {
      const db = makeMockDb();
      const quoteService = makeMockQuoteService();
      const rfqService = makeMockRfqService();
      const settlementService = makeMockSettlementService();
      const service = new TradeExecutionService(
        db as never, quoteService as never, rfqService as never, settlementService as never,
      );

      const result = await service.executeQuoteAcceptance(QUOTE_ID, ACCEPTED_USER_ID);

      expect(result.status).toBe('settled');
      expect(result.settlementTxHash).toBeDefined();
    });

    it('should call acceptQuote with correct args', async () => {
      const db = makeMockDb();
      const quoteService = makeMockQuoteService();
      const rfqService = makeMockRfqService();
      const settlementService = makeMockSettlementService();
      const service = new TradeExecutionService(
        db as never, quoteService as never, rfqService as never, settlementService as never,
      );

      await service.executeQuoteAcceptance(QUOTE_ID, ACCEPTED_USER_ID);

      expect(quoteService.acceptQuote).toHaveBeenCalledWith(QUOTE_ID, ACCEPTED_USER_ID);
    });

    it('should fetch the RFQ for accepted quote', async () => {
      const db = makeMockDb();
      const quoteService = makeMockQuoteService();
      const rfqService = makeMockRfqService();
      const settlementService = makeMockSettlementService();
      const service = new TradeExecutionService(
        db as never, quoteService as never, rfqService as never, settlementService as never,
      );

      await service.executeQuoteAcceptance(QUOTE_ID, ACCEPTED_USER_ID);

      expect(rfqService.findById).toHaveBeenCalledWith(RFQ_ID);
    });

    it('should create trade from the accepted quote and RFQ', async () => {
      const db = makeMockDb();
      const quoteService = makeMockQuoteService();
      const rfqService = makeMockRfqService();
      const settlementService = makeMockSettlementService();
      const service = new TradeExecutionService(
        db as never, quoteService as never, rfqService as never, settlementService as never,
      );

      await service.executeQuoteAcceptance(QUOTE_ID, ACCEPTED_USER_ID);

      expect(settlementService.createTradeFromQuote).toHaveBeenCalledWith(ACCEPTED_QUOTE, ACCEPTED_RFQ);
    });

    it('should settle the trade immediately (T+0)', async () => {
      const db = makeMockDb();
      const quoteService = makeMockQuoteService();
      const rfqService = makeMockRfqService();
      const settlementService = makeMockSettlementService();
      const service = new TradeExecutionService(
        db as never, quoteService as never, rfqService as never, settlementService as never,
      );

      await service.executeQuoteAcceptance(QUOTE_ID, ACCEPTED_USER_ID);

      expect(settlementService.settleTradeSync).toHaveBeenCalledWith(TRADE_ID);
    });

    it('should propagate errors from quoteService', async () => {
      const db = makeMockDb();
      const quoteService = makeMockQuoteService({
        acceptQuote: jest.fn().mockRejectedValue(new NotFoundError('Quote', QUOTE_ID)),
      });
      const rfqService = makeMockRfqService();
      const settlementService = makeMockSettlementService();
      const service = new TradeExecutionService(
        db as never, quoteService as never, rfqService as never, settlementService as never,
      );

      await expect(service.executeQuoteAcceptance(QUOTE_ID, ACCEPTED_USER_ID))
        .rejects.toThrow(NotFoundError);
    });

    it('should execute steps in order: accept → fetch RFQ → create trade → settle', async () => {
      const db = makeMockDb();
      const callOrder: string[] = [];
      const quoteService = makeMockQuoteService({
        acceptQuote: jest.fn().mockImplementation(() => { callOrder.push('accept'); return Promise.resolve(ACCEPTED_QUOTE); }),
      });
      const rfqService = makeMockRfqService({
        findById: jest.fn().mockImplementation(() => { callOrder.push('fetchRFQ'); return Promise.resolve(ACCEPTED_RFQ); }),
      });
      const settlementService = makeMockSettlementService({
        createTradeFromQuote: jest.fn().mockImplementation(() => { callOrder.push('createTrade'); return Promise.resolve(PENDING_TRADE); }),
        settleTradeSync: jest.fn().mockImplementation(() => { callOrder.push('settle'); return Promise.resolve(SETTLED_TRADE); }),
      });
      const service = new TradeExecutionService(
        db as never, quoteService as never, rfqService as never, settlementService as never,
      );

      await service.executeQuoteAcceptance(QUOTE_ID, ACCEPTED_USER_ID);

      expect(callOrder).toEqual(['accept', 'fetchRFQ', 'createTrade', 'settle']);
    });
  });

  // ─── getTradeConfirmation ──────────────────────────────────────────────────

  describe('getTradeConfirmation', () => {
    it('should return structured trade confirmation', async () => {
      const db = makeMockDb([[{ name: 'Green Carbon Token', assetType: 'carbon_credit' }]]);
      const settlementService = makeMockSettlementService();
      const service = new TradeExecutionService(
        db as never, makeMockQuoteService() as never, makeMockRfqService() as never, settlementService as never,
      );

      const result = await service.getTradeConfirmation(TRADE_ID);

      expect(result.tradeId).toBe(TRADE_ID);
      expect(result.buyer.institutionId).toBe(BUYER_INST_ID);
      expect(result.seller.institutionId).toBe(SELLER_INST_ID);
      expect(result.asset.name).toBe('Green Carbon Token');
      expect(result.asset.type).toBe('carbon_credit');
    });

    it('should include fee breakdown', async () => {
      const db = makeMockDb([[{ name: 'Token', assetType: 'carbon_credit' }]]);
      const settlementService = makeMockSettlementService();
      const service = new TradeExecutionService(
        db as never, makeMockQuoteService() as never, makeMockRfqService() as never, settlementService as never,
      );

      const result = await service.getTradeConfirmation(TRADE_ID);

      expect(result.fees.maker).toBe('3.13');
      expect(result.fees.taker).toBe('3.13');
      expect(result.fees.platform).toBe('6.26');
    });

    it('should include settlement details', async () => {
      const db = makeMockDb([[{ name: 'Token', assetType: 'carbon_credit' }]]);
      const settlementService = makeMockSettlementService();
      const service = new TradeExecutionService(
        db as never, makeMockQuoteService() as never, makeMockRfqService() as never, settlementService as never,
      );

      const result = await service.getTradeConfirmation(TRADE_ID);

      expect(result.settlement.txHash).toBe('0x' + 'ab'.repeat(32));
      expect(result.settlement.status).toBe('settled');
    });

    it('should include trade amounts', async () => {
      const db = makeMockDb([[{ name: 'Token', assetType: 'carbon_credit' }]]);
      const settlementService = makeMockSettlementService();
      const service = new TradeExecutionService(
        db as never, makeMockQuoteService() as never, makeMockRfqService() as never, settlementService as never,
      );

      const result = await service.getTradeConfirmation(TRADE_ID);

      expect(result.quantity).toBe('100.00000000');
      expect(result.pricePerUnit).toBe('25.00000000');
      expect(result.totalAmount).toBe('2500.00');
    });

    it('should handle unknown asset gracefully', async () => {
      const db = makeMockDb([[]]); // empty asset result
      const settlementService = makeMockSettlementService();
      const service = new TradeExecutionService(
        db as never, makeMockQuoteService() as never, makeMockRfqService() as never, settlementService as never,
      );

      const result = await service.getTradeConfirmation(TRADE_ID);

      expect(result.asset.name).toBe('Unknown');
      expect(result.asset.type).toBe('unknown');
    });

    it('should throw NotFoundError when trade does not exist', async () => {
      const db = makeMockDb();
      const settlementService = makeMockSettlementService({
        findById: jest.fn().mockRejectedValue(new NotFoundError('Trade', 'bad-id')),
      });
      const service = new TradeExecutionService(
        db as never, makeMockQuoteService() as never, makeMockRfqService() as never, settlementService as never,
      );

      await expect(service.getTradeConfirmation('bad-id')).rejects.toThrow(NotFoundError);
    });

    it('should query assets table with trade assetId', async () => {
      const db = makeMockDb([[{ name: 'Token', assetType: 'carbon_credit' }]]);
      const settlementService = makeMockSettlementService();
      const service = new TradeExecutionService(
        db as never, makeMockQuoteService() as never, makeMockRfqService() as never, settlementService as never,
      );

      await service.getTradeConfirmation(TRADE_ID);

      const params = (db.query as jest.Mock).mock.calls[0][1] as unknown[];
      expect(params[0]).toBe(ASSET_ID);
    });
  });

  // ─── getTradesByInstitution ────────────────────────────────────────────────

  describe('getTradesByInstitution', () => {
    it('should return trades for institution', async () => {
      const db = makeMockDb();
      const settlementService = makeMockSettlementService();
      const service = new TradeExecutionService(
        db as never, makeMockQuoteService() as never, makeMockRfqService() as never, settlementService as never,
      );

      const result = await service.getTradesByInstitution(BUYER_INST_ID, { limit: 20, offset: 0 });

      expect(result.trades).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should delegate to settlementService.listTrades with institutionId', async () => {
      const db = makeMockDb();
      const listTrades = jest.fn().mockResolvedValue({ trades: [], total: 0 });
      const settlementService = makeMockSettlementService({ listTrades });
      const service = new TradeExecutionService(
        db as never, makeMockQuoteService() as never, makeMockRfqService() as never, settlementService as never,
      );

      await service.getTradesByInstitution(BUYER_INST_ID, { limit: 10, offset: 5 });

      expect(listTrades).toHaveBeenCalledWith({
        institutionId: BUYER_INST_ID,
        limit: 10,
        offset: 5,
      });
    });
  });
});
