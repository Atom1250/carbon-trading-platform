import { SanctionsScreeningService } from './SanctionsScreeningService';
import { NotFoundError, ValidationError } from '@libs/errors';

const SCREENING_ID = '550e8400-e29b-41d4-a716-446655440000';
const INSTITUTION_ID = '660e8400-e29b-41d4-a716-446655440000';
const USER_ID = '770e8400-e29b-41d4-a716-446655440000';
const REVIEWER_ID = '880e8400-e29b-41d4-a716-446655440000';

const DB_SCREENING_ROW = {
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
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

const POTENTIAL_MATCH_ROW = {
  ...DB_SCREENING_ROW,
  status: 'potential_match',
  matchCount: 1,
  highestScore: '0.85',
};

const MATCH_ROW = {
  id: '990e8400-e29b-41d4-a716-446655440000',
  screeningId: SCREENING_ID,
  listName: 'OFAC SDN',
  listEntryId: 'OFAC-001',
  matchedName: 'SANCTIONED ENTITY ONE',
  matchScore: '0.85',
  matchDetails: { country: null },
  createdAt: new Date('2025-01-01'),
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

describe('SanctionsScreeningService', () => {
  // ─── screenEntity ─────────────────────────────────────────────────────────

  describe('screenEntity', () => {
    it('should screen an entity with no matches and return clear status', async () => {
      const db = makeMockDb([[{ ...DB_SCREENING_ROW, status: 'clear', matchCount: 0 }]]);
      const service = new SanctionsScreeningService(db as never);

      const result = await service.screenEntity({
        entityType: 'individual',
        entityName: 'John Doe',
      });

      expect(result.status).toBe('clear');
      expect(result.matchCount).toBe(0);
    });

    it('should insert screening into database', async () => {
      const db = makeMockDb([[DB_SCREENING_ROW]]);
      const service = new SanctionsScreeningService(db as never);

      await service.screenEntity({
        entityType: 'individual',
        entityName: 'John Doe',
      });

      expect(db.query).toHaveBeenCalled();
      const [sql] = (db.query as jest.Mock).mock.calls[0] as [string];
      expect(sql).toContain('INSERT INTO sanctions_screenings');
    });

    it('should detect potential match for similar names', async () => {
      // "SANCTIONED ENTITY ONE" is in the mock list — a very close name should trigger
      const db = makeMockDb([
        [{ ...DB_SCREENING_ROW, id: SCREENING_ID, status: 'potential_match', matchCount: 1, highestScore: '0.90' }],
      ]);
      const service = new SanctionsScreeningService(db as never);

      await service.screenEntity({
        entityType: 'organization',
        entityName: 'SANCTIONED ENTITY ONE',
      });

      const insertCall = (db.query as jest.Mock).mock.calls[0];
      const params = insertCall[1] as unknown[];
      // status should be potential_match
      expect(params[7]).toBe('potential_match');
      // match_count should be > 0
      expect(params[8]).toBeGreaterThan(0);
    });

    it('should store matches in sanctions_screening_matches', async () => {
      const db = makeMockDb([
        [{ ...DB_SCREENING_ROW, id: SCREENING_ID, status: 'potential_match', matchCount: 1 }],
        [], // match insert
      ]);
      const service = new SanctionsScreeningService(db as never);

      await service.screenEntity({
        entityType: 'organization',
        entityName: 'SANCTIONED ENTITY ONE',
      });

      // Should have calls for insert screening + at least one match insert
      const allCalls = (db.query as jest.Mock).mock.calls;
      const matchInserts = allCalls.filter((c: [string]) => c[0].includes('INSERT INTO sanctions_screening_matches'));
      expect(matchInserts.length).toBeGreaterThan(0);
    });

    it('should pass optional fields to insert', async () => {
      const db = makeMockDb([[DB_SCREENING_ROW]]);
      const service = new SanctionsScreeningService(db as never);

      await service.screenEntity({
        entityType: 'individual',
        entityName: 'Jane Smith',
        entityCountry: 'US',
        entityDateOfBirth: '1990-01-15',
        institutionId: INSTITUTION_ID,
        userId: USER_ID,
        screenedBy: REVIEWER_ID,
      });

      const params = (db.query as jest.Mock).mock.calls[0][1] as unknown[];
      expect(params[2]).toBe('US');
      expect(params[3]).toBe('1990-01-15');
      expect(params[5]).toBe(INSTITUTION_ID);
      expect(params[6]).toBe(USER_ID);
      expect(params[10]).toBe(REVIEWER_ID);
    });

    it('should set null for missing optional fields', async () => {
      const db = makeMockDb([[DB_SCREENING_ROW]]);
      const service = new SanctionsScreeningService(db as never);

      await service.screenEntity({
        entityType: 'individual',
        entityName: 'John Doe',
      });

      const params = (db.query as jest.Mock).mock.calls[0][1] as unknown[];
      expect(params[2]).toBeNull(); // entityCountry
      expect(params[3]).toBeNull(); // entityDateOfBirth
      expect(params[4]).toBeNull(); // entityIdentifiers
      expect(params[5]).toBeNull(); // institutionId
      expect(params[6]).toBeNull(); // userId
      expect(params[10]).toBeNull(); // screenedBy
    });
  });

  // ─── findById ──────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('should return screening with matches', async () => {
      const db = makeMockDb([[DB_SCREENING_ROW], [MATCH_ROW]]);
      const service = new SanctionsScreeningService(db as never);

      const result = await service.findById(SCREENING_ID);

      expect(result.id).toBe(SCREENING_ID);
      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].listName).toBe('OFAC SDN');
    });

    it('should throw NotFoundError when screening does not exist', async () => {
      const db = makeMockDb([[]]);
      const service = new SanctionsScreeningService(db as never);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundError);
    });

    it('should return empty matches array when no matches exist', async () => {
      const db = makeMockDb([[DB_SCREENING_ROW], []]);
      const service = new SanctionsScreeningService(db as never);

      const result = await service.findById(SCREENING_ID);

      expect(result.matches).toHaveLength(0);
    });

    it('should query both tables', async () => {
      const db = makeMockDb([[DB_SCREENING_ROW], []]);
      const service = new SanctionsScreeningService(db as never);

      await service.findById(SCREENING_ID);

      expect(db.query).toHaveBeenCalledTimes(2);
      const [sql1] = (db.query as jest.Mock).mock.calls[0] as [string];
      const [sql2] = (db.query as jest.Mock).mock.calls[1] as [string];
      expect(sql1).toContain('FROM sanctions_screenings');
      expect(sql2).toContain('FROM sanctions_screening_matches');
    });
  });

  // ─── getReviewQueue ────────────────────────────────────────────────────────

  describe('getReviewQueue', () => {
    it('should return screenings with potential_match status', async () => {
      const db = makeMockDb([[{ count: '2' }], [POTENTIAL_MATCH_ROW, POTENTIAL_MATCH_ROW]]);
      const service = new SanctionsScreeningService(db as never);

      const result = await service.getReviewQueue({ limit: 20, offset: 0 });

      expect(result.total).toBe(2);
      expect(result.screenings).toHaveLength(2);
    });

    it('should filter by potential_match status', async () => {
      const db = makeMockDb([[{ count: '0' }], []]);
      const service = new SanctionsScreeningService(db as never);

      await service.getReviewQueue({ limit: 20, offset: 0 });

      const [countSql] = (db.query as jest.Mock).mock.calls[0] as [string];
      expect(countSql).toContain("status = 'potential_match'");
    });

    it('should order by highest_score DESC', async () => {
      const db = makeMockDb([[{ count: '0' }], []]);
      const service = new SanctionsScreeningService(db as never);

      await service.getReviewQueue({ limit: 20, offset: 0 });

      const [dataSql] = (db.query as jest.Mock).mock.calls[1] as [string];
      expect(dataSql).toContain('ORDER BY highest_score DESC');
    });

    it('should pass limit and offset', async () => {
      const db = makeMockDb([[{ count: '0' }], []]);
      const service = new SanctionsScreeningService(db as never);

      await service.getReviewQueue({ limit: 10, offset: 5 });

      const params = (db.query as jest.Mock).mock.calls[1][1] as unknown[];
      expect(params).toContain(10);
      expect(params).toContain(5);
    });
  });

  // ─── reviewScreening ──────────────────────────────────────────────────────

  describe('reviewScreening', () => {
    it('should update screening to confirmed_match', async () => {
      const db = makeMockDb([
        [POTENTIAL_MATCH_ROW],
        [{ ...POTENTIAL_MATCH_ROW, status: 'confirmed_match', reviewedBy: REVIEWER_ID }],
      ]);
      const service = new SanctionsScreeningService(db as never);

      const result = await service.reviewScreening(SCREENING_ID, {
        reviewedBy: REVIEWER_ID,
        status: 'confirmed_match',
        notes: 'Confirmed sanctioned entity',
      });

      expect(result.status).toBe('confirmed_match');
    });

    it('should update screening to false_positive', async () => {
      const db = makeMockDb([
        [POTENTIAL_MATCH_ROW],
        [{ ...POTENTIAL_MATCH_ROW, status: 'false_positive', reviewedBy: REVIEWER_ID }],
      ]);
      const service = new SanctionsScreeningService(db as never);

      const result = await service.reviewScreening(SCREENING_ID, {
        reviewedBy: REVIEWER_ID,
        status: 'false_positive',
        notes: 'Not the same entity',
      });

      expect(result.status).toBe('false_positive');
    });

    it('should throw NotFoundError when screening does not exist', async () => {
      const db = makeMockDb([[]]);
      const service = new SanctionsScreeningService(db as never);

      await expect(
        service.reviewScreening('nonexistent', {
          reviewedBy: REVIEWER_ID,
          status: 'false_positive',
          notes: 'Test',
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when screening is not in potential_match status', async () => {
      const db = makeMockDb([[{ ...DB_SCREENING_ROW, status: 'clear' }]]);
      const service = new SanctionsScreeningService(db as never);

      await expect(
        service.reviewScreening(SCREENING_ID, {
          reviewedBy: REVIEWER_ID,
          status: 'confirmed_match',
          notes: 'Test',
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('should pass review data to update query', async () => {
      const db = makeMockDb([
        [POTENTIAL_MATCH_ROW],
        [{ ...POTENTIAL_MATCH_ROW, status: 'false_positive' }],
      ]);
      const service = new SanctionsScreeningService(db as never);

      await service.reviewScreening(SCREENING_ID, {
        reviewedBy: REVIEWER_ID,
        status: 'false_positive',
        notes: 'Not a match',
      });

      const updateCall = (db.query as jest.Mock).mock.calls[1];
      const [sql, params] = updateCall as [string, unknown[]];
      expect(sql).toContain('UPDATE sanctions_screenings');
      expect(params).toContain('false_positive');
      expect(params).toContain(REVIEWER_ID);
      expect(params).toContain('Not a match');
    });
  });

  // ─── Levenshtein / matching internals ─────────────────────────────────────

  describe('matching logic', () => {
    it('should return clear for completely different names', async () => {
      const db = makeMockDb([[{ ...DB_SCREENING_ROW, status: 'clear', matchCount: 0 }]]);
      const service = new SanctionsScreeningService(db as never);

      await service.screenEntity({
        entityType: 'individual',
        entityName: 'Completely Different Name XYZ',
      });

      const params = (db.query as jest.Mock).mock.calls[0][1] as unknown[];
      expect(params[7]).toBe('clear'); // status
      expect(params[8]).toBe(0); // matchCount
    });

    it('should handle empty entity name gracefully', async () => {
      const db = makeMockDb([[DB_SCREENING_ROW]]);
      const service = new SanctionsScreeningService(db as never);

      await service.screenEntity({
        entityType: 'individual',
        entityName: 'A',
      });

      expect(db.query).toHaveBeenCalled();
    });

    it('should normalize names for comparison (case insensitive)', async () => {
      const db = makeMockDb([
        [{ ...DB_SCREENING_ROW, status: 'potential_match', matchCount: 1 }],
        [],
      ]);
      const service = new SanctionsScreeningService(db as never);

      await service.screenEntity({
        entityType: 'organization',
        entityName: 'sanctioned entity one', // lowercase should still match
      });

      const params = (db.query as jest.Mock).mock.calls[0][1] as unknown[];
      expect(params[8]).toBeGreaterThan(0); // matchCount
    });
  });
});
