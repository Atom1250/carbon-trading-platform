import request from 'supertest';
import express from 'express';
import { createOrderBookRouter } from './orderbook.routes';
import { errorHandler } from '../middleware/errorHandler';
import { requestIdMiddleware } from '../middleware/requestId';

jest.mock('@libs/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

const ASSET_ID = '660e8400-e29b-41d4-a716-446655440000';

const EMPTY_ORDER_BOOK = {
  assetId: ASSET_ID,
  bids: [],
  asks: [],
  spread: null,
};

const ORDER_BOOK_WITH_DATA = {
  assetId: ASSET_ID,
  bids: [
    { price: '30.00000000', quantity: '50.00000000', orderCount: 2 },
    { price: '25.00000000', quantity: '100.00000000', orderCount: 1 },
  ],
  asks: [
    { price: '35.00000000', quantity: '75.00000000', orderCount: 1 },
  ],
  spread: 5,
};

const SPREAD_RESPONSE = {
  bestBid: 30,
  bestAsk: 35,
  spread: 5,
};

const NULL_SPREAD = {
  bestBid: null,
  bestAsk: null,
  spread: null,
};

function makeOrderBookService(opts: {
  getOrderBook?: jest.Mock;
  getSpread?: jest.Mock;
} = {}) {
  return {
    getOrderBook: opts.getOrderBook ?? jest.fn().mockResolvedValue(EMPTY_ORDER_BOOK),
    getSpread: opts.getSpread ?? jest.fn().mockResolvedValue(NULL_SPREAD),
  };
}

function makeApp(serviceOpts?: Parameters<typeof makeOrderBookService>[0]) {
  const app = express();
  app.use(express.json());
  app.use(requestIdMiddleware);
  app.use('/orderbook', createOrderBookRouter({
    orderBookService: makeOrderBookService(serviceOpts) as never,
  }));
  app.use(errorHandler);
  return app;
}

// ─── GET /orderbook/:assetId ────────────────────────────────────────────────

describe('GET /orderbook/:assetId', () => {
  it('should return 200 with empty order book', async () => {
    const res = await request(makeApp()).get(`/orderbook/${ASSET_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data.assetId).toBe(ASSET_ID);
    expect(res.body.data.bids).toEqual([]);
    expect(res.body.data.asks).toEqual([]);
    expect(res.body.data.spread).toBeNull();
  });

  it('should return order book with bids and asks', async () => {
    const app = makeApp({
      getOrderBook: jest.fn().mockResolvedValue(ORDER_BOOK_WITH_DATA),
    });

    const res = await request(app).get(`/orderbook/${ASSET_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data.bids).toHaveLength(2);
    expect(res.body.data.asks).toHaveLength(1);
    expect(res.body.data.spread).toBe(5);
  });

  it('should pass assetId to service', async () => {
    const getOrderBook = jest.fn().mockResolvedValue(EMPTY_ORDER_BOOK);
    const app = makeApp({ getOrderBook });

    await request(app).get(`/orderbook/${ASSET_ID}`);

    expect(getOrderBook).toHaveBeenCalledWith(ASSET_ID);
  });

  it('should include price level details', async () => {
    const app = makeApp({
      getOrderBook: jest.fn().mockResolvedValue(ORDER_BOOK_WITH_DATA),
    });

    const res = await request(app).get(`/orderbook/${ASSET_ID}`);

    expect(res.body.data.bids[0]).toMatchObject({
      price: '30.00000000',
      quantity: '50.00000000',
      orderCount: 2,
    });
  });
});

// ─── GET /orderbook/:assetId/spread ─────────────────────────────────────────

describe('GET /orderbook/:assetId/spread', () => {
  it('should return 200 with null spread when no orders', async () => {
    const res = await request(makeApp()).get(`/orderbook/${ASSET_ID}/spread`);

    expect(res.status).toBe(200);
    expect(res.body.data.bestBid).toBeNull();
    expect(res.body.data.bestAsk).toBeNull();
    expect(res.body.data.spread).toBeNull();
  });

  it('should return spread data', async () => {
    const app = makeApp({
      getSpread: jest.fn().mockResolvedValue(SPREAD_RESPONSE),
    });

    const res = await request(app).get(`/orderbook/${ASSET_ID}/spread`);

    expect(res.status).toBe(200);
    expect(res.body.data.bestBid).toBe(30);
    expect(res.body.data.bestAsk).toBe(35);
    expect(res.body.data.spread).toBe(5);
  });

  it('should pass assetId to service', async () => {
    const getSpread = jest.fn().mockResolvedValue(NULL_SPREAD);
    const app = makeApp({ getSpread });

    await request(app).get(`/orderbook/${ASSET_ID}/spread`);

    expect(getSpread).toHaveBeenCalledWith(ASSET_ID);
  });
});
