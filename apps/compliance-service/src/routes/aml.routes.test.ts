import request from 'supertest';
import { createApp } from '../app';
import { NotFoundError, ValidationError } from '@libs/errors';

jest.mock('@libs/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

const ALERT_ID = '550e8400-e29b-41d4-a716-446655440000';
const TRANSACTION_ID = '660e8400-e29b-41d4-a716-446655440000';
const INSTITUTION_ID = '770e8400-e29b-41d4-a716-446655440000';
const USER_ID = '880e8400-e29b-41d4-a716-446655440000';
const INVESTIGATOR_ID = '990e8400-e29b-41d4-a716-446655440000';

const CLEAN_CHECK = {
  id: 'aa0e8400-e29b-41d4-a716-446655440000',
  transactionId: TRANSACTION_ID,
  institutionId: null,
  userId: null,
  amountUsd: '500.00',
  transactionType: 'transfer',
  counterpartyId: null,
  isSuspicious: false,
  riskScore: '0.00',
  rulesTriggered: [],
  alertId: null,
  checkedAt: new Date('2025-01-01').toISOString(),
};

const ALERT = {
  id: ALERT_ID,
  alertType: 'large_volume',
  severity: 'high',
  status: 'open',
  institutionId: INSTITUTION_ID,
  userId: USER_ID,
  description: 'Large transaction detected',
  transactionIds: [TRANSACTION_ID],
  totalAmountUsd: '150000.00',
  patternDetails: {},
  assignedTo: null,
  investigatedAt: null,
  investigationNotes: null,
  resolvedAt: null,
  resolutionNotes: null,
  createdAt: new Date('2025-01-01').toISOString(),
  updatedAt: new Date('2025-01-01').toISOString(),
};

function makeScreeningService() {
  return {
    screenEntity: jest.fn(),
    findById: jest.fn(),
    getReviewQueue: jest.fn(),
    reviewScreening: jest.fn(),
  };
}

function makeAMLService(opts: {
  checkTransaction?: jest.Mock;
  listAlerts?: jest.Mock;
  investigateAlert?: jest.Mock;
  resolveAlert?: jest.Mock;
} = {}) {
  return {
    checkTransaction: opts.checkTransaction ?? jest.fn().mockResolvedValue(CLEAN_CHECK),
    listAlerts: opts.listAlerts ?? jest.fn().mockResolvedValue({ alerts: [ALERT], total: 1 }),
    investigateAlert: opts.investigateAlert ?? jest.fn().mockResolvedValue({
      ...ALERT,
      status: 'under_investigation',
      assignedTo: INVESTIGATOR_ID,
    }),
    resolveAlert: opts.resolveAlert ?? jest.fn().mockResolvedValue({
      ...ALERT,
      status: 'resolved_suspicious',
    }),
  };
}

function makeApp(amlOpts?: Parameters<typeof makeAMLService>[0]) {
  return createApp({
    sanctionsScreeningService: makeScreeningService() as never,
    amlMonitoringService: makeAMLService(amlOpts) as never,
  });
}

// ─── POST /aml/check-transaction ──────────────────────────────────────────────

describe('POST /aml/check-transaction', () => {
  it('should return 200 with transaction check result', async () => {
    const res = await request(makeApp()).post('/aml/check-transaction').send({
      transactionId: TRANSACTION_ID,
      amountUsd: 500,
      transactionType: 'transfer',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.transactionId).toBe(TRANSACTION_ID);
    expect(res.body.data.isSuspicious).toBe(false);
  });

  it('should accept optional fields', async () => {
    const checkTransaction = jest.fn().mockResolvedValue(CLEAN_CHECK);
    const app = makeApp({ checkTransaction });

    await request(app).post('/aml/check-transaction').send({
      transactionId: TRANSACTION_ID,
      amountUsd: 500,
      transactionType: 'transfer',
      institutionId: INSTITUTION_ID,
      userId: USER_ID,
      counterpartyId: INVESTIGATOR_ID,
    });

    expect(checkTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        institutionId: INSTITUTION_ID,
        userId: USER_ID,
        counterpartyId: INVESTIGATOR_ID,
      }),
    );
  });

  it('should return 422 when transactionId is missing', async () => {
    const res = await request(makeApp()).post('/aml/check-transaction').send({
      amountUsd: 500,
      transactionType: 'transfer',
    });

    expect(res.status).toBe(422);
  });

  it('should return 422 when transactionId is not a UUID', async () => {
    const res = await request(makeApp()).post('/aml/check-transaction').send({
      transactionId: 'not-a-uuid',
      amountUsd: 500,
      transactionType: 'transfer',
    });

    expect(res.status).toBe(422);
  });

  it('should return 422 when amountUsd is missing', async () => {
    const res = await request(makeApp()).post('/aml/check-transaction').send({
      transactionId: TRANSACTION_ID,
      transactionType: 'transfer',
    });

    expect(res.status).toBe(422);
  });

  it('should return 422 when amountUsd is negative', async () => {
    const res = await request(makeApp()).post('/aml/check-transaction').send({
      transactionId: TRANSACTION_ID,
      amountUsd: -100,
      transactionType: 'transfer',
    });

    expect(res.status).toBe(422);
  });

  it('should return 422 when transactionType is empty', async () => {
    const res = await request(makeApp()).post('/aml/check-transaction').send({
      transactionId: TRANSACTION_ID,
      amountUsd: 500,
      transactionType: '',
    });

    expect(res.status).toBe(422);
  });
});

// ─── GET /aml/alerts ──────────────────────────────────────────────────────────

describe('GET /aml/alerts', () => {
  it('should return 200 with alerts list', async () => {
    const res = await request(makeApp()).get('/aml/alerts');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.metadata.total).toBe(1);
  });

  it('should include pagination metadata', async () => {
    const res = await request(makeApp()).get('/aml/alerts?limit=10&offset=0');

    expect(res.body.metadata).toMatchObject({
      total: 1,
      limit: 10,
      offset: 0,
      hasMore: false,
    });
  });

  it('should pass filters to service', async () => {
    const listAlerts = jest.fn().mockResolvedValue({ alerts: [], total: 0 });
    const app = makeApp({ listAlerts });

    await request(app).get('/aml/alerts?status=open&severity=high&alertType=large_volume');

    expect(listAlerts).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'open',
        severity: 'high',
        alertType: 'large_volume',
      }),
    );
  });

  it('should return 422 for invalid status filter', async () => {
    const res = await request(makeApp()).get('/aml/alerts?status=invalid');

    expect(res.status).toBe(422);
  });

  it('should return 422 for invalid severity filter', async () => {
    const res = await request(makeApp()).get('/aml/alerts?severity=invalid');

    expect(res.status).toBe(422);
  });
});

// ─── POST /aml/alerts/:id/investigate ─────────────────────────────────────────

describe('POST /aml/alerts/:id/investigate', () => {
  it('should return 200 with updated alert', async () => {
    const res = await request(makeApp())
      .post(`/aml/alerts/${ALERT_ID}/investigate`)
      .send({
        assignedTo: INVESTIGATOR_ID,
        notes: 'Starting investigation',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('under_investigation');
  });

  it('should return 422 when assignedTo is missing', async () => {
    const res = await request(makeApp())
      .post(`/aml/alerts/${ALERT_ID}/investigate`)
      .send({ notes: 'Test' });

    expect(res.status).toBe(422);
  });

  it('should return 422 when assignedTo is not a UUID', async () => {
    const res = await request(makeApp())
      .post(`/aml/alerts/${ALERT_ID}/investigate`)
      .send({ assignedTo: 'not-a-uuid', notes: 'Test' });

    expect(res.status).toBe(422);
  });

  it('should return 422 when notes are empty', async () => {
    const res = await request(makeApp())
      .post(`/aml/alerts/${ALERT_ID}/investigate`)
      .send({ assignedTo: INVESTIGATOR_ID, notes: '' });

    expect(res.status).toBe(422);
  });

  it('should return 404 when alert not found', async () => {
    const app = makeApp({
      investigateAlert: jest.fn().mockRejectedValue(new NotFoundError('AML Alert', 'bad-id')),
    });

    const res = await request(app)
      .post('/aml/alerts/bad-id/investigate')
      .send({ assignedTo: INVESTIGATOR_ID, notes: 'Test' });

    expect(res.status).toBe(404);
  });

  it('should return 422 when alert is already resolved', async () => {
    const app = makeApp({
      investigateAlert: jest.fn().mockRejectedValue(
        new ValidationError("Alert must be in 'open' or 'escalated' status to investigate"),
      ),
    });

    const res = await request(app)
      .post(`/aml/alerts/${ALERT_ID}/investigate`)
      .send({ assignedTo: INVESTIGATOR_ID, notes: 'Test' });

    expect(res.status).toBe(422);
  });
});

// ─── POST /aml/alerts/:id/resolve ─────────────────────────────────────────────

describe('POST /aml/alerts/:id/resolve', () => {
  it('should return 200 with resolved alert', async () => {
    const res = await request(makeApp())
      .post(`/aml/alerts/${ALERT_ID}/resolve`)
      .send({
        status: 'resolved_suspicious',
        notes: 'SAR filed',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('resolved_suspicious');
  });

  it('should accept resolved_legitimate status', async () => {
    const resolveAlert = jest.fn().mockResolvedValue({
      ...ALERT,
      status: 'resolved_legitimate',
    });
    const app = makeApp({ resolveAlert });

    const res = await request(app)
      .post(`/aml/alerts/${ALERT_ID}/resolve`)
      .send({
        status: 'resolved_legitimate',
        notes: 'Verified legitimate',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('resolved_legitimate');
  });

  it('should return 422 when status is invalid', async () => {
    const res = await request(makeApp())
      .post(`/aml/alerts/${ALERT_ID}/resolve`)
      .send({ status: 'open', notes: 'Test' });

    expect(res.status).toBe(422);
  });

  it('should return 422 when notes are empty', async () => {
    const res = await request(makeApp())
      .post(`/aml/alerts/${ALERT_ID}/resolve`)
      .send({ status: 'resolved_suspicious', notes: '' });

    expect(res.status).toBe(422);
  });

  it('should return 404 when alert not found', async () => {
    const app = makeApp({
      resolveAlert: jest.fn().mockRejectedValue(new NotFoundError('AML Alert', 'bad-id')),
    });

    const res = await request(app)
      .post('/aml/alerts/bad-id/resolve')
      .send({ status: 'resolved_suspicious', notes: 'Test' });

    expect(res.status).toBe(404);
  });

  it('should return 422 when alert is not under_investigation', async () => {
    const app = makeApp({
      resolveAlert: jest.fn().mockRejectedValue(
        new ValidationError("Alert must be in 'under_investigation' status to resolve"),
      ),
    });

    const res = await request(app)
      .post(`/aml/alerts/${ALERT_ID}/resolve`)
      .send({ status: 'resolved_suspicious', notes: 'Test' });

    expect(res.status).toBe(422);
  });
});
