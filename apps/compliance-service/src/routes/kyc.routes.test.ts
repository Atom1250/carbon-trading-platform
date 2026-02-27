import request from 'supertest';
import { createApp } from '../app';
import { NotFoundError } from '@libs/errors';

jest.mock('@libs/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

const DOC_ID = '550e8400-e29b-41d4-a716-446655440000';
const INSTITUTION_ID = '660e8400-e29b-41d4-a716-446655440000';
const USER_ID = '770e8400-e29b-41d4-a716-446655440000';
const REVIEWER_ID = '880e8400-e29b-41d4-a716-446655440000';

const DOCUMENT = {
  id: DOC_ID,
  institutionId: INSTITUTION_ID,
  userId: null,
  documentType: 'certificate_of_incorporation',
  status: 'pending',
  fileUrl: 'https://storage.example.com/docs/cert.pdf',
  reviewerId: null,
  reviewedAt: null,
  rejectionReason: null,
  documentExpiryDate: null,
  createdAt: new Date('2025-01-01').toISOString(),
  updatedAt: new Date('2025-01-01').toISOString(),
};

const KYC_STATUS = {
  entityType: 'institution',
  entityId: INSTITUTION_ID,
  overallStatus: 'incomplete',
  documents: [DOCUMENT],
  missingDocuments: ['proof_of_address', 'ownership_structure'],
  expiredDocuments: [],
};

function makeScreeningService() {
  return { screenEntity: jest.fn(), findById: jest.fn(), getReviewQueue: jest.fn(), reviewScreening: jest.fn() };
}

function makeKYCService(opts: {
  createDocument?: jest.Mock;
  findById?: jest.Mock;
  listDocuments?: jest.Mock;
  reviewDocument?: jest.Mock;
  getEntityStatus?: jest.Mock;
} = {}) {
  return {
    createDocument: opts.createDocument ?? jest.fn().mockResolvedValue(DOCUMENT),
    findById: opts.findById ?? jest.fn().mockResolvedValue(DOCUMENT),
    listDocuments: opts.listDocuments ?? jest.fn().mockResolvedValue({ documents: [DOCUMENT], total: 1 }),
    reviewDocument: opts.reviewDocument ?? jest.fn().mockResolvedValue({ ...DOCUMENT, status: 'approved', reviewerId: REVIEWER_ID }),
    getEntityStatus: opts.getEntityStatus ?? jest.fn().mockResolvedValue(KYC_STATUS),
  };
}

function makeApp(kycOpts?: Parameters<typeof makeKYCService>[0]) {
  return createApp({
    sanctionsScreeningService: makeScreeningService() as never,
    kycDocumentService: makeKYCService(kycOpts) as never,
  });
}

// ─── POST /kyc/documents ──────────────────────────────────────────────────────

describe('POST /kyc/documents', () => {
  it('should return 201 with document on valid body', async () => {
    const res = await request(makeApp()).post('/kyc/documents').send({
      institutionId: INSTITUTION_ID,
      documentType: 'certificate_of_incorporation',
      fileUrl: 'https://storage.example.com/docs/cert.pdf',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.documentType).toBe('certificate_of_incorporation');
  });

  it('should accept userId instead of institutionId', async () => {
    const createDocument = jest.fn().mockResolvedValue(DOCUMENT);
    const app = makeApp({ createDocument });

    await request(app).post('/kyc/documents').send({
      userId: USER_ID,
      documentType: 'government_id',
      fileUrl: 'https://storage.example.com/docs/id.pdf',
    });

    expect(createDocument).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER_ID }),
    );
  });

  it('should return 422 when neither institutionId nor userId provided', async () => {
    const res = await request(makeApp()).post('/kyc/documents').send({
      documentType: 'government_id',
      fileUrl: 'https://storage.example.com/docs/id.pdf',
    });

    expect(res.status).toBe(422);
  });

  it('should return 422 when documentType is invalid', async () => {
    const res = await request(makeApp()).post('/kyc/documents').send({
      institutionId: INSTITUTION_ID,
      documentType: 'invalid_type',
      fileUrl: 'https://storage.example.com/docs/cert.pdf',
    });

    expect(res.status).toBe(422);
  });

  it('should return 422 when fileUrl is not a valid URL', async () => {
    const res = await request(makeApp()).post('/kyc/documents').send({
      institutionId: INSTITUTION_ID,
      documentType: 'certificate_of_incorporation',
      fileUrl: 'not-a-url',
    });

    expect(res.status).toBe(422);
  });

  it('should accept optional documentExpiryDate', async () => {
    const createDocument = jest.fn().mockResolvedValue(DOCUMENT);
    const app = makeApp({ createDocument });

    await request(app).post('/kyc/documents').send({
      institutionId: INSTITUTION_ID,
      documentType: 'certificate_of_incorporation',
      fileUrl: 'https://storage.example.com/docs/cert.pdf',
      documentExpiryDate: '2030-01-01',
    });

    expect(createDocument).toHaveBeenCalledWith(
      expect.objectContaining({ documentExpiryDate: '2030-01-01' }),
    );
  });
});

// ─── GET /kyc/documents ───────────────────────────────────────────────────────

describe('GET /kyc/documents', () => {
  it('should return 200 with documents list', async () => {
    const res = await request(makeApp()).get('/kyc/documents');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.metadata.total).toBe(1);
  });

  it('should pass filters to service', async () => {
    const listDocuments = jest.fn().mockResolvedValue({ documents: [], total: 0 });
    const app = makeApp({ listDocuments });

    await request(app).get(`/kyc/documents?institutionId=${INSTITUTION_ID}&status=pending`);

    expect(listDocuments).toHaveBeenCalledWith(
      expect.objectContaining({ institutionId: INSTITUTION_ID, status: 'pending' }),
    );
  });

  it('should return 422 for invalid status filter', async () => {
    const res = await request(makeApp()).get('/kyc/documents?status=invalid');

    expect(res.status).toBe(422);
  });
});

// ─── GET /kyc/documents/:id ───────────────────────────────────────────────────

describe('GET /kyc/documents/:id', () => {
  it('should return 200 with document', async () => {
    const res = await request(makeApp()).get(`/kyc/documents/${DOC_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(DOC_ID);
  });

  it('should return 404 when not found', async () => {
    const app = makeApp({
      findById: jest.fn().mockRejectedValue(new NotFoundError('KYC Document', 'bad-id')),
    });

    const res = await request(app).get('/kyc/documents/bad-id');

    expect(res.status).toBe(404);
  });
});

// ─── POST /kyc/documents/:id/review ───────────────────────────────────────────

describe('POST /kyc/documents/:id/review', () => {
  it('should return 200 with approved document', async () => {
    const res = await request(makeApp())
      .post(`/kyc/documents/${DOC_ID}/review`)
      .send({ reviewerId: REVIEWER_ID, status: 'approved' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('approved');
  });

  it('should return 422 when rejecting without reason', async () => {
    const res = await request(makeApp())
      .post(`/kyc/documents/${DOC_ID}/review`)
      .send({ reviewerId: REVIEWER_ID, status: 'rejected' });

    expect(res.status).toBe(422);
  });

  it('should accept rejection with reason', async () => {
    const reviewDocument = jest.fn().mockResolvedValue({ ...DOCUMENT, status: 'rejected' });
    const app = makeApp({ reviewDocument });

    const res = await request(app)
      .post(`/kyc/documents/${DOC_ID}/review`)
      .send({ reviewerId: REVIEWER_ID, status: 'rejected', rejectionReason: 'Blurry image' });

    expect(res.status).toBe(200);
  });

  it('should return 422 when reviewerId is not a UUID', async () => {
    const res = await request(makeApp())
      .post(`/kyc/documents/${DOC_ID}/review`)
      .send({ reviewerId: 'not-a-uuid', status: 'approved' });

    expect(res.status).toBe(422);
  });

  it('should return 422 when status is invalid', async () => {
    const res = await request(makeApp())
      .post(`/kyc/documents/${DOC_ID}/review`)
      .send({ reviewerId: REVIEWER_ID, status: 'pending' });

    expect(res.status).toBe(422);
  });

  it('should return 404 when document not found', async () => {
    const app = makeApp({
      reviewDocument: jest.fn().mockRejectedValue(new NotFoundError('KYC Document', 'bad-id')),
    });

    const res = await request(app)
      .post('/kyc/documents/bad-id/review')
      .send({ reviewerId: REVIEWER_ID, status: 'approved' });

    expect(res.status).toBe(404);
  });
});

// ─── GET /kyc/status/:entityType/:entityId ────────────────────────────────────

describe('GET /kyc/status/:entityType/:entityId', () => {
  it('should return 200 with KYC status', async () => {
    const res = await request(makeApp()).get(`/kyc/status/institution/${INSTITUTION_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data.overallStatus).toBe('incomplete');
    expect(res.body.data.missingDocuments).toHaveLength(2);
  });

  it('should return 422 for invalid entity type', async () => {
    const res = await request(makeApp()).get(`/kyc/status/company/${INSTITUTION_ID}`);

    expect(res.status).toBe(422);
  });

  it('should pass correct entity type and id to service', async () => {
    const getEntityStatus = jest.fn().mockResolvedValue(KYC_STATUS);
    const app = makeApp({ getEntityStatus });

    await request(app).get(`/kyc/status/user/${USER_ID}`);

    expect(getEntityStatus).toHaveBeenCalledWith('user', USER_ID);
  });
});
