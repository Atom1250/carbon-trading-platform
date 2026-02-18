import request from 'supertest';
import express from 'express';
import { createConfirmationRouter } from './confirmation.routes';
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
const BUYER_INST_ID = '770e8400-e29b-41d4-a716-446655440000';
const SELLER_INST_ID = '880e8400-e29b-41d4-a716-446655440000';

const CONFIRMATION_RESPONSE = {
  tradeId: TRADE_ID,
  tradeDate: '2025-06-01T00:02:00.000Z',
  settlementDate: '2025-06-01T00:02:01.000Z',
  buyer: { institutionId: BUYER_INST_ID, userId: '990e8400-e29b-41d4-a716-446655440000' },
  seller: { institutionId: SELLER_INST_ID, userId: 'aa1e8400-e29b-41d4-a716-446655440000' },
  asset: { id: '660e8400-e29b-41d4-a716-446655440000', name: 'Green Carbon Token', type: 'carbon_credit' },
  quantity: '100.00000000',
  pricePerUnit: '25.00000000',
  totalAmount: '2500.00',
  fees: { maker: '3.13', taker: '3.13', platform: '6.26' },
  settlement: { txHash: '0x' + 'ab'.repeat(32), settledAt: '2025-06-01T00:02:01.000Z', status: 'settled' },
};

const TRADE_RESPONSE = {
  id: TRADE_ID,
  rfqId: '550e8400-e29b-41d4-a716-446655440000',
  quoteId: 'bb0e8400-e29b-41d4-a716-446655440000',
  assetId: '660e8400-e29b-41d4-a716-446655440000',
  buyerInstitutionId: BUYER_INST_ID,
  sellerInstitutionId: SELLER_INST_ID,
  quantity: '100.00000000',
  pricePerUnit: '25.00000000',
  totalAmount: '2500.00',
  status: 'settled',
  createdAt: '2025-06-01T00:02:00.000Z',
  updatedAt: '2025-06-01T00:02:01.000Z',
};

function makeTradeExecutionService(opts: {
  getTradeConfirmation?: jest.Mock;
  getTradesByInstitution?: jest.Mock;
} = {}) {
  return {
    executeQuoteAcceptance: jest.fn(),
    getTradeConfirmation: opts.getTradeConfirmation ?? jest.fn().mockResolvedValue(CONFIRMATION_RESPONSE),
    getTradesByInstitution: opts.getTradesByInstitution ?? jest.fn().mockResolvedValue({
      trades: [TRADE_RESPONSE],
      total: 1,
    }),
  };
}

function makeApp(serviceOpts?: Parameters<typeof makeTradeExecutionService>[0]) {
  const app = express();
  app.use(express.json());
  app.use(requestIdMiddleware);
  app.use('/trades', createConfirmationRouter({
    tradeExecutionService: makeTradeExecutionService(serviceOpts) as never,
  }));
  app.use(errorHandler);
  return app;
}

// ─── GET /trades/:id/confirmation ────────────────────────────────────────────

describe('GET /trades/:id/confirmation', () => {
  it('should return 200 with trade confirmation', async () => {
    const res = await request(makeApp()).get(`/trades/${TRADE_ID}/confirmation`);

    expect(res.status).toBe(200);
    expect(res.body.data.tradeId).toBe(TRADE_ID);
    expect(res.body.data.buyer.institutionId).toBe(BUYER_INST_ID);
    expect(res.body.data.seller.institutionId).toBe(SELLER_INST_ID);
  });

  it('should include asset details', async () => {
    const res = await request(makeApp()).get(`/trades/${TRADE_ID}/confirmation`);

    expect(res.body.data.asset.name).toBe('Green Carbon Token');
    expect(res.body.data.asset.type).toBe('carbon_credit');
  });

  it('should include fee breakdown', async () => {
    const res = await request(makeApp()).get(`/trades/${TRADE_ID}/confirmation`);

    expect(res.body.data.fees).toMatchObject({
      maker: '3.13',
      taker: '3.13',
      platform: '6.26',
    });
  });

  it('should include settlement details', async () => {
    const res = await request(makeApp()).get(`/trades/${TRADE_ID}/confirmation`);

    expect(res.body.data.settlement.status).toBe('settled');
    expect(res.body.data.settlement.txHash).toBeDefined();
  });

  it('should return 404 when trade not found', async () => {
    const app = makeApp({
      getTradeConfirmation: jest.fn().mockRejectedValue(new NotFoundError('Trade', 'bad-id')),
    });

    const res = await request(app).get('/trades/bad-id/confirmation');

    expect(res.status).toBe(404);
    expect(res.body.status).toBe(404);
  });

  it('should pass trade id to service', async () => {
    const getTradeConfirmation = jest.fn().mockResolvedValue(CONFIRMATION_RESPONSE);
    const app = makeApp({ getTradeConfirmation });

    await request(app).get(`/trades/${TRADE_ID}/confirmation`);

    expect(getTradeConfirmation).toHaveBeenCalledWith(TRADE_ID);
  });
});

// ─── GET /trades/institution/:institutionId ──────────────────────────────────

describe('GET /trades/institution/:institutionId', () => {
  it('should return 200 with trades list', async () => {
    const res = await request(makeApp()).get(`/trades/institution/${BUYER_INST_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.metadata.total).toBe(1);
  });

  it('should include pagination metadata', async () => {
    const res = await request(makeApp()).get(`/trades/institution/${BUYER_INST_ID}?limit=10&offset=0`);

    expect(res.body.metadata).toMatchObject({
      total: 1,
      limit: 10,
      offset: 0,
      hasMore: false,
    });
  });

  it('should pass institutionId and pagination to service', async () => {
    const getTradesByInstitution = jest.fn().mockResolvedValue({ trades: [], total: 0 });
    const app = makeApp({ getTradesByInstitution });

    await request(app).get(`/trades/institution/${BUYER_INST_ID}?limit=5&offset=10`);

    expect(getTradesByInstitution).toHaveBeenCalledWith(
      BUYER_INST_ID,
      expect.objectContaining({ limit: 5, offset: 10 }),
    );
  });

  it('should use default limit and offset', async () => {
    const getTradesByInstitution = jest.fn().mockResolvedValue({ trades: [], total: 0 });
    const app = makeApp({ getTradesByInstitution });

    await request(app).get(`/trades/institution/${BUYER_INST_ID}`);

    expect(getTradesByInstitution).toHaveBeenCalledWith(
      BUYER_INST_ID,
      expect.objectContaining({ limit: 20, offset: 0 }),
    );
  });
});
