import request from 'supertest';
import express from 'express';
import { createWithdrawalRouter } from './withdrawal.routes';
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
const WITHDRAWAL_ID = 'c10e8400-e29b-41d4-a716-446655440003';
const APPROVER_ID = 'd10e8400-e29b-41d4-a716-446655440004';

const WITHDRAWAL = {
  id: WITHDRAWAL_ID,
  institutionId: INSTITUTION_ID,
  userId: USER_ID,
  method: 'wire',
  status: 'pending_approval',
  amount: '10000.00',
  feeAmount: '50.00',
  netAmount: '9950.00',
  currency: 'USD',
  externalReference: null,
  description: null,
  journalEntryId: null,
  feeJournalEntryId: null,
  requiresApproval: false,
  approvedBy: null,
  approvedAt: null,
  rejectedBy: null,
  rejectedAt: null,
  rejectionReason: null,
  failureReason: null,
  completedAt: null,
  failedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const APPROVED_WITHDRAWAL = {
  ...WITHDRAWAL,
  status: 'approved',
  approvedBy: APPROVER_ID,
  approvedAt: new Date(),
};

function makeWithdrawalService(opts: {
  requestWithdrawal?: jest.Mock;
  approveWithdrawal?: jest.Mock;
  rejectWithdrawal?: jest.Mock;
  processWithdrawal?: jest.Mock;
  failWithdrawal?: jest.Mock;
  findById?: jest.Mock;
  listWithdrawals?: jest.Mock;
  getPendingApprovals?: jest.Mock;
} = {}) {
  return {
    requestWithdrawal: opts.requestWithdrawal ?? jest.fn().mockResolvedValue(WITHDRAWAL),
    approveWithdrawal: opts.approveWithdrawal ?? jest.fn().mockResolvedValue(APPROVED_WITHDRAWAL),
    rejectWithdrawal: opts.rejectWithdrawal ?? jest.fn().mockResolvedValue({ ...WITHDRAWAL, status: 'rejected' }),
    processWithdrawal: opts.processWithdrawal ?? jest.fn().mockResolvedValue({ ...WITHDRAWAL, status: 'completed' }),
    failWithdrawal: opts.failWithdrawal ?? jest.fn().mockResolvedValue({ ...WITHDRAWAL, status: 'failed' }),
    findById: opts.findById ?? jest.fn().mockResolvedValue(WITHDRAWAL),
    listWithdrawals: opts.listWithdrawals ?? jest.fn().mockResolvedValue({ withdrawals: [WITHDRAWAL], total: 1 }),
    getPendingApprovals: opts.getPendingApprovals ?? jest.fn().mockResolvedValue({ withdrawals: [WITHDRAWAL], total: 1 }),
  };
}

function makeApp(serviceOpts?: Parameters<typeof makeWithdrawalService>[0]) {
  const app = express();
  app.use(express.json());
  app.use(requestIdMiddleware);
  app.use('/withdrawals', createWithdrawalRouter({
    withdrawalService: makeWithdrawalService(serviceOpts) as never,
  }));
  app.use(errorHandler);
  return app;
}

// ─── POST /withdrawals ──────────────────────────────────────────────────────

describe('POST /withdrawals', () => {
  it('should return 201 with created withdrawal', async () => {
    const res = await request(makeApp())
      .post('/withdrawals')
      .send({
        institutionId: INSTITUTION_ID,
        userId: USER_ID,
        method: 'wire',
        amount: 10000,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('pending_approval');
  });

  it('should return 422 for missing institutionId', async () => {
    const res = await request(makeApp())
      .post('/withdrawals')
      .send({
        userId: USER_ID,
        method: 'wire',
        amount: 10000,
      });

    expect(res.status).toBe(422);
  });

  it('should return 422 for invalid method', async () => {
    const res = await request(makeApp())
      .post('/withdrawals')
      .send({
        institutionId: INSTITUTION_ID,
        userId: USER_ID,
        method: 'card',
        amount: 10000,
      });

    expect(res.status).toBe(422);
  });

  it('should return 422 for negative amount', async () => {
    const res = await request(makeApp())
      .post('/withdrawals')
      .send({
        institutionId: INSTITUTION_ID,
        userId: USER_ID,
        method: 'wire',
        amount: -100,
      });

    expect(res.status).toBe(422);
  });

  it('should pass data to service', async () => {
    const requestWithdrawal = jest.fn().mockResolvedValue(WITHDRAWAL);
    await request(makeApp({ requestWithdrawal }))
      .post('/withdrawals')
      .send({
        institutionId: INSTITUTION_ID,
        userId: USER_ID,
        method: 'wire',
        amount: 10000,
        description: 'Test withdrawal',
      });

    expect(requestWithdrawal).toHaveBeenCalledWith(
      expect.objectContaining({
        institutionId: INSTITUTION_ID,
        method: 'wire',
        amount: 10000,
        description: 'Test withdrawal',
      }),
    );
  });
});

// ─── GET /withdrawals ───────────────────────────────────────────────────────

describe('GET /withdrawals', () => {
  it('should return 200 with withdrawal list', async () => {
    const res = await request(makeApp()).get('/withdrawals');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.metadata.total).toBe(1);
  });

  it('should pass status filter to service', async () => {
    const listWithdrawals = jest.fn().mockResolvedValue({ withdrawals: [], total: 0 });
    await request(makeApp({ listWithdrawals })).get('/withdrawals?status=approved');

    expect(listWithdrawals).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'approved' }),
    );
  });

  it('should pass method filter to service', async () => {
    const listWithdrawals = jest.fn().mockResolvedValue({ withdrawals: [], total: 0 });
    await request(makeApp({ listWithdrawals })).get('/withdrawals?method=ach');

    expect(listWithdrawals).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'ach' }),
    );
  });
});

// ─── GET /withdrawals/pending ───────────────────────────────────────────────

describe('GET /withdrawals/pending', () => {
  it('should return 200 with pending withdrawals', async () => {
    const res = await request(makeApp()).get('/withdrawals/pending');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.metadata.total).toBe(1);
  });

  it('should call getPendingApprovals on service', async () => {
    const getPendingApprovals = jest.fn().mockResolvedValue({ withdrawals: [], total: 0 });
    await request(makeApp({ getPendingApprovals })).get('/withdrawals/pending');

    expect(getPendingApprovals).toHaveBeenCalled();
  });
});

// ─── GET /withdrawals/:id ───────────────────────────────────────────────────

describe('GET /withdrawals/:id', () => {
  it('should return 200 with withdrawal details', async () => {
    const res = await request(makeApp()).get(`/withdrawals/${WITHDRAWAL_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(WITHDRAWAL_ID);
  });

  it('should pass id to service', async () => {
    const findById = jest.fn().mockResolvedValue(WITHDRAWAL);
    await request(makeApp({ findById })).get(`/withdrawals/${WITHDRAWAL_ID}`);

    expect(findById).toHaveBeenCalledWith(WITHDRAWAL_ID);
  });
});

// ─── POST /withdrawals/:id/approve ──────────────────────────────────────────

describe('POST /withdrawals/:id/approve', () => {
  it('should return 200 with approved withdrawal', async () => {
    const res = await request(makeApp())
      .post(`/withdrawals/${WITHDRAWAL_ID}/approve`)
      .send({ approvedBy: APPROVER_ID });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('approved');
  });

  it('should return 422 for missing approvedBy', async () => {
    const res = await request(makeApp())
      .post(`/withdrawals/${WITHDRAWAL_ID}/approve`)
      .send({});

    expect(res.status).toBe(422);
  });

  it('should pass id and approvedBy to service', async () => {
    const approveWithdrawal = jest.fn().mockResolvedValue(APPROVED_WITHDRAWAL);
    await request(makeApp({ approveWithdrawal }))
      .post(`/withdrawals/${WITHDRAWAL_ID}/approve`)
      .send({ approvedBy: APPROVER_ID });

    expect(approveWithdrawal).toHaveBeenCalledWith(WITHDRAWAL_ID, APPROVER_ID);
  });
});

// ─── POST /withdrawals/:id/reject ───────────────────────────────────────────

describe('POST /withdrawals/:id/reject', () => {
  it('should return 200 with rejected withdrawal', async () => {
    const res = await request(makeApp())
      .post(`/withdrawals/${WITHDRAWAL_ID}/reject`)
      .send({ rejectedBy: APPROVER_ID, reason: 'Insufficient documentation' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('rejected');
  });

  it('should return 422 for missing reason', async () => {
    const res = await request(makeApp())
      .post(`/withdrawals/${WITHDRAWAL_ID}/reject`)
      .send({ rejectedBy: APPROVER_ID });

    expect(res.status).toBe(422);
  });

  it('should pass id, rejectedBy, and reason to service', async () => {
    const rejectWithdrawal = jest.fn().mockResolvedValue({ ...WITHDRAWAL, status: 'rejected' });
    await request(makeApp({ rejectWithdrawal }))
      .post(`/withdrawals/${WITHDRAWAL_ID}/reject`)
      .send({ rejectedBy: APPROVER_ID, reason: 'Policy violation' });

    expect(rejectWithdrawal).toHaveBeenCalledWith(WITHDRAWAL_ID, APPROVER_ID, 'Policy violation');
  });
});

// ─── POST /withdrawals/:id/process ──────────────────────────────────────────

describe('POST /withdrawals/:id/process', () => {
  it('should return 200 with completed withdrawal', async () => {
    const res = await request(makeApp())
      .post(`/withdrawals/${WITHDRAWAL_ID}/process`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('completed');
  });

  it('should pass id to service', async () => {
    const processWithdrawal = jest.fn().mockResolvedValue({ ...WITHDRAWAL, status: 'completed' });
    await request(makeApp({ processWithdrawal }))
      .post(`/withdrawals/${WITHDRAWAL_ID}/process`)
      .send({});

    expect(processWithdrawal).toHaveBeenCalledWith(WITHDRAWAL_ID);
  });
});

// ─── POST /withdrawals/:id/fail ─────────────────────────────────────────────

describe('POST /withdrawals/:id/fail', () => {
  it('should return 200 with failed withdrawal', async () => {
    const res = await request(makeApp())
      .post(`/withdrawals/${WITHDRAWAL_ID}/fail`)
      .send({ reason: 'Bank rejected transfer' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('failed');
  });

  it('should return 422 for missing reason', async () => {
    const res = await request(makeApp())
      .post(`/withdrawals/${WITHDRAWAL_ID}/fail`)
      .send({});

    expect(res.status).toBe(422);
  });

  it('should pass id and reason to service', async () => {
    const failWithdrawal = jest.fn().mockResolvedValue({ ...WITHDRAWAL, status: 'failed' });
    await request(makeApp({ failWithdrawal }))
      .post(`/withdrawals/${WITHDRAWAL_ID}/fail`)
      .send({ reason: 'Network error' });

    expect(failWithdrawal).toHaveBeenCalledWith(WITHDRAWAL_ID, 'Network error');
  });
});
