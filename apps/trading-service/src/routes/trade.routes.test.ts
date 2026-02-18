import request from 'supertest';
import express from 'express';
import { createTradeRouter, createFeeRouter } from './trade.routes';
import { errorHandler } from '../middleware/errorHandler';
import { requestIdMiddleware } from '../middleware/requestId';
import { NotFoundError } from '@libs/errors';

jest.mock('@libs/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

const TRADE_ID = 'aa0e8400-e29b-41d4-a716-446655440000';
const RFQ_ID = '550e8400-e29b-41d4-a716-446655440000';
const QUOTE_ID = 'bb0e8400-e29b-41d4-a716-446655440000';
const ASSET_ID = '660e8400-e29b-41d4-a716-446655440000';
const BUYER_INST_ID = '770e8400-e29b-41d4-a716-446655440000';
const SELLER_INST_ID = '880e8400-e29b-41d4-a716-446655440000';

const TRADE_RESPONSE = {
  id: TRADE_ID,
  rfqId: RFQ_ID,
  quoteId: QUOTE_ID,
  assetId: ASSET_ID,
  buyerInstitutionId: BUYER_INST_ID,
  sellerInstitutionId: SELLER_INST_ID,
  quantity: '100.00000000',
  pricePerUnit: '25.00000000',
  totalAmount: '2500.00',
  makerFee: '3.13',
  takerFee: '3.13',
  platformFee: '6.26',
  status: 'settled',
  settlementTxHash: '0x' + 'ab'.repeat(32),
  settledAt: new Date('2025-06-01T00:02:01Z').toISOString(),
  failedAt: null,
  failureReason: null,
  createdAt: new Date('2025-06-01T00:02:00Z').toISOString(),
  updatedAt: new Date('2025-06-01T00:02:01Z').toISOString(),
};

function makeSettlementService(opts: {
  findById?: jest.Mock;
  listTrades?: jest.Mock;
} = {}) {
  return {
    findById: opts.findById ?? jest.fn().mockResolvedValue(TRADE_RESPONSE),
    listTrades: opts.listTrades ?? jest.fn().mockResolvedValue({
      trades: [TRADE_RESPONSE],
      total: 1,
    }),
    createTradeFromQuote: jest.fn(),
    settleTradeSync: jest.fn(),
    failTrade: jest.fn(),
  };
}

function makeFeeService(opts: {
  getFeeReport?: jest.Mock;
  getFeesByInstitution?: jest.Mock;
} = {}) {
  return {
    calculateFees: jest.fn(),
    getFeeReport: opts.getFeeReport ?? jest.fn().mockResolvedValue({
      totalMakerFees: '125.00',
      totalTakerFees: '125.00',
      totalPlatformFees: '250.00',
      tradeCount: 10,
      startDate: null,
      endDate: null,
    }),
    getFeesByInstitution: opts.getFeesByInstitution ?? jest.fn().mockResolvedValue({
      institutionId: BUYER_INST_ID,
      totalFeesPaid: '50.00',
      tradeCount: 5,
    }),
  };
}

function makeTradeApp(settlementOpts?: Parameters<typeof makeSettlementService>[0]) {
  const app = express();
  app.use(express.json());
  app.use(requestIdMiddleware);
  app.use('/trades', createTradeRouter({
    settlementService: makeSettlementService(settlementOpts) as never,
  }));
  app.use(errorHandler);
  return app;
}

function makeFeeApp(feeOpts?: Parameters<typeof makeFeeService>[0]) {
  const app = express();
  app.use(express.json());
  app.use(requestIdMiddleware);
  app.use('/fees', createFeeRouter({
    feeCalculationService: makeFeeService(feeOpts) as never,
  }));
  app.use(errorHandler);
  return app;
}

// ─── GET /trades ─────────────────────────────────────────────────────────────

describe('GET /trades', () => {
  it('should return 200 with trade list', async () => {
    const res = await request(makeTradeApp()).get('/trades');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.metadata.total).toBe(1);
  });

  it('should include pagination metadata', async () => {
    const res = await request(makeTradeApp()).get('/trades?limit=10&offset=0');

    expect(res.body.metadata).toMatchObject({
      total: 1,
      limit: 10,
      offset: 0,
      hasMore: false,
    });
  });

  it('should pass filters to service', async () => {
    const listTrades = jest.fn().mockResolvedValue({ trades: [], total: 0 });
    const app = makeTradeApp({ listTrades });

    await request(app).get(`/trades?status=settled&assetId=${ASSET_ID}&institutionId=${BUYER_INST_ID}`);

    expect(listTrades).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'settled',
        assetId: ASSET_ID,
        institutionId: BUYER_INST_ID,
      }),
    );
  });

  it('should use default limit and offset', async () => {
    const listTrades = jest.fn().mockResolvedValue({ trades: [], total: 0 });
    const app = makeTradeApp({ listTrades });

    await request(app).get('/trades');

    expect(listTrades).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 20, offset: 0 }),
    );
  });

  it('should return 422 for invalid status filter', async () => {
    const res = await request(makeTradeApp()).get('/trades?status=invalid');

    expect(res.status).toBe(422);
  });
});

// ─── GET /trades/:id ─────────────────────────────────────────────────────────

describe('GET /trades/:id', () => {
  it('should return 200 with trade', async () => {
    const res = await request(makeTradeApp()).get(`/trades/${TRADE_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(TRADE_ID);
  });

  it('should return 404 when trade not found', async () => {
    const app = makeTradeApp({
      findById: jest.fn().mockRejectedValue(new NotFoundError('Trade', 'bad-id')),
    });

    const res = await request(app).get('/trades/bad-id');

    expect(res.status).toBe(404);
    expect(res.body.status).toBe(404);
  });
});

// ─── GET /fees/report ────────────────────────────────────────────────────────

describe('GET /fees/report', () => {
  it('should return 200 with fee report', async () => {
    const res = await request(makeFeeApp()).get('/fees/report');

    expect(res.status).toBe(200);
    expect(res.body.data.totalMakerFees).toBe('125.00');
    expect(res.body.data.tradeCount).toBe(10);
  });

  it('should pass date filters to service', async () => {
    const getFeeReport = jest.fn().mockResolvedValue({
      totalMakerFees: '0',
      totalTakerFees: '0',
      totalPlatformFees: '0',
      tradeCount: 0,
      startDate: '2025-01-01',
      endDate: '2025-12-31',
    });
    const app = makeFeeApp({ getFeeReport });

    await request(app).get('/fees/report?startDate=2025-01-01&endDate=2025-12-31');

    expect(getFeeReport).toHaveBeenCalledWith(
      expect.objectContaining({
        startDate: '2025-01-01',
        endDate: '2025-12-31',
      }),
    );
  });

  it('should work without date filters', async () => {
    const res = await request(makeFeeApp()).get('/fees/report');

    expect(res.status).toBe(200);
    expect(res.body.data.startDate).toBeNull();
    expect(res.body.data.endDate).toBeNull();
  });
});

// ─── GET /fees/institution/:institutionId ────────────────────────────────────

describe('GET /fees/institution/:institutionId', () => {
  it('should return 200 with institution fees', async () => {
    const res = await request(makeFeeApp()).get(`/fees/institution/${BUYER_INST_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data.institutionId).toBe(BUYER_INST_ID);
    expect(res.body.data.totalFeesPaid).toBe('50.00');
    expect(res.body.data.tradeCount).toBe(5);
  });

  it('should pass institutionId to service', async () => {
    const getFeesByInstitution = jest.fn().mockResolvedValue({
      institutionId: SELLER_INST_ID,
      totalFeesPaid: '0',
      tradeCount: 0,
    });
    const app = makeFeeApp({ getFeesByInstitution });

    await request(app).get(`/fees/institution/${SELLER_INST_ID}`);

    expect(getFeesByInstitution).toHaveBeenCalledWith(SELLER_INST_ID);
  });
});
