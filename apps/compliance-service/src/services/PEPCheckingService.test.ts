import { PEPCheckingService } from './PEPCheckingService';
import { NotFoundError, ValidationError } from '@libs/errors';

const PEP_CHECK_ID = '550e8400-e29b-41d4-a716-446655440000';
const INSTITUTION_ID = '660e8400-e29b-41d4-a716-446655440000';
const BENEFICIAL_OWNER_ID = '770e8400-e29b-41d4-a716-446655440000';
const REVIEWER_ID = '880e8400-e29b-41d4-a716-446655440000';

const DB_PEP_CHECK_ROW = {
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
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

const PEP_IDENTIFIED_ROW = {
  ...DB_PEP_CHECK_ROW,
  status: 'pep_identified',
  isPep: true,
  pepCategory: 'government_official',
  riskLevel: 'high',
  eddRequired: true,
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

describe('PEPCheckingService', () => {
  // ─── checkIndividual ──────────────────────────────────────────────────────

  describe('checkIndividual', () => {
    it('should return clear status for non-PEP individual', async () => {
      const db = makeMockDb([[{ ...DB_PEP_CHECK_ROW, status: 'clear', isPep: false }]]);
      const service = new PEPCheckingService(db as never);

      const result = await service.checkIndividual({
        individualName: 'John Smith',
      });

      expect(result.status).toBe('clear');
      expect(result.isPep).toBe(false);
    });

    it('should insert pep check into database', async () => {
      const db = makeMockDb([[DB_PEP_CHECK_ROW]]);
      const service = new PEPCheckingService(db as never);

      await service.checkIndividual({
        individualName: 'John Smith',
      });

      expect(db.query).toHaveBeenCalled();
      const [sql] = (db.query as jest.Mock).mock.calls[0] as [string];
      expect(sql).toContain('INSERT INTO pep_checks');
    });

    it('should detect PEP match for similar names', async () => {
      const db = makeMockDb([
        [{ ...PEP_IDENTIFIED_ROW, id: PEP_CHECK_ID }],
      ]);
      const service = new PEPCheckingService(db as never);

      await service.checkIndividual({
        individualName: 'JOHN GOVERNMENT OFFICIAL',
      });

      const insertCall = (db.query as jest.Mock).mock.calls[0];
      const params = insertCall[1] as unknown[];
      // status should be pep_identified
      expect(params[5]).toBe('pep_identified');
      // is_pep should be true
      expect(params[6]).toBe(true);
    });

    it('should set pep_category when match found', async () => {
      const db = makeMockDb([
        [{ ...PEP_IDENTIFIED_ROW }],
      ]);
      const service = new PEPCheckingService(db as never);

      await service.checkIndividual({
        individualName: 'JOHN GOVERNMENT OFFICIAL',
      });

      const params = (db.query as jest.Mock).mock.calls[0][1] as unknown[];
      // pep_category
      expect(params[7]).toBe('government_official');
    });

    it('should store pep details as JSON', async () => {
      const db = makeMockDb([
        [{ ...PEP_IDENTIFIED_ROW }],
      ]);
      const service = new PEPCheckingService(db as never);

      await service.checkIndividual({
        individualName: 'JOHN GOVERNMENT OFFICIAL',
      });

      const params = (db.query as jest.Mock).mock.calls[0][1] as unknown[];
      const pepDetails = JSON.parse(params[8] as string);
      expect(pepDetails.matchedName).toBe('JOHN GOVERNMENT OFFICIAL');
      expect(pepDetails.position).toBe('Senator');
    });

    it('should update beneficial_owners.is_pep when PEP match found with beneficialOwnerId', async () => {
      const db = makeMockDb([
        [{ ...PEP_IDENTIFIED_ROW }],
        [], // beneficial_owners update
      ]);
      const service = new PEPCheckingService(db as never);

      await service.checkIndividual({
        individualName: 'JOHN GOVERNMENT OFFICIAL',
        beneficialOwnerId: BENEFICIAL_OWNER_ID,
      });

      const allCalls = (db.query as jest.Mock).mock.calls;
      const updateCall = allCalls.find((c: [string]) => c[0].includes('UPDATE beneficial_owners'));
      expect(updateCall).toBeDefined();
      expect(updateCall[1]).toContain(BENEFICIAL_OWNER_ID);
    });

    it('should not update beneficial_owners when no PEP match', async () => {
      const db = makeMockDb([[DB_PEP_CHECK_ROW]]);
      const service = new PEPCheckingService(db as never);

      await service.checkIndividual({
        individualName: 'John Smith',
        beneficialOwnerId: BENEFICIAL_OWNER_ID,
      });

      const allCalls = (db.query as jest.Mock).mock.calls;
      const updateCall = allCalls.find((c: [string]) => c[0].includes('UPDATE beneficial_owners'));
      expect(updateCall).toBeUndefined();
    });

    it('should pass optional fields to insert', async () => {
      const db = makeMockDb([[DB_PEP_CHECK_ROW]]);
      const service = new PEPCheckingService(db as never);

      await service.checkIndividual({
        individualName: 'Jane Smith',
        dateOfBirth: '1990-01-15',
        nationality: 'US',
        beneficialOwnerId: BENEFICIAL_OWNER_ID,
        institutionId: INSTITUTION_ID,
        checkedBy: REVIEWER_ID,
      });

      const params = (db.query as jest.Mock).mock.calls[0][1] as unknown[];
      expect(params[0]).toBe(BENEFICIAL_OWNER_ID);
      expect(params[2]).toBe('1990-01-15');
      expect(params[3]).toBe('US');
      expect(params[4]).toBe(INSTITUTION_ID);
      expect(params[10]).toBe(REVIEWER_ID);
    });

    it('should set null for missing optional fields', async () => {
      const db = makeMockDb([[DB_PEP_CHECK_ROW]]);
      const service = new PEPCheckingService(db as never);

      await service.checkIndividual({
        individualName: 'John Smith',
      });

      const params = (db.query as jest.Mock).mock.calls[0][1] as unknown[];
      expect(params[0]).toBeNull(); // beneficialOwnerId
      expect(params[2]).toBeNull(); // dateOfBirth
      expect(params[3]).toBeNull(); // nationality
      expect(params[4]).toBeNull(); // institutionId
      expect(params[10]).toBeNull(); // checkedBy
    });

    it('should set edd_required to true when PEP match found', async () => {
      const db = makeMockDb([[PEP_IDENTIFIED_ROW]]);
      const service = new PEPCheckingService(db as never);

      await service.checkIndividual({
        individualName: 'JOHN GOVERNMENT OFFICIAL',
      });

      const params = (db.query as jest.Mock).mock.calls[0][1] as unknown[];
      expect(params[11]).toBe(true); // edd_required
    });
  });

  // ─── findById ─────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('should return PEP check by id', async () => {
      const db = makeMockDb([[DB_PEP_CHECK_ROW]]);
      const service = new PEPCheckingService(db as never);

      const result = await service.findById(PEP_CHECK_ID);

      expect(result.id).toBe(PEP_CHECK_ID);
      expect(result.individualName).toBe('John Smith');
    });

    it('should throw NotFoundError when PEP check does not exist', async () => {
      const db = makeMockDb([[]]);
      const service = new PEPCheckingService(db as never);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundError);
    });

    it('should query pep_checks table', async () => {
      const db = makeMockDb([[DB_PEP_CHECK_ROW]]);
      const service = new PEPCheckingService(db as never);

      await service.findById(PEP_CHECK_ID);

      const [sql] = (db.query as jest.Mock).mock.calls[0] as [string];
      expect(sql).toContain('FROM pep_checks');
    });
  });

  // ─── listChecks ───────────────────────────────────────────────────────────

  describe('listChecks', () => {
    it('should return checks with total', async () => {
      const db = makeMockDb([[{ count: '2' }], [DB_PEP_CHECK_ROW, DB_PEP_CHECK_ROW]]);
      const service = new PEPCheckingService(db as never);

      const result = await service.listChecks({ limit: 20, offset: 0 });

      expect(result.total).toBe(2);
      expect(result.checks).toHaveLength(2);
    });

    it('should filter by institutionId', async () => {
      const db = makeMockDb([[{ count: '1' }], [DB_PEP_CHECK_ROW]]);
      const service = new PEPCheckingService(db as never);

      await service.listChecks({ limit: 20, offset: 0, institutionId: INSTITUTION_ID });

      const [countSql] = (db.query as jest.Mock).mock.calls[0] as [string];
      expect(countSql).toContain('institution_id');
    });

    it('should filter by status', async () => {
      const db = makeMockDb([[{ count: '0' }], []]);
      const service = new PEPCheckingService(db as never);

      await service.listChecks({ limit: 20, offset: 0, status: 'pep_identified' });

      const [countSql] = (db.query as jest.Mock).mock.calls[0] as [string];
      expect(countSql).toContain('status');
    });

    it('should filter by isPep', async () => {
      const db = makeMockDb([[{ count: '0' }], []]);
      const service = new PEPCheckingService(db as never);

      await service.listChecks({ limit: 20, offset: 0, isPep: true });

      const [countSql] = (db.query as jest.Mock).mock.calls[0] as [string];
      expect(countSql).toContain('is_pep');
    });

    it('should pass limit and offset', async () => {
      const db = makeMockDb([[{ count: '0' }], []]);
      const service = new PEPCheckingService(db as never);

      await service.listChecks({ limit: 10, offset: 5 });

      const params = (db.query as jest.Mock).mock.calls[1][1] as unknown[];
      expect(params).toContain(10);
      expect(params).toContain(5);
    });

    it('should order by created_at DESC', async () => {
      const db = makeMockDb([[{ count: '0' }], []]);
      const service = new PEPCheckingService(db as never);

      await service.listChecks({ limit: 20, offset: 0 });

      const [dataSql] = (db.query as jest.Mock).mock.calls[1] as [string];
      expect(dataSql).toContain('ORDER BY created_at DESC');
    });
  });

  // ─── completeReview ───────────────────────────────────────────────────────

  describe('completeReview', () => {
    it('should update PEP check to edd_completed', async () => {
      const db = makeMockDb([
        [PEP_IDENTIFIED_ROW],
        [{ ...PEP_IDENTIFIED_ROW, status: 'edd_completed', reviewedBy: REVIEWER_ID }],
      ]);
      const service = new PEPCheckingService(db as never);

      const result = await service.completeReview(PEP_CHECK_ID, {
        reviewedBy: REVIEWER_ID,
        status: 'edd_completed',
        notes: 'Enhanced due diligence completed successfully',
      });

      expect(result.status).toBe('edd_completed');
    });

    it('should update PEP check to edd_failed', async () => {
      const db = makeMockDb([
        [PEP_IDENTIFIED_ROW],
        [{ ...PEP_IDENTIFIED_ROW, status: 'edd_failed', reviewedBy: REVIEWER_ID }],
      ]);
      const service = new PEPCheckingService(db as never);

      const result = await service.completeReview(PEP_CHECK_ID, {
        reviewedBy: REVIEWER_ID,
        status: 'edd_failed',
        notes: 'Unable to verify identity',
      });

      expect(result.status).toBe('edd_failed');
    });

    it('should throw NotFoundError when PEP check does not exist', async () => {
      const db = makeMockDb([[]]);
      const service = new PEPCheckingService(db as never);

      await expect(
        service.completeReview('nonexistent', {
          reviewedBy: REVIEWER_ID,
          status: 'edd_completed',
          notes: 'Test',
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when PEP check is in clear status', async () => {
      const db = makeMockDb([[{ ...DB_PEP_CHECK_ROW, status: 'clear' }]]);
      const service = new PEPCheckingService(db as never);

      await expect(
        service.completeReview(PEP_CHECK_ID, {
          reviewedBy: REVIEWER_ID,
          status: 'edd_completed',
          notes: 'Test',
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('should pass review data to update query', async () => {
      const db = makeMockDb([
        [PEP_IDENTIFIED_ROW],
        [{ ...PEP_IDENTIFIED_ROW, status: 'edd_completed' }],
      ]);
      const service = new PEPCheckingService(db as never);

      await service.completeReview(PEP_CHECK_ID, {
        reviewedBy: REVIEWER_ID,
        status: 'edd_completed',
        notes: 'All checks passed',
      });

      const updateCall = (db.query as jest.Mock).mock.calls[1];
      const [sql, params] = updateCall as [string, unknown[]];
      expect(sql).toContain('UPDATE pep_checks');
      expect(params).toContain('edd_completed');
      expect(params).toContain(REVIEWER_ID);
      expect(params).toContain('All checks passed');
    });
  });

  // ─── Matching logic ───────────────────────────────────────────────────────

  describe('matching logic', () => {
    it('should return clear for completely different names', async () => {
      const db = makeMockDb([[{ ...DB_PEP_CHECK_ROW, status: 'clear', isPep: false }]]);
      const service = new PEPCheckingService(db as never);

      await service.checkIndividual({
        individualName: 'Completely Different Name XYZ',
      });

      const params = (db.query as jest.Mock).mock.calls[0][1] as unknown[];
      expect(params[5]).toBe('clear'); // status
      expect(params[6]).toBe(false); // is_pep
    });

    it('should normalize names for comparison (case insensitive)', async () => {
      const db = makeMockDb([
        [{ ...PEP_IDENTIFIED_ROW }],
      ]);
      const service = new PEPCheckingService(db as never);

      await service.checkIndividual({
        individualName: 'john government official', // lowercase
      });

      const params = (db.query as jest.Mock).mock.calls[0][1] as unknown[];
      expect(params[6]).toBe(true); // is_pep should still match
    });
  });
});
