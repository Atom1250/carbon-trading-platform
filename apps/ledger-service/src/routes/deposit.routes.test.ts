import request from 'supertest';
import express from 'express';
import { createDepositRouter } from './deposit.routes';
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

const INSTITUTION_ID = 'a10e8400-e29b-41d4-a716-446655440001';
const USER_ID = 'b10e8400-e29b-41d4-a716-446655440002';
const DEPOSIT_ID = 'c10e8400-e29b-41d4-a716-446655440003';

const DEPOSIT = {
  id: DEPOSIT_ID,
  institutionId: INSTITUTION_ID,
  userId: USER_ID,
  method: 'wire',
  status: 'pending',
  amount: '5000.00',
  currency: 'USD',
  externalReference: 'WIRE-123',
  stripePaymentIntent: null,
  description: null,
  journalEntryId: null,
  failureReason: null,
  completedAt: null,
  failedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const COMPLETED_DEPOSIT = {
  ...DEPOSIT,
  status: 'completed',
  completedAt: new Date(),
};

function makeDepositService(opts: {
  initiateDeposit?: jest.Mock;
  completeDeposit?: jest.Mock;
  failDeposit?: jest.Mock;
  cancelDeposit?: jest.Mock;
  findById?: jest.Mock;
  listDeposits?: jest.Mock;
  getDepositsByInstitution?: jest.Mock;
} = {}) {
  return {
    initiateDeposit: opts.initiateDeposit ?? jest.fn().mockResolvedValue(DEPOSIT),
    completeDeposit: opts.completeDeposit ?? jest.fn().mockResolvedValue(COMPLETED_DEPOSIT),
    failDeposit: opts.failDeposit ?? jest.fn().mockResolvedValue({ ...DEPOSIT, status: 'failed' }),
    cancelDeposit: opts.cancelDeposit ?? jest.fn().mockResolvedValue({ ...DEPOSIT, status: 'cancelled' }),
    findById: opts.findById ?? jest.fn().mockResolvedValue(DEPOSIT),
    listDeposits: opts.listDeposits ?? jest.fn().mockResolvedValue({ deposits: [DEPOSIT], total: 1 }),
    getDepositsByInstitution: opts.getDepositsByInstitution ?? jest.fn().mockResolvedValue({ deposits: [DEPOSIT], total: 1 }),
  };
}

function makeApp(serviceOpts?: Parameters<typeof makeDepositService>[0]) {
  const app = express();
  app.use(express.json());
  app.use(requestIdMiddleware);
  app.use('/deposits', createDepositRouter({
    depositService: makeDepositService(serviceOpts) as never,
  }));
  app.use(errorHandler);
  return app;
}

// ─── POST /deposits ──────────────────────────────────────────────────────────

describe('POST /deposits', () => {
  it('should return 201 with created deposit', async () => {
    const res = await request(makeApp())
      .post('/deposits')
      .send({
        institutionId: INSTITUTION_ID,
        userId: USER_ID,
        method: 'wire',
        amount: 5000,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('pending');
  });

  it('should return 422 for missing institutionId', async () => {
    const res = await request(makeApp())
      .post('/deposits')
      .send({
        userId: USER_ID,
        method: 'wire',
        amount: 5000,
      });

    expect(res.status).toBe(422);
  });

  it('should return 422 for invalid method', async () => {
    const res = await request(makeApp())
      .post('/deposits')
      .send({
        institutionId: INSTITUTION_ID,
        userId: USER_ID,
        method: 'bitcoin',
        amount: 5000,
      });

    expect(res.status).toBe(422);
  });

  it('should return 422 for negative amount', async () => {
    const res = await request(makeApp())
      .post('/deposits')
      .send({
        institutionId: INSTITUTION_ID,
        userId: USER_ID,
        method: 'wire',
        amount: -100,
      });

    expect(res.status).toBe(422);
  });

  it('should pass data to service', async () => {
    const initiateDeposit = jest.fn().mockResolvedValue(DEPOSIT);
    await request(makeApp({ initiateDeposit }))
      .post('/deposits')
      .send({
        institutionId: INSTITUTION_ID,
        userId: USER_ID,
        method: 'wire',
        amount: 5000,
        description: 'Test deposit',
      });

    expect(initiateDeposit).toHaveBeenCalledWith(
      expect.objectContaining({
        institutionId: INSTITUTION_ID,
        method: 'wire',
        amount: 5000,
        description: 'Test deposit',
      }),
    );
  });
});

// ─── GET /deposits ───────────────────────────────────────────────────────────

describe('GET /deposits', () => {
  it('should return 200 with deposit list', async () => {
    const res = await request(makeApp()).get('/deposits');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.metadata.total).toBe(1);
  });

  it('should pass status filter to service', async () => {
    const listDeposits = jest.fn().mockResolvedValue({ deposits: [], total: 0 });
    await request(makeApp({ listDeposits })).get('/deposits?status=completed');

    expect(listDeposits).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed' }),
    );
  });

  it('should pass method filter to service', async () => {
    const listDeposits = jest.fn().mockResolvedValue({ deposits: [], total: 0 });
    await request(makeApp({ listDeposits })).get('/deposits?method=wire');

    expect(listDeposits).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'wire' }),
    );
  });
});

// ─── GET /deposits/:id ──────────────────────────────────────────────────────

describe('GET /deposits/:id', () => {
  it('should return 200 with deposit details', async () => {
    const res = await request(makeApp()).get(`/deposits/${DEPOSIT_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(DEPOSIT_ID);
  });

  it('should pass id to service', async () => {
    const findById = jest.fn().mockResolvedValue(DEPOSIT);
    await request(makeApp({ findById })).get(`/deposits/${DEPOSIT_ID}`);

    expect(findById).toHaveBeenCalledWith(DEPOSIT_ID);
  });
});

// ─── POST /deposits/:id/complete ─────────────────────────────────────────────

describe('POST /deposits/:id/complete', () => {
  it('should return 200 with completed deposit', async () => {
    const res = await request(makeApp())
      .post(`/deposits/${DEPOSIT_ID}/complete`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('completed');
  });

  it('should pass id to service', async () => {
    const completeDeposit = jest.fn().mockResolvedValue(COMPLETED_DEPOSIT);
    await request(makeApp({ completeDeposit }))
      .post(`/deposits/${DEPOSIT_ID}/complete`)
      .send({});

    expect(completeDeposit).toHaveBeenCalledWith(DEPOSIT_ID);
  });
});

// ─── POST /deposits/:id/fail ─────────────────────────────────────────────────

describe('POST /deposits/:id/fail', () => {
  it('should return 200 with failed deposit', async () => {
    const res = await request(makeApp())
      .post(`/deposits/${DEPOSIT_ID}/fail`)
      .send({ reason: 'Insufficient funds' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('failed');
  });

  it('should return 422 for missing reason', async () => {
    const res = await request(makeApp())
      .post(`/deposits/${DEPOSIT_ID}/fail`)
      .send({});

    expect(res.status).toBe(422);
  });

  it('should pass id and reason to service', async () => {
    const failDeposit = jest.fn().mockResolvedValue({ ...DEPOSIT, status: 'failed' });
    await request(makeApp({ failDeposit }))
      .post(`/deposits/${DEPOSIT_ID}/fail`)
      .send({ reason: 'Card declined' });

    expect(failDeposit).toHaveBeenCalledWith(DEPOSIT_ID, 'Card declined');
  });
});

// ─── POST /deposits/:id/cancel ───────────────────────────────────────────────

describe('POST /deposits/:id/cancel', () => {
  it('should return 200 with cancelled deposit', async () => {
    const res = await request(makeApp())
      .post(`/deposits/${DEPOSIT_ID}/cancel`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('cancelled');
  });

  it('should pass id to service', async () => {
    const cancelDeposit = jest.fn().mockResolvedValue({ ...DEPOSIT, status: 'cancelled' });
    await request(makeApp({ cancelDeposit }))
      .post(`/deposits/${DEPOSIT_ID}/cancel`)
      .send({});

    expect(cancelDeposit).toHaveBeenCalledWith(DEPOSIT_ID);
  });
});

// ─── GET /deposits/institution/:institutionId ────────────────────────────────

describe('GET /deposits/institution/:institutionId', () => {
  it('should return 200 with institution deposits', async () => {
    const res = await request(makeApp()).get(`/deposits/institution/${INSTITUTION_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.metadata.total).toBe(1);
  });

  it('should pass institutionId to service', async () => {
    const getDepositsByInstitution = jest.fn().mockResolvedValue({ deposits: [], total: 0 });
    await request(makeApp({ getDepositsByInstitution })).get(`/deposits/institution/${INSTITUTION_ID}`);

    expect(getDepositsByInstitution).toHaveBeenCalledWith(INSTITUTION_ID, { limit: 20, offset: 0 });
  });
});
