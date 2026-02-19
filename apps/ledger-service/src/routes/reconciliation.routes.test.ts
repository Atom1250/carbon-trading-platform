import request from 'supertest';
import express from 'express';
import { createReconciliationRouter } from './reconciliation.routes';
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

const RUN_ID = 'a10e8400-e29b-41d4-a716-446655440001';

const RECONCILIATION_RUN = {
  id: RUN_ID,
  runType: 'daily',
  status: 'passed',
  totalAccounts: 5,
  totalDebits: '10000.00',
  totalCredits: '10000.00',
  varianceCount: 0,
  variances: null,
  tolerance: '0.01',
  startedAt: new Date(),
  completedAt: new Date(),
  createdAt: new Date(),
};

function makeReconciliationService(opts: {
  runReconciliation?: jest.Mock;
  getReconciliationById?: jest.Mock;
  getLatestReconciliation?: jest.Mock;
  listReconciliationRuns?: jest.Mock;
} = {}) {
  return {
    runReconciliation: opts.runReconciliation ?? jest.fn().mockResolvedValue(RECONCILIATION_RUN),
    getReconciliationById: opts.getReconciliationById ?? jest.fn().mockResolvedValue(RECONCILIATION_RUN),
    getLatestReconciliation: opts.getLatestReconciliation ?? jest.fn().mockResolvedValue(RECONCILIATION_RUN),
    listReconciliationRuns: opts.listReconciliationRuns ?? jest.fn().mockResolvedValue({ runs: [RECONCILIATION_RUN], total: 1 }),
  };
}

function makeApp(serviceOpts?: Parameters<typeof makeReconciliationService>[0]) {
  const app = express();
  app.use(express.json());
  app.use(requestIdMiddleware);
  app.use('/reconciliation', createReconciliationRouter({
    reconciliationService: makeReconciliationService(serviceOpts) as never,
  }));
  app.use(errorHandler);
  return app;
}

// ─── POST /reconciliation/run ───────────────────────────────────────────────

describe('POST /reconciliation/run', () => {
  it('should return 201 with reconciliation run', async () => {
    const res = await request(makeApp())
      .post('/reconciliation/run')
      .send({});

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('passed');
  });

  it('should pass runType to service', async () => {
    const runReconciliation = jest.fn().mockResolvedValue(RECONCILIATION_RUN);
    await request(makeApp({ runReconciliation }))
      .post('/reconciliation/run')
      .send({ runType: 'manual' });

    expect(runReconciliation).toHaveBeenCalledWith('manual');
  });

  it('should default to daily runType', async () => {
    const runReconciliation = jest.fn().mockResolvedValue(RECONCILIATION_RUN);
    await request(makeApp({ runReconciliation }))
      .post('/reconciliation/run')
      .send({});

    expect(runReconciliation).toHaveBeenCalledWith('daily');
  });
});

// ─── GET /reconciliation/latest ─────────────────────────────────────────────

describe('GET /reconciliation/latest', () => {
  it('should return 200 with latest run', async () => {
    const res = await request(makeApp()).get('/reconciliation/latest');

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(RUN_ID);
  });

  it('should return 200 with null when no runs exist', async () => {
    const getLatestReconciliation = jest.fn().mockResolvedValue(null);
    const res = await request(makeApp({ getLatestReconciliation })).get('/reconciliation/latest');

    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
  });
});

// ─── GET /reconciliation ────────────────────────────────────────────────────

describe('GET /reconciliation', () => {
  it('should return 200 with run list', async () => {
    const res = await request(makeApp()).get('/reconciliation');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.metadata.total).toBe(1);
  });

  it('should pass status filter to service', async () => {
    const listReconciliationRuns = jest.fn().mockResolvedValue({ runs: [], total: 0 });
    await request(makeApp({ listReconciliationRuns })).get('/reconciliation?status=failed');

    expect(listReconciliationRuns).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed' }),
    );
  });
});

// ─── GET /reconciliation/:id ────────────────────────────────────────────────

describe('GET /reconciliation/:id', () => {
  it('should return 200 with run details', async () => {
    const res = await request(makeApp()).get(`/reconciliation/${RUN_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(RUN_ID);
    expect(res.body.data.status).toBe('passed');
  });

  it('should pass id to service', async () => {
    const getReconciliationById = jest.fn().mockResolvedValue(RECONCILIATION_RUN);
    await request(makeApp({ getReconciliationById })).get(`/reconciliation/${RUN_ID}`);

    expect(getReconciliationById).toHaveBeenCalledWith(RUN_ID);
  });
});
