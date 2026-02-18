import { QuoteService } from './QuoteService';
import { NotFoundError, ValidationError } from '@libs/errors';

const QUOTE_ID = '550e8400-e29b-41d4-a716-446655440000';
const RFQ_ID = '660e8400-e29b-41d4-a716-446655440000';
const QUOTER_INSTITUTION_ID = '770e8400-e29b-41d4-a716-446655440000';
const REQUESTER_INSTITUTION_ID = '880e8400-e29b-41d4-a716-446655440000';
const QUOTER_USER_ID = '990e8400-e29b-41d4-a716-446655440000';
const ASSET_ID = 'aa0e8400-e29b-41d4-a716-446655440000';

const DB_RFQ_ROW = {
  id: RFQ_ID,
  assetId: ASSET_ID,
  requesterInstitutionId: REQUESTER_INSTITUTION_ID,
  requesterUserId: '110e8400-e29b-41d4-a716-446655440000',
  side: 'buy',
  quantity: '100.00000000',
  status: 'open',
  expiresAt: new Date('2025-06-01T00:05:00Z'),
  cancelledAt: null,
  cancellationReason: null,
  createdAt: new Date('2025-06-01T00:00:00Z'),
  updatedAt: new Date('2025-06-01T00:00:00Z'),
};

const DB_QUOTE_ROW = {
  id: QUOTE_ID,
  rfqId: RFQ_ID,
  quoterInstitutionId: QUOTER_INSTITUTION_ID,
  quoterUserId: QUOTER_USER_ID,
  pricePerUnit: '25.50000000',
  quantity: '100.00000000',
  totalAmount: '2550.00',
  status: 'pending',
  expiresAt: new Date('2025-06-01T00:05:00Z'),
  acceptedAt: null,
  withdrawnAt: null,
  createdAt: new Date('2025-06-01T00:01:00Z'),
  updatedAt: new Date('2025-06-01T00:01:00Z'),
};

const ACCEPTED_QUOTE_ROW = {
  ...DB_QUOTE_ROW,
  status: 'accepted',
  acceptedAt: new Date('2025-06-01T00:02:00Z'),
};

const WITHDRAWN_QUOTE_ROW = {
  ...DB_QUOTE_ROW,
  status: 'withdrawn',
  withdrawnAt: new Date('2025-06-01T00:02:00Z'),
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

describe('QuoteService', () => {
  // ─── submitQuote ────────────────────────────────────────────────────────────

  describe('submitQuote', () => {
    it('should create a pending quote', async () => {
      const db = makeMockDb([
        [DB_RFQ_ROW], // fetch RFQ
        [DB_QUOTE_ROW], // insert quote
      ]);
      const service = new QuoteService(db as never);

      const result = await service.submitQuote(RFQ_ID, {
        quoterInstitutionId: QUOTER_INSTITUTION_ID,
        quoterUserId: QUOTER_USER_ID,
        pricePerUnit: 25.50,
        quantity: 100,
      });

      expect(result.status).toBe('pending');
      expect(result.rfqId).toBe(RFQ_ID);
    });

    it('should compute total_amount from price and quantity', async () => {
      const db = makeMockDb([
        [DB_RFQ_ROW],
        [DB_QUOTE_ROW],
      ]);
      const service = new QuoteService(db as never);

      await service.submitQuote(RFQ_ID, {
        quoterInstitutionId: QUOTER_INSTITUTION_ID,
        quoterUserId: QUOTER_USER_ID,
        pricePerUnit: 25.50,
        quantity: 100,
      });

      const params = (db.query as jest.Mock).mock.calls[1][1] as unknown[];
      expect(params[5]).toBe(2550); // totalAmount
    });

    it('should set expires_at from the RFQ expiry', async () => {
      const db = makeMockDb([
        [DB_RFQ_ROW],
        [DB_QUOTE_ROW],
      ]);
      const service = new QuoteService(db as never);

      await service.submitQuote(RFQ_ID, {
        quoterInstitutionId: QUOTER_INSTITUTION_ID,
        quoterUserId: QUOTER_USER_ID,
        pricePerUnit: 25.50,
        quantity: 100,
      });

      const params = (db.query as jest.Mock).mock.calls[1][1] as unknown[];
      expect(params[6]).toBe(DB_RFQ_ROW.expiresAt); // expires_at from RFQ
    });

    it('should throw NotFoundError when RFQ does not exist', async () => {
      const db = makeMockDb([[]]);
      const service = new QuoteService(db as never);

      await expect(
        service.submitQuote('nonexistent', {
          quoterInstitutionId: QUOTER_INSTITUTION_ID,
          quoterUserId: QUOTER_USER_ID,
          pricePerUnit: 25.50,
          quantity: 100,
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when RFQ is not open', async () => {
      const db = makeMockDb([[{ ...DB_RFQ_ROW, status: 'cancelled' }]]);
      const service = new QuoteService(db as never);

      await expect(
        service.submitQuote(RFQ_ID, {
          quoterInstitutionId: QUOTER_INSTITUTION_ID,
          quoterUserId: QUOTER_USER_ID,
          pricePerUnit: 25.50,
          quantity: 100,
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when quoter is same as requester', async () => {
      const db = makeMockDb([[DB_RFQ_ROW]]);
      const service = new QuoteService(db as never);

      await expect(
        service.submitQuote(RFQ_ID, {
          quoterInstitutionId: REQUESTER_INSTITUTION_ID, // same as requester
          quoterUserId: QUOTER_USER_ID,
          pricePerUnit: 25.50,
          quantity: 100,
        }),
      ).rejects.toThrow(ValidationError);
    });
  });

  // ─── findById ───────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('should return quote by id', async () => {
      const db = makeMockDb([[DB_QUOTE_ROW]]);
      const service = new QuoteService(db as never);

      const result = await service.findById(QUOTE_ID);

      expect(result.id).toBe(QUOTE_ID);
      expect(result.quoterInstitutionId).toBe(QUOTER_INSTITUTION_ID);
    });

    it('should throw NotFoundError when quote does not exist', async () => {
      const db = makeMockDb([[]]);
      const service = new QuoteService(db as never);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  // ─── listQuotesByRFQ ───────────────────────────────────────────────────────

  describe('listQuotesByRFQ', () => {
    it('should return quotes with total', async () => {
      const db = makeMockDb([[{ count: '2' }], [DB_QUOTE_ROW, DB_QUOTE_ROW]]);
      const service = new QuoteService(db as never);

      const result = await service.listQuotesByRFQ(RFQ_ID, { limit: 20, offset: 0 });

      expect(result.total).toBe(2);
      expect(result.quotes).toHaveLength(2);
    });

    it('should pass rfqId, limit and offset to query', async () => {
      const db = makeMockDb([[{ count: '0' }], []]);
      const service = new QuoteService(db as never);

      await service.listQuotesByRFQ(RFQ_ID, { limit: 10, offset: 5 });

      const dataParams = (db.query as jest.Mock).mock.calls[1][1] as unknown[];
      expect(dataParams[0]).toBe(RFQ_ID);
      expect(dataParams[1]).toBe(10);
      expect(dataParams[2]).toBe(5);
    });

    it('should order by created_at DESC', async () => {
      const db = makeMockDb([[{ count: '0' }], []]);
      const service = new QuoteService(db as never);

      await service.listQuotesByRFQ(RFQ_ID, { limit: 20, offset: 0 });

      const [dataSql] = (db.query as jest.Mock).mock.calls[1] as [string];
      expect(dataSql).toContain('ORDER BY created_at DESC');
    });
  });

  // ─── acceptQuote ────────────────────────────────────────────────────────────

  describe('acceptQuote', () => {
    it('should accept a pending quote', async () => {
      const db = makeMockDb([
        [DB_QUOTE_ROW], // findById
        [], // reject others
        [], // update RFQ
        [ACCEPTED_QUOTE_ROW], // accept quote
      ]);
      const service = new QuoteService(db as never);

      const result = await service.acceptQuote(QUOTE_ID, QUOTER_USER_ID);

      expect(result.status).toBe('accepted');
    });

    it('should reject other pending quotes for the same RFQ', async () => {
      const db = makeMockDb([
        [DB_QUOTE_ROW],
        [],
        [],
        [ACCEPTED_QUOTE_ROW],
      ]);
      const service = new QuoteService(db as never);

      await service.acceptQuote(QUOTE_ID, QUOTER_USER_ID);

      const rejectCall = (db.query as jest.Mock).mock.calls[1];
      const [sql, params] = rejectCall as [string, unknown[]];
      expect(sql).toContain("status = 'rejected'");
      expect(params[0]).toBe(RFQ_ID);
      expect(params[1]).toBe(QUOTE_ID);
    });

    it('should update the RFQ status to accepted', async () => {
      const db = makeMockDb([
        [DB_QUOTE_ROW],
        [],
        [],
        [ACCEPTED_QUOTE_ROW],
      ]);
      const service = new QuoteService(db as never);

      await service.acceptQuote(QUOTE_ID, QUOTER_USER_ID);

      const rfqCall = (db.query as jest.Mock).mock.calls[2];
      const [sql, params] = rfqCall as [string, unknown[]];
      expect(sql).toContain("status = 'accepted'");
      expect(sql).toContain('UPDATE rfq_requests');
      expect(params[0]).toBe(RFQ_ID);
    });

    it('should throw NotFoundError when quote does not exist', async () => {
      const db = makeMockDb([[]]);
      const service = new QuoteService(db as never);

      await expect(service.acceptQuote('nonexistent', QUOTER_USER_ID)).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when quote is not pending', async () => {
      const db = makeMockDb([[WITHDRAWN_QUOTE_ROW]]);
      const service = new QuoteService(db as never);

      await expect(service.acceptQuote(QUOTE_ID, QUOTER_USER_ID)).rejects.toThrow(ValidationError);
    });
  });

  // ─── withdrawQuote ──────────────────────────────────────────────────────────

  describe('withdrawQuote', () => {
    it('should withdraw a pending quote', async () => {
      const db = makeMockDb([
        [DB_QUOTE_ROW], // findById
        [WITHDRAWN_QUOTE_ROW], // update
      ]);
      const service = new QuoteService(db as never);

      const result = await service.withdrawQuote(QUOTE_ID);

      expect(result.status).toBe('withdrawn');
    });

    it('should throw NotFoundError when quote does not exist', async () => {
      const db = makeMockDb([[]]);
      const service = new QuoteService(db as never);

      await expect(service.withdrawQuote('nonexistent')).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when quote is not pending', async () => {
      const db = makeMockDb([[ACCEPTED_QUOTE_ROW]]);
      const service = new QuoteService(db as never);

      await expect(service.withdrawQuote(QUOTE_ID)).rejects.toThrow(ValidationError);
    });
  });

  // ─── expireQuotes ───────────────────────────────────────────────────────────

  describe('expireQuotes', () => {
    it('should return the count of expired quotes', async () => {
      const db = makeMockDb([[{ count: '5' }]]);
      const service = new QuoteService(db as never);

      const result = await service.expireQuotes();

      expect(result).toBe(5);
    });

    it('should execute batch update query', async () => {
      const db = makeMockDb([[{ count: '0' }]]);
      const service = new QuoteService(db as never);

      await service.expireQuotes();

      const [sql] = (db.query as jest.Mock).mock.calls[0] as [string];
      expect(sql).toContain('UPDATE quotes');
      expect(sql).toContain("status = 'expired'");
      expect(sql).toContain("status = 'pending'");
      expect(sql).toContain('expires_at < NOW()');
    });

    it('should return 0 when no quotes are expired', async () => {
      const db = makeMockDb([[{ count: '0' }]]);
      const service = new QuoteService(db as never);

      const result = await service.expireQuotes();

      expect(result).toBe(0);
    });
  });
});
