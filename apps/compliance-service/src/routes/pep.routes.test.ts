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

const PEP_CHECK_ID = '550e8400-e29b-41d4-a716-446655440000';
const INSTITUTION_ID = '660e8400-e29b-41d4-a716-446655440000';
const BENEFICIAL_OWNER_ID = '770e8400-e29b-41d4-a716-446655440000';
const REVIEWER_ID = '880e8400-e29b-41d4-a716-446655440000';

const PEP_CHECK = {
  id: PEP_CHECK_ID,
  beneficialOwnerId: null,
  individualName: 'John Smith',
  dateOfBirth: null,
  nationality: null,
  institutionId: null,
  status: 'clear',
  isPep: false,
  pepCategory: null,
  pepDetails: null,
  riskLevel: 'low',
  checkedBy: null,
  reviewedBy: null,
  reviewedAt: null,
  reviewNotes: null,
  eddRequired: false,
  eddCompletedAt: null,
  eddNotes: null,
  createdAt: new Date('2025-01-01').toISOString(),
  updatedAt: new Date('2025-01-01').toISOString(),
};

const PEP_IDENTIFIED = {
  ...PEP_CHECK,
  status: 'pep_identified',
  isPep: true,
  pepCategory: 'government_official',
  riskLevel: 'high',
  eddRequired: true,
};

// Minimal mock for the required sanctionsScreeningService
function makeScreeningService() {
  return {
    screenEntity: jest.fn(),
    findById: jest.fn(),
    getReviewQueue: jest.fn(),
    reviewScreening: jest.fn(),
  };
}

function makePepService(opts: {
  checkIndividual?: jest.Mock;
  findById?: jest.Mock;
  listChecks?: jest.Mock;
  completeReview?: jest.Mock;
} = {}) {
  return {
    checkIndividual: opts.checkIndividual ?? jest.fn().mockResolvedValue(PEP_CHECK),
    findById: opts.findById ?? jest.fn().mockResolvedValue(PEP_CHECK),
    listChecks: opts.listChecks ?? jest.fn().mockResolvedValue({
      checks: [PEP_CHECK],
      total: 1,
    }),
    completeReview: opts.completeReview ?? jest.fn().mockResolvedValue({
      ...PEP_IDENTIFIED,
      status: 'edd_completed',
      reviewedBy: REVIEWER_ID,
    }),
  };
}

function makeApp(pepOpts?: Parameters<typeof makePepService>[0]) {
  return createApp({
    sanctionsScreeningService: makeScreeningService() as never,
    pepCheckingService: makePepService(pepOpts) as never,
  });
}

// ─── POST /pep/check ────────────────────────────────────────────────────────

describe('POST /pep/check', () => {
  it('should return 201 with PEP check on valid body', async () => {
    const res = await request(makeApp()).post('/pep/check').send({
      individualName: 'John Smith',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.individualName).toBe('John Smith');
    expect(res.body.data.status).toBe('clear');
  });

  it('should accept optional fields', async () => {
    const checkIndividual = jest.fn().mockResolvedValue(PEP_CHECK);
    const app = makeApp({ checkIndividual });

    await request(app).post('/pep/check').send({
      individualName: 'Jane Smith',
      dateOfBirth: '1990-01-15',
      nationality: 'US',
      beneficialOwnerId: BENEFICIAL_OWNER_ID,
      institutionId: INSTITUTION_ID,
      checkedBy: REVIEWER_ID,
    });

    expect(checkIndividual).toHaveBeenCalledWith(
      expect.objectContaining({
        dateOfBirth: '1990-01-15',
        nationality: 'US',
        beneficialOwnerId: BENEFICIAL_OWNER_ID,
        institutionId: INSTITUTION_ID,
        checkedBy: REVIEWER_ID,
      }),
    );
  });

  it('should return 422 when individualName is missing', async () => {
    const res = await request(makeApp()).post('/pep/check').send({});

    expect(res.status).toBe(422);
    expect(res.body.status).toBe(422);
  });

  it('should return 422 when individualName is empty', async () => {
    const res = await request(makeApp()).post('/pep/check').send({
      individualName: '',
    });

    expect(res.status).toBe(422);
  });

  it('should return 422 when nationality is not 2 characters', async () => {
    const res = await request(makeApp()).post('/pep/check').send({
      individualName: 'John Smith',
      nationality: 'USA',
    });

    expect(res.status).toBe(422);
  });

  it('should return 422 when dateOfBirth is not a valid date', async () => {
    const res = await request(makeApp()).post('/pep/check').send({
      individualName: 'John Smith',
      dateOfBirth: 'not-a-date',
    });

    expect(res.status).toBe(422);
  });

  it('should return 422 when beneficialOwnerId is not a valid UUID', async () => {
    const res = await request(makeApp()).post('/pep/check').send({
      individualName: 'John Smith',
      beneficialOwnerId: 'not-a-uuid',
    });

    expect(res.status).toBe(422);
  });

  it('should return 422 when institutionId is not a valid UUID', async () => {
    const res = await request(makeApp()).post('/pep/check').send({
      individualName: 'John Smith',
      institutionId: 'not-a-uuid',
    });

    expect(res.status).toBe(422);
  });
});

// ─── GET /pep/checks ────────────────────────────────────────────────────────

describe('GET /pep/checks', () => {
  it('should return 200 with checks list', async () => {
    const res = await request(makeApp()).get('/pep/checks');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.metadata.total).toBe(1);
  });

  it('should include pagination metadata', async () => {
    const res = await request(makeApp()).get('/pep/checks?limit=10&offset=0');

    expect(res.body.metadata).toMatchObject({
      total: 1,
      limit: 10,
      offset: 0,
      hasMore: false,
    });
  });

  it('should pass filters to service', async () => {
    const listChecks = jest.fn().mockResolvedValue({ checks: [], total: 0 });
    const app = makeApp({ listChecks });

    await request(app).get(`/pep/checks?institutionId=${INSTITUTION_ID}&status=pep_identified&isPep=true`);

    expect(listChecks).toHaveBeenCalledWith(
      expect.objectContaining({
        institutionId: INSTITUTION_ID,
        status: 'pep_identified',
        isPep: true,
      }),
    );
  });

  it('should use default limit and offset', async () => {
    const listChecks = jest.fn().mockResolvedValue({ checks: [], total: 0 });
    const app = makeApp({ listChecks });

    await request(app).get('/pep/checks');

    expect(listChecks).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 20, offset: 0 }),
    );
  });

  it('should return 422 for invalid status filter', async () => {
    const res = await request(makeApp()).get('/pep/checks?status=unknown');

    expect(res.status).toBe(422);
  });
});

// ─── GET /pep/checks/:id ────────────────────────────────────────────────────

describe('GET /pep/checks/:id', () => {
  it('should return 200 with PEP check', async () => {
    const res = await request(makeApp()).get(`/pep/checks/${PEP_CHECK_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(PEP_CHECK_ID);
  });

  it('should return 404 when PEP check not found', async () => {
    const app = makeApp({
      findById: jest.fn().mockRejectedValue(new NotFoundError('PEP Check', 'bad-id')),
    });

    const res = await request(app).get('/pep/checks/bad-id');

    expect(res.status).toBe(404);
    expect(res.body.status).toBe(404);
  });
});

// ─── POST /pep/checks/:id/review ───────────────────────────────────────────

describe('POST /pep/checks/:id/review', () => {
  it('should return 200 with updated PEP check on edd_completed', async () => {
    const res = await request(makeApp())
      .post(`/pep/checks/${PEP_CHECK_ID}/review`)
      .send({
        reviewedBy: REVIEWER_ID,
        status: 'edd_completed',
        notes: 'Enhanced due diligence completed',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('edd_completed');
  });

  it('should return 200 with updated PEP check on edd_failed', async () => {
    const completeReview = jest.fn().mockResolvedValue({
      ...PEP_IDENTIFIED,
      status: 'edd_failed',
      reviewedBy: REVIEWER_ID,
    });
    const app = makeApp({ completeReview });

    const res = await request(app)
      .post(`/pep/checks/${PEP_CHECK_ID}/review`)
      .send({
        reviewedBy: REVIEWER_ID,
        status: 'edd_failed',
        notes: 'Unable to verify',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('edd_failed');
  });

  it('should return 422 when reviewedBy is missing', async () => {
    const res = await request(makeApp())
      .post(`/pep/checks/${PEP_CHECK_ID}/review`)
      .send({
        status: 'edd_completed',
        notes: 'Test',
      });

    expect(res.status).toBe(422);
  });

  it('should return 422 when status is invalid', async () => {
    const res = await request(makeApp())
      .post(`/pep/checks/${PEP_CHECK_ID}/review`)
      .send({
        reviewedBy: REVIEWER_ID,
        status: 'unknown',
        notes: 'Test',
      });

    expect(res.status).toBe(422);
  });

  it('should return 422 when notes are empty', async () => {
    const res = await request(makeApp())
      .post(`/pep/checks/${PEP_CHECK_ID}/review`)
      .send({
        reviewedBy: REVIEWER_ID,
        status: 'edd_completed',
        notes: '',
      });

    expect(res.status).toBe(422);
  });

  it('should return 422 when reviewedBy is not a valid UUID', async () => {
    const res = await request(makeApp())
      .post(`/pep/checks/${PEP_CHECK_ID}/review`)
      .send({
        reviewedBy: 'not-a-uuid',
        status: 'edd_completed',
        notes: 'Test',
      });

    expect(res.status).toBe(422);
  });

  it('should return 404 when PEP check not found', async () => {
    const app = makeApp({
      completeReview: jest.fn().mockRejectedValue(new NotFoundError('PEP Check', 'bad-id')),
    });

    const res = await request(app)
      .post('/pep/checks/bad-id/review')
      .send({
        reviewedBy: REVIEWER_ID,
        status: 'edd_completed',
        notes: 'Test',
      });

    expect(res.status).toBe(404);
  });

  it('should return 422 when PEP check is not in reviewable status', async () => {
    const app = makeApp({
      completeReview: jest.fn().mockRejectedValue(
        new ValidationError("PEP check must be in 'pep_identified' or 'edd_required' status to review"),
      ),
    });

    const res = await request(app)
      .post(`/pep/checks/${PEP_CHECK_ID}/review`)
      .send({
        reviewedBy: REVIEWER_ID,
        status: 'edd_completed',
        notes: 'Test',
      });

    expect(res.status).toBe(422);
  });
});
