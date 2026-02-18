import { RFQService } from './RFQService';
import { NotFoundError, ValidationError } from '@libs/errors';

const RFQ_ID = '550e8400-e29b-41d4-a716-446655440000';
const ASSET_ID = '660e8400-e29b-41d4-a716-446655440000';
const INSTITUTION_ID = '770e8400-e29b-41d4-a716-446655440000';
const USER_ID = '880e8400-e29b-41d4-a716-446655440000';

const DB_RFQ_ROW = {
  id: RFQ_ID,
  assetId: ASSET_ID,
  requesterInstitutionId: INSTITUTION_ID,
  requesterUserId: USER_ID,
  side: 'buy',
  quantity: '100.00000000',
  status: 'open',
  expiresAt: new Date('2025-06-01T00:05:00Z'),
  cancelledAt: null,
  cancellationReason: null,
  createdAt: new Date('2025-06-01T00:00:00Z'),
  updatedAt: new Date('2025-06-01T00:00:00Z'),
};

const CANCELLED_RFQ_ROW = {
  ...DB_RFQ_ROW,
  status: 'cancelled',
  cancelledAt: new Date('2025-06-01T00:01:00Z'),
  cancellationReason: 'No longer needed',
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

describe('RFQService', () => {
  // ─── createRFQ ──────────────────────────────────────────────────────────────

  describe('createRFQ', () => {
    it('should create an open RFQ request', async () => {
      const db = makeMockDb([[DB_RFQ_ROW]]);
      const service = new RFQService(db as never);

      const result = await service.createRFQ({
        assetId: ASSET_ID,
        requesterInstitutionId: INSTITUTION_ID,
        requesterUserId: USER_ID,
        side: 'buy',
        quantity: 100,
      });

      expect(result.status).toBe('open');
      expect(result.assetId).toBe(ASSET_ID);
      expect(result.side).toBe('buy');
    });

    it('should insert RFQ into database', async () => {
      const db = makeMockDb([[DB_RFQ_ROW]]);
      const service = new RFQService(db as never);

      await service.createRFQ({
        assetId: ASSET_ID,
        requesterInstitutionId: INSTITUTION_ID,
        requesterUserId: USER_ID,
        side: 'sell',
        quantity: 50,
      });

      expect(db.query).toHaveBeenCalled();
      const [sql] = (db.query as jest.Mock).mock.calls[0] as [string];
      expect(sql).toContain('INSERT INTO rfq_requests');
    });

    it('should set expires_at with 5 minute interval', async () => {
      const db = makeMockDb([[DB_RFQ_ROW]]);
      const service = new RFQService(db as never);

      await service.createRFQ({
        assetId: ASSET_ID,
        requesterInstitutionId: INSTITUTION_ID,
        requesterUserId: USER_ID,
        side: 'buy',
        quantity: 100,
      });

      const [sql] = (db.query as jest.Mock).mock.calls[0] as [string];
      expect(sql).toContain('5 minutes');
    });

    it('should pass all parameters to insert query', async () => {
      const db = makeMockDb([[DB_RFQ_ROW]]);
      const service = new RFQService(db as never);

      await service.createRFQ({
        assetId: ASSET_ID,
        requesterInstitutionId: INSTITUTION_ID,
        requesterUserId: USER_ID,
        side: 'buy',
        quantity: 100,
      });

      const params = (db.query as jest.Mock).mock.calls[0][1] as unknown[];
      expect(params[0]).toBe(ASSET_ID);
      expect(params[1]).toBe(INSTITUTION_ID);
      expect(params[2]).toBe(USER_ID);
      expect(params[3]).toBe('buy');
      expect(params[4]).toBe(100);
    });
  });

  // ─── findById ───────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('should return RFQ request by id', async () => {
      const db = makeMockDb([[DB_RFQ_ROW]]);
      const service = new RFQService(db as never);

      const result = await service.findById(RFQ_ID);

      expect(result.id).toBe(RFQ_ID);
      expect(result.requesterInstitutionId).toBe(INSTITUTION_ID);
    });

    it('should throw NotFoundError when RFQ does not exist', async () => {
      const db = makeMockDb([[]]);
      const service = new RFQService(db as never);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  // ─── listRFQs ──────────────────────────────────────────────────────────────

  describe('listRFQs', () => {
    it('should return rfqs with total', async () => {
      const db = makeMockDb([[{ count: '2' }], [DB_RFQ_ROW, DB_RFQ_ROW]]);
      const service = new RFQService(db as never);

      const result = await service.listRFQs({ limit: 20, offset: 0 });

      expect(result.total).toBe(2);
      expect(result.rfqs).toHaveLength(2);
    });

    it('should filter by status', async () => {
      const db = makeMockDb([[{ count: '0' }], []]);
      const service = new RFQService(db as never);

      await service.listRFQs({ limit: 20, offset: 0, status: 'open' });

      const [countSql] = (db.query as jest.Mock).mock.calls[0] as [string];
      expect(countSql).toContain('status');
    });

    it('should filter by assetId', async () => {
      const db = makeMockDb([[{ count: '0' }], []]);
      const service = new RFQService(db as never);

      await service.listRFQs({ limit: 20, offset: 0, assetId: ASSET_ID });

      const [countSql] = (db.query as jest.Mock).mock.calls[0] as [string];
      expect(countSql).toContain('asset_id');
    });

    it('should filter by institutionId', async () => {
      const db = makeMockDb([[{ count: '0' }], []]);
      const service = new RFQService(db as never);

      await service.listRFQs({ limit: 20, offset: 0, institutionId: INSTITUTION_ID });

      const [countSql] = (db.query as jest.Mock).mock.calls[0] as [string];
      expect(countSql).toContain('requester_institution_id');
    });

    it('should filter by side', async () => {
      const db = makeMockDb([[{ count: '0' }], []]);
      const service = new RFQService(db as never);

      await service.listRFQs({ limit: 20, offset: 0, side: 'buy' });

      const [countSql] = (db.query as jest.Mock).mock.calls[0] as [string];
      expect(countSql).toContain('side');
    });

    it('should pass limit and offset', async () => {
      const db = makeMockDb([[{ count: '0' }], []]);
      const service = new RFQService(db as never);

      await service.listRFQs({ limit: 10, offset: 5 });

      const params = (db.query as jest.Mock).mock.calls[1][1] as unknown[];
      expect(params).toContain(10);
      expect(params).toContain(5);
    });

    it('should order by created_at DESC', async () => {
      const db = makeMockDb([[{ count: '0' }], []]);
      const service = new RFQService(db as never);

      await service.listRFQs({ limit: 20, offset: 0 });

      const [dataSql] = (db.query as jest.Mock).mock.calls[1] as [string];
      expect(dataSql).toContain('ORDER BY created_at DESC');
    });
  });

  // ─── cancelRFQ ──────────────────────────────────────────────────────────────

  describe('cancelRFQ', () => {
    it('should cancel an open RFQ', async () => {
      const db = makeMockDb([
        [DB_RFQ_ROW], // findById
        [CANCELLED_RFQ_ROW], // update
      ]);
      const service = new RFQService(db as never);

      const result = await service.cancelRFQ(RFQ_ID, { cancellationReason: 'No longer needed' });

      expect(result.status).toBe('cancelled');
    });

    it('should throw NotFoundError when RFQ does not exist', async () => {
      const db = makeMockDb([[]]);
      const service = new RFQService(db as never);

      await expect(service.cancelRFQ('nonexistent', {})).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when RFQ is not in open status', async () => {
      const db = makeMockDb([[CANCELLED_RFQ_ROW]]);
      const service = new RFQService(db as never);

      await expect(service.cancelRFQ(RFQ_ID, {})).rejects.toThrow(ValidationError);
    });

    it('should pass cancellation reason to update query', async () => {
      const db = makeMockDb([
        [DB_RFQ_ROW],
        [CANCELLED_RFQ_ROW],
      ]);
      const service = new RFQService(db as never);

      await service.cancelRFQ(RFQ_ID, { cancellationReason: 'Changed my mind' });

      const updateCall = (db.query as jest.Mock).mock.calls[1];
      const [sql, params] = updateCall as [string, unknown[]];
      expect(sql).toContain('UPDATE rfq_requests');
      expect(params).toContain('Changed my mind');
    });

    it('should set cancellation_reason to null when not provided', async () => {
      const db = makeMockDb([
        [DB_RFQ_ROW],
        [{ ...DB_RFQ_ROW, status: 'cancelled' }],
      ]);
      const service = new RFQService(db as never);

      await service.cancelRFQ(RFQ_ID, {});

      const params = (db.query as jest.Mock).mock.calls[1][1] as unknown[];
      expect(params[0]).toBeNull();
    });
  });

  // ─── expireRFQs ─────────────────────────────────────────────────────────────

  describe('expireRFQs', () => {
    it('should return the count of expired RFQs', async () => {
      const db = makeMockDb([[{ count: '3' }]]);
      const service = new RFQService(db as never);

      const result = await service.expireRFQs();

      expect(result).toBe(3);
    });

    it('should execute batch update query', async () => {
      const db = makeMockDb([[{ count: '0' }]]);
      const service = new RFQService(db as never);

      await service.expireRFQs();

      const [sql] = (db.query as jest.Mock).mock.calls[0] as [string];
      expect(sql).toContain('UPDATE rfq_requests');
      expect(sql).toContain("status = 'expired'");
      expect(sql).toContain("status = 'open'");
      expect(sql).toContain('expires_at < NOW()');
    });

    it('should return 0 when no RFQs are expired', async () => {
      const db = makeMockDb([[{ count: '0' }]]);
      const service = new RFQService(db as never);

      const result = await service.expireRFQs();

      expect(result).toBe(0);
    });
  });
});
