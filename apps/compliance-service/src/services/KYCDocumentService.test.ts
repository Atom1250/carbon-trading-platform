import { KYCDocumentService } from './KYCDocumentService';
import { NotFoundError, ValidationError } from '@libs/errors';

const DOC_ID = '550e8400-e29b-41d4-a716-446655440000';
const INSTITUTION_ID = '660e8400-e29b-41d4-a716-446655440000';
const USER_ID = '770e8400-e29b-41d4-a716-446655440000';
const REVIEWER_ID = '880e8400-e29b-41d4-a716-446655440000';

const DB_DOC_ROW = {
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
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

const APPROVED_DOC = {
  ...DB_DOC_ROW,
  status: 'approved',
  reviewerId: REVIEWER_ID,
  reviewedAt: new Date('2025-01-02'),
};

function makeMockDb(queryResults: unknown[][] = []) {
  let callIndex = 0;
  return {
    query: jest.fn().mockImplementation(() =>
      Promise.resolve(queryResults[callIndex++] ?? []),
    ),
    transaction: jest.fn(),
    healthCheck: jest.fn(),
    end: jest.fn(),
  };
}

describe('KYCDocumentService', () => {
  // ─── createDocument ─────────────────────────────────────────────────────

  describe('createDocument', () => {
    it('should create a document and return it', async () => {
      const db = makeMockDb([[DB_DOC_ROW]]);
      const service = new KYCDocumentService(db as never);

      const result = await service.createDocument({
        institutionId: INSTITUTION_ID,
        documentType: 'certificate_of_incorporation',
        fileUrl: 'https://storage.example.com/docs/cert.pdf',
      });

      expect(result.id).toBe(DOC_ID);
      expect(result.documentType).toBe('certificate_of_incorporation');
    });

    it('should insert into kyc_documents', async () => {
      const db = makeMockDb([[DB_DOC_ROW]]);
      const service = new KYCDocumentService(db as never);

      await service.createDocument({
        institutionId: INSTITUTION_ID,
        documentType: 'certificate_of_incorporation',
        fileUrl: 'https://storage.example.com/docs/cert.pdf',
      });

      const [sql] = (db.query as jest.Mock).mock.calls[0] as [string];
      expect(sql).toContain('INSERT INTO kyc_documents');
    });

    it('should throw ValidationError when neither institutionId nor userId provided', async () => {
      const db = makeMockDb([]);
      const service = new KYCDocumentService(db as never);

      await expect(
        service.createDocument({
          documentType: 'government_id',
          fileUrl: 'https://storage.example.com/docs/id.pdf',
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('should pass optional expiryDate', async () => {
      const db = makeMockDb([[DB_DOC_ROW]]);
      const service = new KYCDocumentService(db as never);

      await service.createDocument({
        userId: USER_ID,
        documentType: 'government_id',
        fileUrl: 'https://storage.example.com/docs/id.pdf',
        documentExpiryDate: '2030-01-01',
      });

      const params = (db.query as jest.Mock).mock.calls[0][1] as unknown[];
      expect(params[4]).toBe('2030-01-01');
    });

    it('should set null for missing optional fields', async () => {
      const db = makeMockDb([[DB_DOC_ROW]]);
      const service = new KYCDocumentService(db as never);

      await service.createDocument({
        institutionId: INSTITUTION_ID,
        documentType: 'proof_of_address',
        fileUrl: 'https://storage.example.com/docs/addr.pdf',
      });

      const params = (db.query as jest.Mock).mock.calls[0][1] as unknown[];
      expect(params[1]).toBeNull(); // userId
      expect(params[4]).toBeNull(); // documentExpiryDate
    });
  });

  // ─── findById ───────────────────────────────────────────────────────────

  describe('findById', () => {
    it('should return document when found', async () => {
      const db = makeMockDb([[DB_DOC_ROW]]);
      const service = new KYCDocumentService(db as never);

      const result = await service.findById(DOC_ID);

      expect(result.id).toBe(DOC_ID);
    });

    it('should throw NotFoundError when not found', async () => {
      const db = makeMockDb([[]]);
      const service = new KYCDocumentService(db as never);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  // ─── listDocuments ────────────────────────────────────────────────────────

  describe('listDocuments', () => {
    it('should return documents with total count', async () => {
      const db = makeMockDb([[{ count: '2' }], [DB_DOC_ROW, DB_DOC_ROW]]);
      const service = new KYCDocumentService(db as never);

      const result = await service.listDocuments({ limit: 20, offset: 0 });

      expect(result.total).toBe(2);
      expect(result.documents).toHaveLength(2);
    });

    it('should filter by institutionId', async () => {
      const db = makeMockDb([[{ count: '1' }], [DB_DOC_ROW]]);
      const service = new KYCDocumentService(db as never);

      await service.listDocuments({ institutionId: INSTITUTION_ID, limit: 20, offset: 0 });

      const params = (db.query as jest.Mock).mock.calls[0][1] as unknown[];
      expect(params).toContain(INSTITUTION_ID);
    });

    it('should filter by status', async () => {
      const db = makeMockDb([[{ count: '0' }], []]);
      const service = new KYCDocumentService(db as never);

      await service.listDocuments({ status: 'pending', limit: 20, offset: 0 });

      const [countSql] = (db.query as jest.Mock).mock.calls[0] as [string];
      expect(countSql).toContain('status = $1');
    });

    it('should filter by documentType', async () => {
      const db = makeMockDb([[{ count: '0' }], []]);
      const service = new KYCDocumentService(db as never);

      await service.listDocuments({ documentType: 'government_id', limit: 20, offset: 0 });

      const [countSql] = (db.query as jest.Mock).mock.calls[0] as [string];
      expect(countSql).toContain('document_type = $1');
    });

    it('should pass limit and offset', async () => {
      const db = makeMockDb([[{ count: '0' }], []]);
      const service = new KYCDocumentService(db as never);

      await service.listDocuments({ limit: 10, offset: 5 });

      const params = (db.query as jest.Mock).mock.calls[1][1] as unknown[];
      expect(params).toContain(10);
      expect(params).toContain(5);
    });

    it('should order by created_at DESC', async () => {
      const db = makeMockDb([[{ count: '0' }], []]);
      const service = new KYCDocumentService(db as never);

      await service.listDocuments({ limit: 20, offset: 0 });

      const [dataSql] = (db.query as jest.Mock).mock.calls[1] as [string];
      expect(dataSql).toContain('ORDER BY created_at DESC');
    });
  });

  // ─── reviewDocument ───────────────────────────────────────────────────────

  describe('reviewDocument', () => {
    it('should approve a document', async () => {
      const db = makeMockDb([[DB_DOC_ROW], [APPROVED_DOC]]);
      const service = new KYCDocumentService(db as never);

      const result = await service.reviewDocument(DOC_ID, {
        reviewerId: REVIEWER_ID,
        status: 'approved',
      });

      expect(result.status).toBe('approved');
    });

    it('should reject a document with reason', async () => {
      const rejectedDoc = { ...DB_DOC_ROW, status: 'rejected', rejectionReason: 'Blurry' };
      const db = makeMockDb([[DB_DOC_ROW], [rejectedDoc]]);
      const service = new KYCDocumentService(db as never);

      const result = await service.reviewDocument(DOC_ID, {
        reviewerId: REVIEWER_ID,
        status: 'rejected',
        rejectionReason: 'Blurry',
      });

      expect(result.status).toBe('rejected');
    });

    it('should throw NotFoundError when document not found', async () => {
      const db = makeMockDb([[]]);
      const service = new KYCDocumentService(db as never);

      await expect(
        service.reviewDocument('nonexistent', { reviewerId: REVIEWER_ID, status: 'approved' }),
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when document is not pending', async () => {
      const db = makeMockDb([[APPROVED_DOC]]);
      const service = new KYCDocumentService(db as never);

      await expect(
        service.reviewDocument(DOC_ID, { reviewerId: REVIEWER_ID, status: 'approved' }),
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when rejecting without reason', async () => {
      const db = makeMockDb([[DB_DOC_ROW]]);
      const service = new KYCDocumentService(db as never);

      await expect(
        service.reviewDocument(DOC_ID, { reviewerId: REVIEWER_ID, status: 'rejected' }),
      ).rejects.toThrow(ValidationError);
    });

    it('should pass review data to update query', async () => {
      const db = makeMockDb([[DB_DOC_ROW], [APPROVED_DOC]]);
      const service = new KYCDocumentService(db as never);

      await service.reviewDocument(DOC_ID, {
        reviewerId: REVIEWER_ID,
        status: 'approved',
      });

      const updateCall = (db.query as jest.Mock).mock.calls[1];
      const [sql, params] = updateCall as [string, unknown[]];
      expect(sql).toContain('UPDATE kyc_documents');
      expect(params).toContain('approved');
      expect(params).toContain(REVIEWER_ID);
    });
  });

  // ─── getEntityStatus ──────────────────────────────────────────────────────

  describe('getEntityStatus', () => {
    it('should return complete status when all institution docs approved', async () => {
      const docs = [
        { ...APPROVED_DOC, documentType: 'certificate_of_incorporation' },
        { ...APPROVED_DOC, documentType: 'proof_of_address' },
        { ...APPROVED_DOC, documentType: 'ownership_structure' },
      ];
      const db = makeMockDb([docs]);
      const service = new KYCDocumentService(db as never);

      const result = await service.getEntityStatus('institution', INSTITUTION_ID);

      expect(result.overallStatus).toBe('complete');
      expect(result.missingDocuments).toHaveLength(0);
    });

    it('should return incomplete status when docs are missing', async () => {
      const docs = [
        { ...APPROVED_DOC, documentType: 'certificate_of_incorporation' },
      ];
      const db = makeMockDb([docs]);
      const service = new KYCDocumentService(db as never);

      const result = await service.getEntityStatus('institution', INSTITUTION_ID);

      expect(result.overallStatus).toBe('incomplete');
      expect(result.missingDocuments).toContain('proof_of_address');
      expect(result.missingDocuments).toContain('ownership_structure');
    });

    it('should return pending status when docs are pending', async () => {
      const docs = [
        { ...APPROVED_DOC, documentType: 'certificate_of_incorporation' },
        { ...DB_DOC_ROW, documentType: 'proof_of_address', status: 'pending' },
      ];
      const db = makeMockDb([docs]);
      const service = new KYCDocumentService(db as never);

      const result = await service.getEntityStatus('institution', INSTITUTION_ID);

      expect(result.overallStatus).toBe('pending');
    });

    it('should return expired status when docs are expired', async () => {
      const docs = [
        { ...APPROVED_DOC, documentType: 'certificate_of_incorporation', documentExpiryDate: new Date('2020-01-01') },
        { ...APPROVED_DOC, documentType: 'proof_of_address' },
        { ...APPROVED_DOC, documentType: 'ownership_structure' },
      ];
      const db = makeMockDb([docs]);
      const service = new KYCDocumentService(db as never);

      const result = await service.getEntityStatus('institution', INSTITUTION_ID);

      expect(result.overallStatus).toBe('expired');
      expect(result.expiredDocuments).toContain('certificate_of_incorporation');
    });

    it('should check user required docs for user entity type', async () => {
      const docs = [
        { ...APPROVED_DOC, documentType: 'government_id', userId: USER_ID, institutionId: null },
        { ...APPROVED_DOC, documentType: 'proof_of_address', userId: USER_ID, institutionId: null },
        { ...APPROVED_DOC, documentType: 'selfie', userId: USER_ID, institutionId: null },
      ];
      const db = makeMockDb([docs]);
      const service = new KYCDocumentService(db as never);

      const result = await service.getEntityStatus('user', USER_ID);

      expect(result.overallStatus).toBe('complete');
      expect(result.entityType).toBe('user');
    });

    it('should query with correct column for entity type', async () => {
      const db = makeMockDb([[]]);
      const service = new KYCDocumentService(db as never);

      await service.getEntityStatus('institution', INSTITUTION_ID);

      const [sql] = (db.query as jest.Mock).mock.calls[0] as [string];
      expect(sql).toContain('institution_id = $1');
    });
  });
});
