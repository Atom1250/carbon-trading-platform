import { AssetService } from './AssetService';
import { NotFoundError } from '@libs/errors';

jest.mock('@libs/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

const ASSET_ID = '550e8400-e29b-41d4-a716-446655440000';
const INSTITUTION_ID = '660e8400-e29b-41d4-a716-446655440000';

const DB_ROW = {
  id: ASSET_ID,
  institutionId: INSTITUTION_ID,
  assetType: 'carbon_credit',
  name: 'Green Offset Token',
  description: 'Verified carbon offset from reforestation project',
  status: 'draft',
  tokenId: null,
  mintingTxHash: null,
  mintedAt: null,
  vintage: 2024,
  standard: 'Verra VCS',
  geography: 'Brazil',
  metadataUri: null,
  totalSupply: '10000.00000000',
  availableSupply: '10000.00000000',
  retiredSupply: '0.00000000',
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

describe('AssetService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should insert and return asset', async () => {
      const db = makeMockDb([[DB_ROW]]);
      const service = new AssetService(db as never);

      const result = await service.create({
        institutionId: INSTITUTION_ID,
        assetType: 'carbon_credit',
        name: 'Green Offset Token',
        description: 'Verified carbon offset from reforestation project',
        vintage: 2024,
        standard: 'Verra VCS',
        geography: 'Brazil',
        totalSupply: 10000,
      });

      expect(result).toEqual(DB_ROW);
      expect(db.query).toHaveBeenCalledTimes(1);
      const [sql, params] = (db.query as jest.Mock).mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('INSERT INTO assets');
      expect(params).toContain(INSTITUTION_ID);
      expect(params).toContain('carbon_credit');
      expect(params).toContain('Green Offset Token');
    });

    it('should set available_supply equal to total_supply via $8, $8', async () => {
      const db = makeMockDb([[DB_ROW]]);
      const service = new AssetService(db as never);

      await service.create({
        institutionId: INSTITUTION_ID,
        assetType: 'carbon_credit',
        name: 'Test Token',
        totalSupply: 5000,
      });

      const [sql] = (db.query as jest.Mock).mock.calls[0] as [string];
      // total_supply and available_supply both use $8
      expect(sql).toContain('$8, $8');
    });

    it('should insert null for optional fields when not provided', async () => {
      const db = makeMockDb([[DB_ROW]]);
      const service = new AssetService(db as never);

      await service.create({
        institutionId: INSTITUTION_ID,
        assetType: 'loan_portion',
        name: 'Loan Token',
        totalSupply: 1000,
      });

      const [, params] = (db.query as jest.Mock).mock.calls[0] as [string, unknown[]];
      // description, vintage, standard, geography should be null
      expect(params[3]).toBeNull(); // description
      expect(params[4]).toBeNull(); // vintage
      expect(params[5]).toBeNull(); // standard
      expect(params[6]).toBeNull(); // geography
    });

    it('should pass provided optional fields', async () => {
      const db = makeMockDb([[DB_ROW]]);
      const service = new AssetService(db as never);

      await service.create({
        institutionId: INSTITUTION_ID,
        assetType: 'carbon_credit',
        name: 'Test',
        description: 'A desc',
        vintage: 2023,
        standard: 'Gold Standard',
        geography: 'Kenya',
        totalSupply: 500,
      });

      const [, params] = (db.query as jest.Mock).mock.calls[0] as [string, unknown[]];
      expect(params[3]).toBe('A desc');
      expect(params[4]).toBe(2023);
      expect(params[5]).toBe('Gold Standard');
      expect(params[6]).toBe('Kenya');
    });
  });

  // ─── findById ────────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('should return asset when found', async () => {
      const db = makeMockDb([[DB_ROW]]);
      const service = new AssetService(db as never);

      const result = await service.findById(ASSET_ID);

      expect(result).toEqual(DB_ROW);
      const [sql, params] = (db.query as jest.Mock).mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('FROM assets WHERE id = $1');
      expect(params[0]).toBe(ASSET_ID);
    });

    it('should throw NotFoundError when asset does not exist', async () => {
      const db = makeMockDb([[]]);
      const service = new AssetService(db as never);

      await expect(service.findById('non-existent-id')).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError with statusCode 404', async () => {
      const db = makeMockDb([[]]);
      const service = new AssetService(db as never);

      const err = await service.findById('bad-id').catch((e) => e);
      expect(err.statusCode).toBe(404);
    });
  });

  // ─── update ──────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update name and return updated asset', async () => {
      const updated = { ...DB_ROW, name: 'Updated Name' };
      const db = makeMockDb([[DB_ROW], [updated]]);
      const service = new AssetService(db as never);

      const result = await service.update(ASSET_ID, { name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
      const [sql] = (db.query as jest.Mock).mock.calls[1] as [string];
      expect(sql).toContain('UPDATE assets');
      expect(sql).toContain('name = $1');
    });

    it('should update status', async () => {
      const updated = { ...DB_ROW, status: 'pending_verification' };
      const db = makeMockDb([[DB_ROW], [updated]]);
      const service = new AssetService(db as never);

      const result = await service.update(ASSET_ID, { status: 'pending_verification' });

      expect(result.status).toBe('pending_verification');
    });

    it('should update multiple fields at once', async () => {
      const updated = { ...DB_ROW, name: 'New Name', vintage: 2025, geography: 'India' };
      const db = makeMockDb([[DB_ROW], [updated]]);
      const service = new AssetService(db as never);

      const result = await service.update(ASSET_ID, {
        name: 'New Name',
        vintage: 2025,
        geography: 'India',
      });

      expect(result.name).toBe('New Name');
      expect(result.vintage).toBe(2025);
      expect(result.geography).toBe('India');
    });

    it('should update metadataUri', async () => {
      const updated = { ...DB_ROW, metadataUri: 'ipfs://Qm123' };
      const db = makeMockDb([[DB_ROW], [updated]]);
      const service = new AssetService(db as never);

      const result = await service.update(ASSET_ID, { metadataUri: 'ipfs://Qm123' });

      expect(result.metadataUri).toBe('ipfs://Qm123');
      const [sql] = (db.query as jest.Mock).mock.calls[1] as [string];
      expect(sql).toContain('metadata_uri = $1');
    });

    it('should always set updated_at = NOW()', async () => {
      const db = makeMockDb([[DB_ROW], [DB_ROW]]);
      const service = new AssetService(db as never);

      await service.update(ASSET_ID, { name: 'Test' });

      const [sql] = (db.query as jest.Mock).mock.calls[1] as [string];
      expect(sql).toContain('updated_at = NOW()');
    });

    it('should throw NotFoundError if asset does not exist', async () => {
      const db = makeMockDb([[]]);
      const service = new AssetService(db as never);

      await expect(service.update('bad-id', { name: 'Test' })).rejects.toThrow(NotFoundError);
    });
  });

  // ─── list ────────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('should return assets and total with no filters', async () => {
      const db = makeMockDb([[{ count: '3' }], [DB_ROW, DB_ROW, DB_ROW]]);
      const service = new AssetService(db as never);

      const result = await service.list({ limit: 20, offset: 0 });

      expect(result.total).toBe(3);
      expect(result.assets).toHaveLength(3);
    });

    it('should pass assetType filter to query', async () => {
      const db = makeMockDb([[{ count: '1' }], [DB_ROW]]);
      const service = new AssetService(db as never);

      await service.list({ assetType: 'carbon_credit', limit: 20, offset: 0 });

      const [countSql, countParams] = (db.query as jest.Mock).mock.calls[0] as [string, unknown[]];
      expect(countSql).toContain('asset_type = $1');
      expect(countParams[0]).toBe('carbon_credit');
    });

    it('should pass status filter to query', async () => {
      const db = makeMockDb([[{ count: '1' }], [DB_ROW]]);
      const service = new AssetService(db as never);

      await service.list({ status: 'verified', limit: 20, offset: 0 });

      const [countSql, countParams] = (db.query as jest.Mock).mock.calls[0] as [string, unknown[]];
      expect(countSql).toContain('status = $1');
      expect(countParams[0]).toBe('verified');
    });

    it('should pass institutionId filter to query', async () => {
      const db = makeMockDb([[{ count: '1' }], [DB_ROW]]);
      const service = new AssetService(db as never);

      await service.list({ institutionId: INSTITUTION_ID, limit: 20, offset: 0 });

      const [countSql, countParams] = (db.query as jest.Mock).mock.calls[0] as [string, unknown[]];
      expect(countSql).toContain('institution_id = $1');
      expect(countParams[0]).toBe(INSTITUTION_ID);
    });

    it('should pass limit and offset as final params to data query', async () => {
      const db = makeMockDb([[{ count: '5' }], [DB_ROW]]);
      const service = new AssetService(db as never);

      await service.list({ limit: 10, offset: 30 });

      const [dataSql, dataParams] = (db.query as jest.Mock).mock.calls[1] as [string, unknown[]];
      expect(dataSql).toContain('LIMIT $1 OFFSET $2');
      expect(dataParams[0]).toBe(10);
      expect(dataParams[1]).toBe(30);
    });

    it('should use correct param numbers with filters applied', async () => {
      const db = makeMockDb([[{ count: '2' }], [DB_ROW, DB_ROW]]);
      const service = new AssetService(db as never);

      await service.list({
        assetType: 'carbon_credit',
        status: 'draft',
        limit: 5,
        offset: 0,
      });

      const [dataSql, dataParams] = (db.query as jest.Mock).mock.calls[1] as [string, unknown[]];
      // assetType=$1, status=$2, limit=$3, offset=$4
      expect(dataSql).toContain('LIMIT $3 OFFSET $4');
      expect(dataParams[0]).toBe('carbon_credit');
      expect(dataParams[1]).toBe('draft');
      expect(dataParams[2]).toBe(5);
      expect(dataParams[3]).toBe(0);
    });

    it('should return empty list when no assets match', async () => {
      const db = makeMockDb([[{ count: '0' }], []]);
      const service = new AssetService(db as never);

      const result = await service.list({ limit: 20, offset: 0 });

      expect(result.total).toBe(0);
      expect(result.assets).toHaveLength(0);
    });

    it('should combine all three filters', async () => {
      const db = makeMockDb([[{ count: '1' }], [DB_ROW]]);
      const service = new AssetService(db as never);

      await service.list({
        assetType: 'loan_portion',
        status: 'minted',
        institutionId: INSTITUTION_ID,
        limit: 20,
        offset: 0,
      });

      const [countSql, countParams] = (db.query as jest.Mock).mock.calls[0] as [string, unknown[]];
      expect(countSql).toContain('asset_type = $1');
      expect(countSql).toContain('status = $2');
      expect(countSql).toContain('institution_id = $3');
      expect(countParams).toEqual(['loan_portion', 'minted', INSTITUTION_ID]);
    });
  });
});
