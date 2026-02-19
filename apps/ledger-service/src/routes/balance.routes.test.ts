import request from 'supertest';
import express from 'express';
import { createBalanceRouter } from './balance.routes';
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

const ACCOUNT_ID = 'a10e8400-e29b-41d4-a716-446655440001';

const ACCOUNT_BALANCE = {
  accountId: ACCOUNT_ID,
  accountCode: '1000',
  accountName: 'Cash',
  category: 'asset',
  totalDebits: '500.00',
  totalCredits: '200.00',
  balance: '300.00',
};

const BALANCE_SUMMARY = {
  totalAssets: '800.00',
  totalLiabilities: '450.00',
  totalRevenue: '300.00',
  totalExpenses: '100.00',
  netPosition: '250.00',
  accountCount: 7,
  asOf: new Date(),
};

function makeBalanceService(opts: {
  getAccountBalance?: jest.Mock;
  getBalanceSummary?: jest.Mock;
  getBalancesByCategory?: jest.Mock;
  invalidateCache?: jest.Mock;
} = {}) {
  return {
    getAccountBalance: opts.getAccountBalance ?? jest.fn().mockResolvedValue(ACCOUNT_BALANCE),
    getBalanceSummary: opts.getBalanceSummary ?? jest.fn().mockResolvedValue(BALANCE_SUMMARY),
    getBalancesByCategory: opts.getBalancesByCategory ?? jest.fn().mockResolvedValue([ACCOUNT_BALANCE]),
    invalidateCache: opts.invalidateCache ?? jest.fn().mockResolvedValue(undefined),
  };
}

function makeApp(serviceOpts?: Parameters<typeof makeBalanceService>[0]) {
  const app = express();
  app.use(express.json());
  app.use(requestIdMiddleware);
  app.use('/balances', createBalanceRouter({
    balanceService: makeBalanceService(serviceOpts) as never,
  }));
  app.use(errorHandler);
  return app;
}

// ─── GET /balances/summary ──────────────────────────────────────────────────

describe('GET /balances/summary', () => {
  it('should return 200 with balance summary', async () => {
    const res = await request(makeApp()).get('/balances/summary');

    expect(res.status).toBe(200);
    expect(res.body.data.totalAssets).toBe('800.00');
    expect(res.body.data.netPosition).toBe('250.00');
  });

  it('should call service', async () => {
    const getBalanceSummary = jest.fn().mockResolvedValue(BALANCE_SUMMARY);
    await request(makeApp({ getBalanceSummary })).get('/balances/summary');

    expect(getBalanceSummary).toHaveBeenCalled();
  });
});

// ─── GET /balances/category/:category ───────────────────────────────────────

describe('GET /balances/category/:category', () => {
  it('should return 200 with balances for category', async () => {
    const res = await request(makeApp()).get('/balances/category/asset');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].balance).toBe('300.00');
  });

  it('should return 422 for invalid category', async () => {
    const res = await request(makeApp()).get('/balances/category/invalid');

    expect(res.status).toBe(422);
  });

  it('should pass category to service', async () => {
    const getBalancesByCategory = jest.fn().mockResolvedValue([]);
    await request(makeApp({ getBalancesByCategory })).get('/balances/category/revenue');

    expect(getBalancesByCategory).toHaveBeenCalledWith('revenue');
  });
});

// ─── GET /balances/:accountId ───────────────────────────────────────────────

describe('GET /balances/:accountId', () => {
  it('should return 200 with account balance', async () => {
    const res = await request(makeApp()).get(`/balances/${ACCOUNT_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data.balance).toBe('300.00');
  });

  it('should pass accountId to service', async () => {
    const getAccountBalance = jest.fn().mockResolvedValue(ACCOUNT_BALANCE);
    await request(makeApp({ getAccountBalance })).get(`/balances/${ACCOUNT_ID}`);

    expect(getAccountBalance).toHaveBeenCalledWith(ACCOUNT_ID);
  });
});

// ─── POST /balances/invalidate ──────────────────────────────────────────────

describe('POST /balances/invalidate', () => {
  it('should return 200 on successful invalidation', async () => {
    const res = await request(makeApp())
      .post('/balances/invalidate')
      .send({ accountId: ACCOUNT_ID });

    expect(res.status).toBe(200);
    expect(res.body.data.message).toBe('Cache invalidated');
  });

  it('should pass accountId to service', async () => {
    const invalidateCache = jest.fn().mockResolvedValue(undefined);
    await request(makeApp({ invalidateCache }))
      .post('/balances/invalidate')
      .send({ accountId: ACCOUNT_ID });

    expect(invalidateCache).toHaveBeenCalledWith(ACCOUNT_ID);
  });

  it('should work without accountId', async () => {
    const invalidateCache = jest.fn().mockResolvedValue(undefined);
    await request(makeApp({ invalidateCache }))
      .post('/balances/invalidate')
      .send({});

    expect(invalidateCache).toHaveBeenCalledWith(undefined);
  });
});
