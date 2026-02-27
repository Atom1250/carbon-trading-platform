import { InstitutionService } from './InstitutionService';
import { NotFoundError, ConflictError } from '@libs/errors';

jest.mock('@libs/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

const INSTITUTION_ID = '550e8400-e29b-41d4-a716-446655440000';

const DB_ROW = {
  id: INSTITUTION_ID,
  name: 'Green Capital',
  legalName: 'Green Capital Ltd',
  registrationNumber: 'REG-001',
  tier: 'tier2',
  status: 'pending',
  countryCode: 'GB',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
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

describe('InstitutionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should insert and return institution when no dup registration number', async () => {
      const db = makeMockDb([
        [],          // dup-check returns empty
        [DB_ROW],    // INSERT RETURNING
      ]);
      const service = new InstitutionService(db as never);

      const result = await service.create({
        name: 'Green Capital',
        legalName: 'Green Capital Ltd',
        registrationNumber: 'REG-001',
        tier: 'tier2',
        countryCode: 'GB',
      });

      expect(result).toEqual(DB_ROW);
      expect(db.query).toHaveBeenCalledTimes(3);
      const [insertSql, insertParams] = (db.query as jest.Mock).mock.calls[1] as [string, unknown[]];
      expect(insertSql).toContain('INSERT INTO institutions');
      expect(insertParams).toContain('Green Capital');
      expect(insertParams).toContain('tier2');
    });

    it('should skip dup-check when registrationNumber is not provided', async () => {
      const db = makeMockDb([[DB_ROW]]);
      const service = new InstitutionService(db as never);

      await service.create({
        name: 'Anon Corp',
        legalName: 'Anon Corp Ltd',
        tier: 'tier3',
        countryCode: 'US',
      });

      expect(db.query).toHaveBeenCalledTimes(2);
      const [sql] = (db.query as jest.Mock).mock.calls[0] as [string];
      expect(sql).toContain('INSERT INTO institutions');
    });

    it('should throw ConflictError when registration number already exists', async () => {
      const db = makeMockDb([[DB_ROW]]);  // dup-check returns a row
      const service = new InstitutionService(db as never);

      await expect(
        service.create({
          name: 'Duplicate Corp',
          legalName: 'Duplicate Corp Ltd',
          registrationNumber: 'REG-001',
          tier: 'tier1',
          countryCode: 'DE',
        }),
      ).rejects.toThrow(ConflictError);
    });

    it('should insert null when registrationNumber is undefined', async () => {
      const db = makeMockDb([[DB_ROW]]);
      const service = new InstitutionService(db as never);

      await service.create({
        name: 'No Reg',
        legalName: 'No Reg Ltd',
        tier: 'tier4',
        countryCode: 'FR',
      });

      const [, params] = (db.query as jest.Mock).mock.calls[0] as [string, unknown[]];
      expect(params).toContain(null);
    });
  });

  // ─── findById ────────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('should return institution when found', async () => {
      const db = makeMockDb([[DB_ROW]]);
      const service = new InstitutionService(db as never);

      const result = await service.findById(INSTITUTION_ID);

      expect(result).toEqual(DB_ROW);
      const [sql, params] = (db.query as jest.Mock).mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('FROM institutions WHERE id = $1');
      expect(params[0]).toBe(INSTITUTION_ID);
    });

    it('should throw NotFoundError when institution does not exist', async () => {
      const db = makeMockDb([[]]);
      const service = new InstitutionService(db as never);

      await expect(service.findById('non-existent-id')).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError with statusCode 404', async () => {
      const db = makeMockDb([[]]);
      const service = new InstitutionService(db as never);

      const err = await service.findById('bad-id').catch((e) => e);
      expect(err.statusCode).toBe(404);
    });
  });

  // ─── update ──────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update tier and return updated institution', async () => {
      const updated = { ...DB_ROW, tier: 'tier1' };
      const db = makeMockDb([[DB_ROW], [updated]]);
      const service = new InstitutionService(db as never);

      const result = await service.update(INSTITUTION_ID, { tier: 'tier1' });

      expect(result.tier).toBe('tier1');
      const [sql, params] = (db.query as jest.Mock).mock.calls[1] as [string, unknown[]];
      expect(sql).toContain('UPDATE institutions');
      expect(sql).toContain('tier = $1');
      expect(params).toContain('tier1');
    });

    it('should update status and return updated institution', async () => {
      const updated = { ...DB_ROW, status: 'active' };
      const db = makeMockDb([[DB_ROW], [updated]]);
      const service = new InstitutionService(db as never);

      const result = await service.update(INSTITUTION_ID, { status: 'active' });

      expect(result.status).toBe('active');
      const [sql] = (db.query as jest.Mock).mock.calls[1] as [string];
      expect(sql).toContain('status = $1');
    });

    it('should update both tier and status', async () => {
      const updated = { ...DB_ROW, tier: 'tier1', status: 'active' };
      const db = makeMockDb([[DB_ROW], [updated]]);
      const service = new InstitutionService(db as never);

      const result = await service.update(INSTITUTION_ID, { tier: 'tier1', status: 'active' });

      expect(result.tier).toBe('tier1');
      expect(result.status).toBe('active');
    });

    it('should throw NotFoundError if institution does not exist', async () => {
      const db = makeMockDb([[]]);  // findById returns empty
      const service = new InstitutionService(db as never);

      await expect(service.update('bad-id', { status: 'active' })).rejects.toThrow(NotFoundError);
    });
  });

  // ─── list ────────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('should return institutions and total with no filters', async () => {
      const db = makeMockDb([[{ count: '3' }], [DB_ROW, DB_ROW, DB_ROW]]);
      const service = new InstitutionService(db as never);

      const result = await service.list({ limit: 20, offset: 0 });

      expect(result.total).toBe(3);
      expect(result.institutions).toHaveLength(3);
    });

    it('should pass status filter to query', async () => {
      const db = makeMockDb([[{ count: '1' }], [DB_ROW]]);
      const service = new InstitutionService(db as never);

      await service.list({ status: 'pending', limit: 20, offset: 0 });

      const [countSql, countParams] = (db.query as jest.Mock).mock.calls[0] as [string, unknown[]];
      expect(countSql).toContain('status = $1');
      expect(countParams[0]).toBe('pending');
    });

    it('should pass tier filter to query', async () => {
      const db = makeMockDb([[{ count: '1' }], [DB_ROW]]);
      const service = new InstitutionService(db as never);

      await service.list({ tier: 'tier2', limit: 20, offset: 0 });

      const [countSql, countParams] = (db.query as jest.Mock).mock.calls[0] as [string, unknown[]];
      expect(countSql).toContain('tier = $1');
      expect(countParams[0]).toBe('tier2');
    });

    it('should uppercase countryCode filter', async () => {
      const db = makeMockDb([[{ count: '1' }], [DB_ROW]]);
      const service = new InstitutionService(db as never);

      await service.list({ countryCode: 'gb', limit: 20, offset: 0 });

      const [, countParams] = (db.query as jest.Mock).mock.calls[0] as [string, unknown[]];
      expect(countParams).toContain('GB');
    });

    it('should pass limit and offset as final params to data query', async () => {
      const db = makeMockDb([[{ count: '5' }], [DB_ROW]]);
      const service = new InstitutionService(db as never);

      await service.list({ limit: 10, offset: 30 });

      const [dataSql, dataParams] = (db.query as jest.Mock).mock.calls[1] as [string, unknown[]];
      expect(dataSql).toContain('LIMIT $1 OFFSET $2');
      expect(dataParams[0]).toBe(10);
      expect(dataParams[1]).toBe(30);
    });

    it('should use correct param numbers with filters applied', async () => {
      const db = makeMockDb([[{ count: '2' }], [DB_ROW, DB_ROW]]);
      const service = new InstitutionService(db as never);

      await service.list({ status: 'active', tier: 'tier1', limit: 5, offset: 0 });

      const [dataSql, dataParams] = (db.query as jest.Mock).mock.calls[1] as [string, unknown[]];
      // status=$1, tier=$2, limit=$3, offset=$4
      expect(dataSql).toContain('LIMIT $3 OFFSET $4');
      expect(dataParams[0]).toBe('active');
      expect(dataParams[1]).toBe('tier1');
      expect(dataParams[2]).toBe(5);
      expect(dataParams[3]).toBe(0);
    });

    it('should return empty list when no institutions match', async () => {
      const db = makeMockDb([[{ count: '0' }], []]);
      const service = new InstitutionService(db as never);

      const result = await service.list({ limit: 20, offset: 0 });

      expect(result.total).toBe(0);
      expect(result.institutions).toHaveLength(0);
    });
  });
});
