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

const RFQ_ID = '550e8400-e29b-41d4-a716-446655440000';
const ASSET_ID = '660e8400-e29b-41d4-a716-446655440000';
const INSTITUTION_ID = '770e8400-e29b-41d4-a716-446655440000';
const USER_ID = '880e8400-e29b-41d4-a716-446655440000';

const RFQ_RESPONSE = {
  id: RFQ_ID,
  assetId: ASSET_ID,
  requesterInstitutionId: INSTITUTION_ID,
  requesterUserId: USER_ID,
  side: 'buy',
  quantity: '100.00000000',
  status: 'open',
  expiresAt: new Date('2025-06-01T00:05:00Z').toISOString(),
  cancelledAt: null,
  cancellationReason: null,
  createdAt: new Date('2025-06-01T00:00:00Z').toISOString(),
  updatedAt: new Date('2025-06-01T00:00:00Z').toISOString(),
};

const CANCELLED_RFQ = {
  ...RFQ_RESPONSE,
  status: 'cancelled',
  cancelledAt: new Date('2025-06-01T00:01:00Z').toISOString(),
  cancellationReason: 'No longer needed',
};

function makeRfqService(opts: {
  createRFQ?: jest.Mock;
  findById?: jest.Mock;
  listRFQs?: jest.Mock;
  cancelRFQ?: jest.Mock;
  expireRFQs?: jest.Mock;
} = {}) {
  return {
    createRFQ: opts.createRFQ ?? jest.fn().mockResolvedValue(RFQ_RESPONSE),
    findById: opts.findById ?? jest.fn().mockResolvedValue(RFQ_RESPONSE),
    listRFQs: opts.listRFQs ?? jest.fn().mockResolvedValue({
      rfqs: [RFQ_RESPONSE],
      total: 1,
    }),
    cancelRFQ: opts.cancelRFQ ?? jest.fn().mockResolvedValue(CANCELLED_RFQ),
    expireRFQs: opts.expireRFQs ?? jest.fn().mockResolvedValue(0),
  };
}

function makeApp(rfqOpts?: Parameters<typeof makeRfqService>[0]) {
  return createApp({
    rfqService: makeRfqService(rfqOpts) as never,
  });
}

// ─── POST /rfq ──────────────────────────────────────────────────────────────

describe('POST /rfq', () => {
  it('should return 201 with RFQ on valid body', async () => {
    const res = await request(makeApp()).post('/rfq').send({
      assetId: ASSET_ID,
      requesterInstitutionId: INSTITUTION_ID,
      requesterUserId: USER_ID,
      side: 'buy',
      quantity: 100,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('open');
    expect(res.body.data.assetId).toBe(ASSET_ID);
  });

  it('should pass data to service', async () => {
    const createRFQ = jest.fn().mockResolvedValue(RFQ_RESPONSE);
    const app = makeApp({ createRFQ });

    await request(app).post('/rfq').send({
      assetId: ASSET_ID,
      requesterInstitutionId: INSTITUTION_ID,
      requesterUserId: USER_ID,
      side: 'sell',
      quantity: 50.5,
    });

    expect(createRFQ).toHaveBeenCalledWith(
      expect.objectContaining({
        assetId: ASSET_ID,
        side: 'sell',
        quantity: 50.5,
      }),
    );
  });

  it('should return 422 when assetId is missing', async () => {
    const res = await request(makeApp()).post('/rfq').send({
      requesterInstitutionId: INSTITUTION_ID,
      requesterUserId: USER_ID,
      side: 'buy',
      quantity: 100,
    });

    expect(res.status).toBe(422);
    expect(res.body.status).toBe(422);
  });

  it('should return 422 when assetId is not a valid UUID', async () => {
    const res = await request(makeApp()).post('/rfq').send({
      assetId: 'not-a-uuid',
      requesterInstitutionId: INSTITUTION_ID,
      requesterUserId: USER_ID,
      side: 'buy',
      quantity: 100,
    });

    expect(res.status).toBe(422);
  });

  it('should return 422 when side is invalid', async () => {
    const res = await request(makeApp()).post('/rfq').send({
      assetId: ASSET_ID,
      requesterInstitutionId: INSTITUTION_ID,
      requesterUserId: USER_ID,
      side: 'invalid',
      quantity: 100,
    });

    expect(res.status).toBe(422);
  });

  it('should return 422 when quantity is not positive', async () => {
    const res = await request(makeApp()).post('/rfq').send({
      assetId: ASSET_ID,
      requesterInstitutionId: INSTITUTION_ID,
      requesterUserId: USER_ID,
      side: 'buy',
      quantity: -10,
    });

    expect(res.status).toBe(422);
  });

  it('should return 422 when quantity is zero', async () => {
    const res = await request(makeApp()).post('/rfq').send({
      assetId: ASSET_ID,
      requesterInstitutionId: INSTITUTION_ID,
      requesterUserId: USER_ID,
      side: 'buy',
      quantity: 0,
    });

    expect(res.status).toBe(422);
  });

  it('should return 422 when requesterUserId is missing', async () => {
    const res = await request(makeApp()).post('/rfq').send({
      assetId: ASSET_ID,
      requesterInstitutionId: INSTITUTION_ID,
      side: 'buy',
      quantity: 100,
    });

    expect(res.status).toBe(422);
  });
});

// ─── GET /rfq ───────────────────────────────────────────────────────────────

describe('GET /rfq', () => {
  it('should return 200 with RFQ list', async () => {
    const res = await request(makeApp()).get('/rfq');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.metadata.total).toBe(1);
  });

  it('should include pagination metadata', async () => {
    const res = await request(makeApp()).get('/rfq?limit=10&offset=0');

    expect(res.body.metadata).toMatchObject({
      total: 1,
      limit: 10,
      offset: 0,
      hasMore: false,
    });
  });

  it('should pass filters to service', async () => {
    const listRFQs = jest.fn().mockResolvedValue({ rfqs: [], total: 0 });
    const app = makeApp({ listRFQs });

    await request(app).get(`/rfq?status=open&side=buy&assetId=${ASSET_ID}&institutionId=${INSTITUTION_ID}`);

    expect(listRFQs).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'open',
        side: 'buy',
        assetId: ASSET_ID,
        institutionId: INSTITUTION_ID,
      }),
    );
  });

  it('should use default limit and offset', async () => {
    const listRFQs = jest.fn().mockResolvedValue({ rfqs: [], total: 0 });
    const app = makeApp({ listRFQs });

    await request(app).get('/rfq');

    expect(listRFQs).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 20, offset: 0 }),
    );
  });

  it('should return 422 for invalid status filter', async () => {
    const res = await request(makeApp()).get('/rfq?status=unknown');

    expect(res.status).toBe(422);
  });

  it('should return 422 for invalid side filter', async () => {
    const res = await request(makeApp()).get('/rfq?side=invalid');

    expect(res.status).toBe(422);
  });
});

// ─── GET /rfq/:id ───────────────────────────────────────────────────────────

describe('GET /rfq/:id', () => {
  it('should return 200 with RFQ', async () => {
    const res = await request(makeApp()).get(`/rfq/${RFQ_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(RFQ_ID);
  });

  it('should return 404 when RFQ not found', async () => {
    const app = makeApp({
      findById: jest.fn().mockRejectedValue(new NotFoundError('RFQ Request', 'bad-id')),
    });

    const res = await request(app).get('/rfq/bad-id');

    expect(res.status).toBe(404);
    expect(res.body.status).toBe(404);
  });
});

// ─── POST /rfq/:id/cancel ──────────────────────────────────────────────────

describe('POST /rfq/:id/cancel', () => {
  it('should return 200 with cancelled RFQ', async () => {
    const res = await request(makeApp())
      .post(`/rfq/${RFQ_ID}/cancel`)
      .send({ cancellationReason: 'No longer needed' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('cancelled');
  });

  it('should accept empty body (no reason)', async () => {
    const res = await request(makeApp())
      .post(`/rfq/${RFQ_ID}/cancel`)
      .send({});

    expect(res.status).toBe(200);
  });

  it('should return 404 when RFQ not found', async () => {
    const app = makeApp({
      cancelRFQ: jest.fn().mockRejectedValue(new NotFoundError('RFQ Request', 'bad-id')),
    });

    const res = await request(app)
      .post('/rfq/bad-id/cancel')
      .send({});

    expect(res.status).toBe(404);
  });

  it('should return 422 when RFQ is not in open status', async () => {
    const app = makeApp({
      cancelRFQ: jest.fn().mockRejectedValue(
        new ValidationError("RFQ must be in 'open' status to cancel"),
      ),
    });

    const res = await request(app)
      .post(`/rfq/${RFQ_ID}/cancel`)
      .send({});

    expect(res.status).toBe(422);
  });
});
