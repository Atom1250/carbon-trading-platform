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

const SCREENING_ID = '550e8400-e29b-41d4-a716-446655440000';
const INSTITUTION_ID = '660e8400-e29b-41d4-a716-446655440000';
const USER_ID = '770e8400-e29b-41d4-a716-446655440000';
const REVIEWER_ID = '880e8400-e29b-41d4-a716-446655440000';

const SCREENING = {
  id: SCREENING_ID,
  entityType: 'individual',
  entityName: 'John Doe',
  entityCountry: null,
  entityDateOfBirth: null,
  entityIdentifiers: null,
  institutionId: null,
  userId: null,
  status: 'clear',
  matchCount: 0,
  highestScore: '0.00',
  screenedBy: null,
  reviewedBy: null,
  reviewedAt: null,
  reviewNotes: null,
  createdAt: new Date('2025-01-01').toISOString(),
  updatedAt: new Date('2025-01-01').toISOString(),
};

const SCREENING_WITH_MATCHES = {
  ...SCREENING,
  matches: [
    {
      id: '990e8400-e29b-41d4-a716-446655440000',
      screeningId: SCREENING_ID,
      listName: 'OFAC SDN',
      listEntryId: 'OFAC-001',
      matchedName: 'SANCTIONED ENTITY ONE',
      matchScore: '0.85',
      matchDetails: { country: null },
      createdAt: new Date('2025-01-01').toISOString(),
    },
  ],
};

const POTENTIAL_MATCH = {
  ...SCREENING,
  status: 'potential_match',
  matchCount: 1,
  highestScore: '0.85',
};

function makeService(opts: {
  screenEntity?: jest.Mock;
  findById?: jest.Mock;
  getReviewQueue?: jest.Mock;
  reviewScreening?: jest.Mock;
} = {}) {
  return {
    screenEntity: opts.screenEntity ?? jest.fn().mockResolvedValue(SCREENING),
    findById: opts.findById ?? jest.fn().mockResolvedValue(SCREENING_WITH_MATCHES),
    getReviewQueue: opts.getReviewQueue ?? jest.fn().mockResolvedValue({
      screenings: [POTENTIAL_MATCH],
      total: 1,
    }),
    reviewScreening: opts.reviewScreening ?? jest.fn().mockResolvedValue({
      ...POTENTIAL_MATCH,
      status: 'confirmed_match',
      reviewedBy: REVIEWER_ID,
    }),
  };
}

function makeApp(serviceOpts?: Parameters<typeof makeService>[0]) {
  return createApp({
    sanctionsScreeningService: makeService(serviceOpts) as never,
  });
}

// ─── POST /screenings/entity ──────────────────────────────────────────────────

describe('POST /screenings/entity', () => {
  it('should return 201 with screening on valid body', async () => {
    const res = await request(makeApp()).post('/screenings/entity').send({
      entityType: 'individual',
      entityName: 'John Doe',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.entityName).toBe('John Doe');
    expect(res.body.data.status).toBe('clear');
  });

  it('should accept optional fields', async () => {
    const screenEntity = jest.fn().mockResolvedValue(SCREENING);
    const app = makeApp({ screenEntity });

    await request(app).post('/screenings/entity').send({
      entityType: 'individual',
      entityName: 'Jane Smith',
      entityCountry: 'US',
      entityDateOfBirth: '1990-01-15',
      institutionId: INSTITUTION_ID,
      userId: USER_ID,
      screenedBy: REVIEWER_ID,
    });

    expect(screenEntity).toHaveBeenCalledWith(
      expect.objectContaining({
        entityCountry: 'US',
        entityDateOfBirth: '1990-01-15',
        institutionId: INSTITUTION_ID,
        userId: USER_ID,
        screenedBy: REVIEWER_ID,
      }),
    );
  });

  it('should return 422 when entityName is missing', async () => {
    const res = await request(makeApp()).post('/screenings/entity').send({
      entityType: 'individual',
    });

    expect(res.status).toBe(422);
    expect(res.body.status).toBe(422);
  });

  it('should return 422 when entityType is missing', async () => {
    const res = await request(makeApp()).post('/screenings/entity').send({
      entityName: 'John Doe',
    });

    expect(res.status).toBe(422);
  });

  it('should return 422 when entityType is invalid', async () => {
    const res = await request(makeApp()).post('/screenings/entity').send({
      entityType: 'company',
      entityName: 'Test Corp',
    });

    expect(res.status).toBe(422);
  });

  it('should return 422 when entityCountry is not 2 characters', async () => {
    const res = await request(makeApp()).post('/screenings/entity').send({
      entityType: 'individual',
      entityName: 'John Doe',
      entityCountry: 'USA',
    });

    expect(res.status).toBe(422);
  });

  it('should return 422 when entityDateOfBirth is not a valid date', async () => {
    const res = await request(makeApp()).post('/screenings/entity').send({
      entityType: 'individual',
      entityName: 'John Doe',
      entityDateOfBirth: 'not-a-date',
    });

    expect(res.status).toBe(422);
  });

  it('should return 422 when institutionId is not a valid UUID', async () => {
    const res = await request(makeApp()).post('/screenings/entity').send({
      entityType: 'individual',
      entityName: 'John Doe',
      institutionId: 'not-a-uuid',
    });

    expect(res.status).toBe(422);
  });
});

// ─── GET /screenings/review-queue ─────────────────────────────────────────────

describe('GET /screenings/review-queue', () => {
  it('should return 200 with review queue', async () => {
    const res = await request(makeApp()).get('/screenings/review-queue');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.metadata.total).toBe(1);
  });

  it('should include pagination metadata', async () => {
    const res = await request(makeApp()).get('/screenings/review-queue?limit=10&offset=0');

    expect(res.body.metadata).toMatchObject({
      total: 1,
      limit: 10,
      offset: 0,
      hasMore: false,
    });
  });

  it('should pass limit and offset to service', async () => {
    const getReviewQueue = jest.fn().mockResolvedValue({ screenings: [], total: 0 });
    const app = makeApp({ getReviewQueue });

    await request(app).get('/screenings/review-queue?limit=5&offset=10');

    expect(getReviewQueue).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 5, offset: 10 }),
    );
  });

  it('should use default limit and offset', async () => {
    const getReviewQueue = jest.fn().mockResolvedValue({ screenings: [], total: 0 });
    const app = makeApp({ getReviewQueue });

    await request(app).get('/screenings/review-queue');

    expect(getReviewQueue).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 20, offset: 0 }),
    );
  });
});

// ─── GET /screenings/:id ──────────────────────────────────────────────────────

describe('GET /screenings/:id', () => {
  it('should return 200 with screening and matches', async () => {
    const res = await request(makeApp()).get(`/screenings/${SCREENING_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(SCREENING_ID);
    expect(res.body.data.matches).toHaveLength(1);
  });

  it('should return 404 when screening not found', async () => {
    const app = makeApp({
      findById: jest.fn().mockRejectedValue(new NotFoundError('Screening', 'bad-id')),
    });

    const res = await request(app).get('/screenings/bad-id');

    expect(res.status).toBe(404);
    expect(res.body.status).toBe(404);
  });
});

// ─── POST /screenings/:id/review ──────────────────────────────────────────────

describe('POST /screenings/:id/review', () => {
  it('should return 200 with updated screening on confirmed_match', async () => {
    const res = await request(makeApp())
      .post(`/screenings/${SCREENING_ID}/review`)
      .send({
        reviewedBy: REVIEWER_ID,
        status: 'confirmed_match',
        notes: 'Confirmed sanctioned entity',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('confirmed_match');
  });

  it('should return 200 with updated screening on false_positive', async () => {
    const reviewScreening = jest.fn().mockResolvedValue({
      ...POTENTIAL_MATCH,
      status: 'false_positive',
      reviewedBy: REVIEWER_ID,
    });
    const app = makeApp({ reviewScreening });

    const res = await request(app)
      .post(`/screenings/${SCREENING_ID}/review`)
      .send({
        reviewedBy: REVIEWER_ID,
        status: 'false_positive',
        notes: 'Not the same entity',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('false_positive');
  });

  it('should return 422 when reviewedBy is missing', async () => {
    const res = await request(makeApp())
      .post(`/screenings/${SCREENING_ID}/review`)
      .send({
        status: 'confirmed_match',
        notes: 'Test',
      });

    expect(res.status).toBe(422);
  });

  it('should return 422 when status is invalid', async () => {
    const res = await request(makeApp())
      .post(`/screenings/${SCREENING_ID}/review`)
      .send({
        reviewedBy: REVIEWER_ID,
        status: 'unknown',
        notes: 'Test',
      });

    expect(res.status).toBe(422);
  });

  it('should return 422 when notes are empty', async () => {
    const res = await request(makeApp())
      .post(`/screenings/${SCREENING_ID}/review`)
      .send({
        reviewedBy: REVIEWER_ID,
        status: 'confirmed_match',
        notes: '',
      });

    expect(res.status).toBe(422);
  });

  it('should return 422 when reviewedBy is not a valid UUID', async () => {
    const res = await request(makeApp())
      .post(`/screenings/${SCREENING_ID}/review`)
      .send({
        reviewedBy: 'not-a-uuid',
        status: 'confirmed_match',
        notes: 'Test',
      });

    expect(res.status).toBe(422);
  });

  it('should return 404 when screening not found', async () => {
    const app = makeApp({
      reviewScreening: jest.fn().mockRejectedValue(new NotFoundError('Screening', 'bad-id')),
    });

    const res = await request(app)
      .post('/screenings/bad-id/review')
      .send({
        reviewedBy: REVIEWER_ID,
        status: 'confirmed_match',
        notes: 'Test',
      });

    expect(res.status).toBe(404);
  });

  it('should return 422 when screening is not in potential_match status', async () => {
    const app = makeApp({
      reviewScreening: jest.fn().mockRejectedValue(
        new ValidationError("Screening must be in 'potential_match' status to review"),
      ),
    });

    const res = await request(app)
      .post(`/screenings/${SCREENING_ID}/review`)
      .send({
        reviewedBy: REVIEWER_ID,
        status: 'confirmed_match',
        notes: 'Test',
      });

    expect(res.status).toBe(422);
  });
});

// ─── GET /health ──────────────────────────────────────────────────────────────

describe('GET /health', () => {
  it('should return 200 with healthy status', async () => {
    const res = await request(makeApp()).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.service).toBe('compliance-service');
  });
});

// ─── 404 catch-all ────────────────────────────────────────────────────────────

describe('Unknown routes', () => {
  it('should return 404 for unknown paths', async () => {
    const res = await request(makeApp()).get('/unknown-path');

    expect(res.status).toBe(404);
    expect(res.body.status).toBe(404);
  });
});
