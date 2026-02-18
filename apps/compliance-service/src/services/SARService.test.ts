import { SARService } from './SARService';
import { NotFoundError, ValidationError } from '@libs/errors';

const SAR_ID = '550e8400-e29b-41d4-a716-446655440000';
const INSTITUTION_ID = '660e8400-e29b-41d4-a716-446655440000';
const SUBJECT_ID = '770e8400-e29b-41d4-a716-446655440000';
const REVIEWER_ID = '880e8400-e29b-41d4-a716-446655440000';
const GENERATOR_ID = '990e8400-e29b-41d4-a716-446655440000';

const DB_SAR_ROW = {
  id: SAR_ID,
  institutionId: INSTITUTION_ID,
  subjectType: 'individual',
  subjectId: SUBJECT_ID,
  subjectName: 'John Doe',
  triggerType: 'aml_alert',
  triggerReferenceId: null,
  status: 'draft',
  suspiciousAmountUsd: '50000.00',
  activityStartDate: new Date('2025-01-01'),
  activityEndDate: new Date('2025-01-15'),
  narrative: 'Suspicious structuring pattern detected',
  supportingData: {},
  generatedBy: GENERATOR_ID,
  reviewedBy: null,
  reviewedAt: null,
  reviewNotes: null,
  filedAt: null,
  filingReference: null,
  filingConfirmation: null,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

const PENDING_SAR_ROW = {
  ...DB_SAR_ROW,
  status: 'pending_review',
};

const APPROVED_SAR_ROW = {
  ...DB_SAR_ROW,
  status: 'approved',
  reviewedBy: REVIEWER_ID,
  reviewedAt: new Date('2025-01-02'),
  reviewNotes: 'Approved for filing',
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

describe('SARService', () => {
  // ─── generateSAR ─────────────────────────────────────────────────────────

  describe('generateSAR', () => {
    it('should create a draft SAR report', async () => {
      const db = makeMockDb([[DB_SAR_ROW]]);
      const service = new SARService(db as never);

      const result = await service.generateSAR({
        institutionId: INSTITUTION_ID,
        subjectType: 'individual',
        subjectId: SUBJECT_ID,
        subjectName: 'John Doe',
        triggerType: 'aml_alert',
        narrative: 'Suspicious structuring pattern detected',
        generatedBy: GENERATOR_ID,
      });

      expect(result.status).toBe('draft');
      expect(result.subjectName).toBe('John Doe');
    });

    it('should insert SAR into database', async () => {
      const db = makeMockDb([[DB_SAR_ROW]]);
      const service = new SARService(db as never);

      await service.generateSAR({
        subjectType: 'individual',
        subjectId: SUBJECT_ID,
        subjectName: 'John Doe',
        triggerType: 'manual',
        narrative: 'Manual report',
      });

      expect(db.query).toHaveBeenCalled();
      const [sql] = (db.query as jest.Mock).mock.calls[0] as [string];
      expect(sql).toContain('INSERT INTO sar_reports');
    });

    it('should pass optional fields to insert', async () => {
      const db = makeMockDb([[DB_SAR_ROW]]);
      const service = new SARService(db as never);

      await service.generateSAR({
        institutionId: INSTITUTION_ID,
        subjectType: 'individual',
        subjectId: SUBJECT_ID,
        subjectName: 'John Doe',
        triggerType: 'aml_alert',
        triggerReferenceId: '110e8400-e29b-41d4-a716-446655440000',
        suspiciousAmountUsd: 50000,
        activityStartDate: '2025-01-01',
        activityEndDate: '2025-01-15',
        narrative: 'Test narrative',
        supportingData: { key: 'value' },
        generatedBy: GENERATOR_ID,
      });

      const params = (db.query as jest.Mock).mock.calls[0][1] as unknown[];
      expect(params[0]).toBe(INSTITUTION_ID);
      expect(params[5]).toBe('110e8400-e29b-41d4-a716-446655440000');
      expect(params[6]).toBe(50000);
      expect(params[7]).toBe('2025-01-01');
      expect(params[8]).toBe('2025-01-15');
      expect(params[11]).toBe(GENERATOR_ID);
    });

    it('should set null for missing optional fields', async () => {
      const db = makeMockDb([[DB_SAR_ROW]]);
      const service = new SARService(db as never);

      await service.generateSAR({
        subjectType: 'individual',
        subjectId: SUBJECT_ID,
        subjectName: 'John Doe',
        triggerType: 'manual',
        narrative: 'Test',
      });

      const params = (db.query as jest.Mock).mock.calls[0][1] as unknown[];
      expect(params[0]).toBeNull(); // institutionId
      expect(params[5]).toBeNull(); // triggerReferenceId
      expect(params[6]).toBeNull(); // suspiciousAmountUsd
      expect(params[11]).toBeNull(); // generatedBy
    });
  });

  // ─── findById ─────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('should return SAR report by id', async () => {
      const db = makeMockDb([[DB_SAR_ROW]]);
      const service = new SARService(db as never);

      const result = await service.findById(SAR_ID);

      expect(result.id).toBe(SAR_ID);
      expect(result.narrative).toBe('Suspicious structuring pattern detected');
    });

    it('should throw NotFoundError when SAR does not exist', async () => {
      const db = makeMockDb([[]]);
      const service = new SARService(db as never);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  // ─── listSARs ─────────────────────────────────────────────────────────────

  describe('listSARs', () => {
    it('should return reports with total', async () => {
      const db = makeMockDb([[{ count: '2' }], [DB_SAR_ROW, DB_SAR_ROW]]);
      const service = new SARService(db as never);

      const result = await service.listSARs({ limit: 20, offset: 0 });

      expect(result.total).toBe(2);
      expect(result.reports).toHaveLength(2);
    });

    it('should filter by status', async () => {
      const db = makeMockDb([[{ count: '0' }], []]);
      const service = new SARService(db as never);

      await service.listSARs({ limit: 20, offset: 0, status: 'draft' });

      const [countSql] = (db.query as jest.Mock).mock.calls[0] as [string];
      expect(countSql).toContain('status');
    });

    it('should filter by triggerType', async () => {
      const db = makeMockDb([[{ count: '0' }], []]);
      const service = new SARService(db as never);

      await service.listSARs({ limit: 20, offset: 0, triggerType: 'aml_alert' });

      const [countSql] = (db.query as jest.Mock).mock.calls[0] as [string];
      expect(countSql).toContain('trigger_type');
    });

    it('should filter by institutionId', async () => {
      const db = makeMockDb([[{ count: '0' }], []]);
      const service = new SARService(db as never);

      await service.listSARs({ limit: 20, offset: 0, institutionId: INSTITUTION_ID });

      const [countSql] = (db.query as jest.Mock).mock.calls[0] as [string];
      expect(countSql).toContain('institution_id');
    });

    it('should pass limit and offset', async () => {
      const db = makeMockDb([[{ count: '0' }], []]);
      const service = new SARService(db as never);

      await service.listSARs({ limit: 10, offset: 5 });

      const params = (db.query as jest.Mock).mock.calls[1][1] as unknown[];
      expect(params).toContain(10);
      expect(params).toContain(5);
    });

    it('should order by created_at DESC', async () => {
      const db = makeMockDb([[{ count: '0' }], []]);
      const service = new SARService(db as never);

      await service.listSARs({ limit: 20, offset: 0 });

      const [dataSql] = (db.query as jest.Mock).mock.calls[1] as [string];
      expect(dataSql).toContain('ORDER BY created_at DESC');
    });
  });

  // ─── submitSAR ────────────────────────────────────────────────────────────

  describe('submitSAR', () => {
    it('should transition draft SAR to pending_review', async () => {
      const db = makeMockDb([
        [DB_SAR_ROW], // findById
        [{ ...DB_SAR_ROW, status: 'pending_review' }], // update
      ]);
      const service = new SARService(db as never);

      const result = await service.submitSAR(SAR_ID);

      expect(result.status).toBe('pending_review');
    });

    it('should throw NotFoundError when SAR does not exist', async () => {
      const db = makeMockDb([[]]);
      const service = new SARService(db as never);

      await expect(service.submitSAR('nonexistent')).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when SAR is not in draft status', async () => {
      const db = makeMockDb([[PENDING_SAR_ROW]]);
      const service = new SARService(db as never);

      await expect(service.submitSAR(SAR_ID)).rejects.toThrow(ValidationError);
    });
  });

  // ─── reviewSAR ────────────────────────────────────────────────────────────

  describe('reviewSAR', () => {
    it('should approve a pending_review SAR', async () => {
      const db = makeMockDb([
        [PENDING_SAR_ROW], // findById
        [{ ...PENDING_SAR_ROW, status: 'approved', reviewedBy: REVIEWER_ID }], // update
      ]);
      const service = new SARService(db as never);

      const result = await service.reviewSAR(SAR_ID, {
        reviewedBy: REVIEWER_ID,
        status: 'approved',
        notes: 'Approved for filing',
      });

      expect(result.status).toBe('approved');
    });

    it('should reject a pending_review SAR', async () => {
      const db = makeMockDb([
        [PENDING_SAR_ROW],
        [{ ...PENDING_SAR_ROW, status: 'rejected', reviewedBy: REVIEWER_ID }],
      ]);
      const service = new SARService(db as never);

      const result = await service.reviewSAR(SAR_ID, {
        reviewedBy: REVIEWER_ID,
        status: 'rejected',
        notes: 'Insufficient evidence',
      });

      expect(result.status).toBe('rejected');
    });

    it('should throw NotFoundError when SAR does not exist', async () => {
      const db = makeMockDb([[]]);
      const service = new SARService(db as never);

      await expect(
        service.reviewSAR('nonexistent', {
          reviewedBy: REVIEWER_ID,
          status: 'approved',
          notes: 'Test',
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when SAR is not in pending_review status', async () => {
      const db = makeMockDb([[DB_SAR_ROW]]); // draft status
      const service = new SARService(db as never);

      await expect(
        service.reviewSAR(SAR_ID, {
          reviewedBy: REVIEWER_ID,
          status: 'approved',
          notes: 'Test',
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('should pass review data to update query', async () => {
      const db = makeMockDb([
        [PENDING_SAR_ROW],
        [{ ...PENDING_SAR_ROW, status: 'approved' }],
      ]);
      const service = new SARService(db as never);

      await service.reviewSAR(SAR_ID, {
        reviewedBy: REVIEWER_ID,
        status: 'approved',
        notes: 'Looks good',
      });

      const updateCall = (db.query as jest.Mock).mock.calls[1];
      const [sql, params] = updateCall as [string, unknown[]];
      expect(sql).toContain('UPDATE sar_reports');
      expect(params).toContain('approved');
      expect(params).toContain(REVIEWER_ID);
      expect(params).toContain('Looks good');
    });
  });

  // ─── fileSAR ──────────────────────────────────────────────────────────────

  describe('fileSAR', () => {
    it('should file an approved SAR', async () => {
      const db = makeMockDb([
        [APPROVED_SAR_ROW], // findById
        [{ ...APPROVED_SAR_ROW, status: 'filed', filingReference: 'SAR-2025-001' }], // update
      ]);
      const service = new SARService(db as never);

      const result = await service.fileSAR(SAR_ID, {
        filingReference: 'SAR-2025-001',
      });

      expect(result.status).toBe('filed');
      expect(result.filingReference).toBe('SAR-2025-001');
    });

    it('should accept filing confirmation data', async () => {
      const db = makeMockDb([
        [APPROVED_SAR_ROW],
        [{ ...APPROVED_SAR_ROW, status: 'filed' }],
      ]);
      const service = new SARService(db as never);

      await service.fileSAR(SAR_ID, {
        filingReference: 'SAR-2025-001',
        filingConfirmation: { confirmationNumber: 'CONF-123' },
      });

      const params = (db.query as jest.Mock).mock.calls[1][1] as unknown[];
      expect(params[0]).toBe('SAR-2025-001');
      expect(JSON.parse(params[1] as string)).toEqual({ confirmationNumber: 'CONF-123' });
    });

    it('should throw NotFoundError when SAR does not exist', async () => {
      const db = makeMockDb([[]]);
      const service = new SARService(db as never);

      await expect(
        service.fileSAR('nonexistent', { filingReference: 'SAR-001' }),
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when SAR is not in approved status', async () => {
      const db = makeMockDb([[PENDING_SAR_ROW]]); // pending_review, not approved
      const service = new SARService(db as never);

      await expect(
        service.fileSAR(SAR_ID, { filingReference: 'SAR-001' }),
      ).rejects.toThrow(ValidationError);
    });

    it('should set filing_confirmation to null when not provided', async () => {
      const db = makeMockDb([
        [APPROVED_SAR_ROW],
        [{ ...APPROVED_SAR_ROW, status: 'filed' }],
      ]);
      const service = new SARService(db as never);

      await service.fileSAR(SAR_ID, {
        filingReference: 'SAR-2025-001',
      });

      const params = (db.query as jest.Mock).mock.calls[1][1] as unknown[];
      expect(params[1]).toBeNull(); // filingConfirmation
    });
  });
});
