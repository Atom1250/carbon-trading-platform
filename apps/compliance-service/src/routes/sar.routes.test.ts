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

const SAR_ID = '550e8400-e29b-41d4-a716-446655440000';
const INSTITUTION_ID = '660e8400-e29b-41d4-a716-446655440000';
const SUBJECT_ID = '770e8400-e29b-41d4-a716-446655440000';
const REVIEWER_ID = '880e8400-e29b-41d4-a716-446655440000';
const GENERATOR_ID = '990e8400-e29b-41d4-a716-446655440000';

const SAR_REPORT = {
  id: SAR_ID,
  institutionId: INSTITUTION_ID,
  subjectType: 'individual',
  subjectId: SUBJECT_ID,
  subjectName: 'John Doe',
  triggerType: 'aml_alert',
  triggerReferenceId: null,
  status: 'draft',
  suspiciousAmountUsd: '50000.00',
  activityStartDate: new Date('2025-01-01').toISOString(),
  activityEndDate: new Date('2025-01-15').toISOString(),
  narrative: 'Suspicious structuring pattern detected',
  supportingData: {},
  generatedBy: GENERATOR_ID,
  reviewedBy: null,
  reviewedAt: null,
  reviewNotes: null,
  filedAt: null,
  filingReference: null,
  filingConfirmation: null,
  createdAt: new Date('2025-01-01').toISOString(),
  updatedAt: new Date('2025-01-01').toISOString(),
};

const PENDING_SAR = { ...SAR_REPORT, status: 'pending_review' };
const APPROVED_SAR = { ...SAR_REPORT, status: 'approved', reviewedBy: REVIEWER_ID };

function makeScreeningService() {
  return {
    screenEntity: jest.fn(),
    findById: jest.fn(),
    getReviewQueue: jest.fn(),
    reviewScreening: jest.fn(),
  };
}

function makeSarService(opts: {
  generateSAR?: jest.Mock;
  findById?: jest.Mock;
  listSARs?: jest.Mock;
  submitSAR?: jest.Mock;
  reviewSAR?: jest.Mock;
  fileSAR?: jest.Mock;
} = {}) {
  return {
    generateSAR: opts.generateSAR ?? jest.fn().mockResolvedValue(SAR_REPORT),
    findById: opts.findById ?? jest.fn().mockResolvedValue(SAR_REPORT),
    listSARs: opts.listSARs ?? jest.fn().mockResolvedValue({
      reports: [SAR_REPORT],
      total: 1,
    }),
    submitSAR: opts.submitSAR ?? jest.fn().mockResolvedValue(PENDING_SAR),
    reviewSAR: opts.reviewSAR ?? jest.fn().mockResolvedValue(APPROVED_SAR),
    fileSAR: opts.fileSAR ?? jest.fn().mockResolvedValue({
      ...APPROVED_SAR,
      status: 'filed',
      filingReference: 'SAR-2025-001',
    }),
  };
}

function makeApp(sarOpts?: Parameters<typeof makeSarService>[0]) {
  return createApp({
    sanctionsScreeningService: makeScreeningService() as never,
    sarService: makeSarService(sarOpts) as never,
  });
}

// ─── POST /sar/generate ─────────────────────────────────────────────────────

describe('POST /sar/generate', () => {
  it('should return 201 with SAR report on valid body', async () => {
    const res = await request(makeApp()).post('/sar/generate').send({
      subjectType: 'individual',
      subjectId: SUBJECT_ID,
      subjectName: 'John Doe',
      triggerType: 'aml_alert',
      narrative: 'Suspicious structuring pattern detected',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.subjectName).toBe('John Doe');
    expect(res.body.data.status).toBe('draft');
  });

  it('should accept optional fields', async () => {
    const generateSAR = jest.fn().mockResolvedValue(SAR_REPORT);
    const app = makeApp({ generateSAR });

    await request(app).post('/sar/generate').send({
      institutionId: INSTITUTION_ID,
      subjectType: 'individual',
      subjectId: SUBJECT_ID,
      subjectName: 'John Doe',
      triggerType: 'aml_alert',
      suspiciousAmountUsd: 50000,
      activityStartDate: '2025-01-01',
      activityEndDate: '2025-01-15',
      narrative: 'Test',
      generatedBy: GENERATOR_ID,
    });

    expect(generateSAR).toHaveBeenCalledWith(
      expect.objectContaining({
        institutionId: INSTITUTION_ID,
        suspiciousAmountUsd: 50000,
        generatedBy: GENERATOR_ID,
      }),
    );
  });

  it('should return 422 when subjectName is missing', async () => {
    const res = await request(makeApp()).post('/sar/generate').send({
      subjectType: 'individual',
      subjectId: SUBJECT_ID,
      triggerType: 'aml_alert',
      narrative: 'Test',
    });

    expect(res.status).toBe(422);
    expect(res.body.status).toBe(422);
  });

  it('should return 422 when narrative is missing', async () => {
    const res = await request(makeApp()).post('/sar/generate').send({
      subjectType: 'individual',
      subjectId: SUBJECT_ID,
      subjectName: 'John Doe',
      triggerType: 'aml_alert',
    });

    expect(res.status).toBe(422);
  });

  it('should return 422 when triggerType is invalid', async () => {
    const res = await request(makeApp()).post('/sar/generate').send({
      subjectType: 'individual',
      subjectId: SUBJECT_ID,
      subjectName: 'John Doe',
      triggerType: 'invalid_trigger',
      narrative: 'Test',
    });

    expect(res.status).toBe(422);
  });

  it('should return 422 when subjectId is not a valid UUID', async () => {
    const res = await request(makeApp()).post('/sar/generate').send({
      subjectType: 'individual',
      subjectId: 'not-a-uuid',
      subjectName: 'John Doe',
      triggerType: 'aml_alert',
      narrative: 'Test',
    });

    expect(res.status).toBe(422);
  });
});

// ─── GET /sar ───────────────────────────────────────────────────────────────

describe('GET /sar', () => {
  it('should return 200 with SAR list', async () => {
    const res = await request(makeApp()).get('/sar');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.metadata.total).toBe(1);
  });

  it('should include pagination metadata', async () => {
    const res = await request(makeApp()).get('/sar?limit=10&offset=0');

    expect(res.body.metadata).toMatchObject({
      total: 1,
      limit: 10,
      offset: 0,
      hasMore: false,
    });
  });

  it('should pass filters to service', async () => {
    const listSARs = jest.fn().mockResolvedValue({ reports: [], total: 0 });
    const app = makeApp({ listSARs });

    await request(app).get(`/sar?status=draft&triggerType=aml_alert&institutionId=${INSTITUTION_ID}`);

    expect(listSARs).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'draft',
        triggerType: 'aml_alert',
        institutionId: INSTITUTION_ID,
      }),
    );
  });

  it('should use default limit and offset', async () => {
    const listSARs = jest.fn().mockResolvedValue({ reports: [], total: 0 });
    const app = makeApp({ listSARs });

    await request(app).get('/sar');

    expect(listSARs).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 20, offset: 0 }),
    );
  });

  it('should return 422 for invalid status filter', async () => {
    const res = await request(makeApp()).get('/sar?status=unknown');

    expect(res.status).toBe(422);
  });
});

// ─── GET /sar/:id ───────────────────────────────────────────────────────────

describe('GET /sar/:id', () => {
  it('should return 200 with SAR report', async () => {
    const res = await request(makeApp()).get(`/sar/${SAR_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(SAR_ID);
  });

  it('should return 404 when SAR not found', async () => {
    const app = makeApp({
      findById: jest.fn().mockRejectedValue(new NotFoundError('SAR Report', 'bad-id')),
    });

    const res = await request(app).get('/sar/bad-id');

    expect(res.status).toBe(404);
    expect(res.body.status).toBe(404);
  });
});

// ─── POST /sar/:id/submit ──────────────────────────────────────────────────

describe('POST /sar/:id/submit', () => {
  it('should return 200 with pending_review SAR', async () => {
    const res = await request(makeApp()).post(`/sar/${SAR_ID}/submit`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('pending_review');
  });

  it('should return 404 when SAR not found', async () => {
    const app = makeApp({
      submitSAR: jest.fn().mockRejectedValue(new NotFoundError('SAR Report', 'bad-id')),
    });

    const res = await request(app).post('/sar/bad-id/submit');

    expect(res.status).toBe(404);
  });

  it('should return 422 when SAR is not in draft status', async () => {
    const app = makeApp({
      submitSAR: jest.fn().mockRejectedValue(
        new ValidationError("SAR must be in 'draft' status to submit"),
      ),
    });

    const res = await request(app).post(`/sar/${SAR_ID}/submit`);

    expect(res.status).toBe(422);
  });
});

// ─── POST /sar/:id/review ──────────────────────────────────────────────────

describe('POST /sar/:id/review', () => {
  it('should return 200 with approved SAR', async () => {
    const res = await request(makeApp())
      .post(`/sar/${SAR_ID}/review`)
      .send({
        reviewedBy: REVIEWER_ID,
        status: 'approved',
        notes: 'Approved for filing',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('approved');
  });

  it('should return 200 with rejected SAR', async () => {
    const reviewSAR = jest.fn().mockResolvedValue({
      ...PENDING_SAR,
      status: 'rejected',
      reviewedBy: REVIEWER_ID,
    });
    const app = makeApp({ reviewSAR });

    const res = await request(app)
      .post(`/sar/${SAR_ID}/review`)
      .send({
        reviewedBy: REVIEWER_ID,
        status: 'rejected',
        notes: 'Insufficient evidence',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('rejected');
  });

  it('should return 422 when reviewedBy is missing', async () => {
    const res = await request(makeApp())
      .post(`/sar/${SAR_ID}/review`)
      .send({
        status: 'approved',
        notes: 'Test',
      });

    expect(res.status).toBe(422);
  });

  it('should return 422 when status is invalid', async () => {
    const res = await request(makeApp())
      .post(`/sar/${SAR_ID}/review`)
      .send({
        reviewedBy: REVIEWER_ID,
        status: 'unknown',
        notes: 'Test',
      });

    expect(res.status).toBe(422);
  });

  it('should return 422 when notes are empty', async () => {
    const res = await request(makeApp())
      .post(`/sar/${SAR_ID}/review`)
      .send({
        reviewedBy: REVIEWER_ID,
        status: 'approved',
        notes: '',
      });

    expect(res.status).toBe(422);
  });

  it('should return 404 when SAR not found', async () => {
    const app = makeApp({
      reviewSAR: jest.fn().mockRejectedValue(new NotFoundError('SAR Report', 'bad-id')),
    });

    const res = await request(app)
      .post('/sar/bad-id/review')
      .send({
        reviewedBy: REVIEWER_ID,
        status: 'approved',
        notes: 'Test',
      });

    expect(res.status).toBe(404);
  });
});

// ─── POST /sar/:id/file ────────────────────────────────────────────────────

describe('POST /sar/:id/file', () => {
  it('should return 200 with filed SAR', async () => {
    const res = await request(makeApp())
      .post(`/sar/${SAR_ID}/file`)
      .send({
        filingReference: 'SAR-2025-001',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('filed');
    expect(res.body.data.filingReference).toBe('SAR-2025-001');
  });

  it('should accept optional filingConfirmation', async () => {
    const fileSAR = jest.fn().mockResolvedValue({
      ...APPROVED_SAR,
      status: 'filed',
      filingReference: 'SAR-2025-001',
    });
    const app = makeApp({ fileSAR });

    const res = await request(app)
      .post(`/sar/${SAR_ID}/file`)
      .send({
        filingReference: 'SAR-2025-001',
        filingConfirmation: { confirmationNumber: 'CONF-123' },
      });

    expect(res.status).toBe(200);
    expect(fileSAR).toHaveBeenCalledWith(
      SAR_ID,
      expect.objectContaining({
        filingReference: 'SAR-2025-001',
        filingConfirmation: { confirmationNumber: 'CONF-123' },
      }),
    );
  });

  it('should return 422 when filingReference is missing', async () => {
    const res = await request(makeApp())
      .post(`/sar/${SAR_ID}/file`)
      .send({});

    expect(res.status).toBe(422);
  });

  it('should return 422 when filingReference is empty', async () => {
    const res = await request(makeApp())
      .post(`/sar/${SAR_ID}/file`)
      .send({ filingReference: '' });

    expect(res.status).toBe(422);
  });

  it('should return 404 when SAR not found', async () => {
    const app = makeApp({
      fileSAR: jest.fn().mockRejectedValue(new NotFoundError('SAR Report', 'bad-id')),
    });

    const res = await request(app)
      .post('/sar/bad-id/file')
      .send({ filingReference: 'SAR-001' });

    expect(res.status).toBe(404);
  });

  it('should return 422 when SAR is not in approved status', async () => {
    const app = makeApp({
      fileSAR: jest.fn().mockRejectedValue(
        new ValidationError("SAR must be in 'approved' status to file"),
      ),
    });

    const res = await request(app)
      .post(`/sar/${SAR_ID}/file`)
      .send({ filingReference: 'SAR-001' });

    expect(res.status).toBe(422);
  });
});
