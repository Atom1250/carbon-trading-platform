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

const QUOTE_ID = '550e8400-e29b-41d4-a716-446655440000';
const RFQ_ID = '660e8400-e29b-41d4-a716-446655440000';
const QUOTER_INSTITUTION_ID = '770e8400-e29b-41d4-a716-446655440000';
const QUOTER_USER_ID = '880e8400-e29b-41d4-a716-446655440000';
const ACCEPTED_BY_USER_ID = '990e8400-e29b-41d4-a716-446655440000';

const QUOTE_RESPONSE = {
  id: QUOTE_ID,
  rfqId: RFQ_ID,
  quoterInstitutionId: QUOTER_INSTITUTION_ID,
  quoterUserId: QUOTER_USER_ID,
  pricePerUnit: '25.50000000',
  quantity: '100.00000000',
  totalAmount: '2550.00',
  status: 'pending',
  expiresAt: new Date('2025-06-01T00:05:00Z').toISOString(),
  acceptedAt: null,
  withdrawnAt: null,
  createdAt: new Date('2025-06-01T00:01:00Z').toISOString(),
  updatedAt: new Date('2025-06-01T00:01:00Z').toISOString(),
};

const ACCEPTED_QUOTE = {
  ...QUOTE_RESPONSE,
  status: 'accepted',
  acceptedAt: new Date('2025-06-01T00:02:00Z').toISOString(),
};

const WITHDRAWN_QUOTE = {
  ...QUOTE_RESPONSE,
  status: 'withdrawn',
  withdrawnAt: new Date('2025-06-01T00:02:00Z').toISOString(),
};

function makeRfqService() {
  return {
    createRFQ: jest.fn(),
    findById: jest.fn(),
    listRFQs: jest.fn(),
    cancelRFQ: jest.fn(),
    expireRFQs: jest.fn(),
  };
}

function makeQuoteService(opts: {
  submitQuote?: jest.Mock;
  findById?: jest.Mock;
  listQuotesByRFQ?: jest.Mock;
  acceptQuote?: jest.Mock;
  withdrawQuote?: jest.Mock;
  expireQuotes?: jest.Mock;
} = {}) {
  return {
    submitQuote: opts.submitQuote ?? jest.fn().mockResolvedValue(QUOTE_RESPONSE),
    findById: opts.findById ?? jest.fn().mockResolvedValue(QUOTE_RESPONSE),
    listQuotesByRFQ: opts.listQuotesByRFQ ?? jest.fn().mockResolvedValue({
      quotes: [QUOTE_RESPONSE],
      total: 1,
    }),
    acceptQuote: opts.acceptQuote ?? jest.fn().mockResolvedValue(ACCEPTED_QUOTE),
    withdrawQuote: opts.withdrawQuote ?? jest.fn().mockResolvedValue(WITHDRAWN_QUOTE),
    expireQuotes: opts.expireQuotes ?? jest.fn().mockResolvedValue(0),
  };
}

function makeApp(quoteOpts?: Parameters<typeof makeQuoteService>[0]) {
  return createApp({
    rfqService: makeRfqService() as never,
    quoteService: makeQuoteService(quoteOpts) as never,
  });
}

// ─── POST /rfq/:rfqId/quotes ───────────────────────────────────────────────

describe('POST /rfq/:rfqId/quotes', () => {
  it('should return 201 with quote on valid body', async () => {
    const res = await request(makeApp())
      .post(`/rfq/${RFQ_ID}/quotes`)
      .send({
        quoterInstitutionId: QUOTER_INSTITUTION_ID,
        quoterUserId: QUOTER_USER_ID,
        pricePerUnit: 25.50,
        quantity: 100,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('pending');
    expect(res.body.data.rfqId).toBe(RFQ_ID);
  });

  it('should pass rfqId and data to service', async () => {
    const submitQuote = jest.fn().mockResolvedValue(QUOTE_RESPONSE);
    const app = makeApp({ submitQuote });

    await request(app)
      .post(`/rfq/${RFQ_ID}/quotes`)
      .send({
        quoterInstitutionId: QUOTER_INSTITUTION_ID,
        quoterUserId: QUOTER_USER_ID,
        pricePerUnit: 30,
        quantity: 50,
      });

    expect(submitQuote).toHaveBeenCalledWith(
      RFQ_ID,
      expect.objectContaining({
        quoterInstitutionId: QUOTER_INSTITUTION_ID,
        pricePerUnit: 30,
        quantity: 50,
      }),
    );
  });

  it('should return 422 when quoterInstitutionId is missing', async () => {
    const res = await request(makeApp())
      .post(`/rfq/${RFQ_ID}/quotes`)
      .send({
        quoterUserId: QUOTER_USER_ID,
        pricePerUnit: 25.50,
        quantity: 100,
      });

    expect(res.status).toBe(422);
  });

  it('should return 422 when pricePerUnit is not positive', async () => {
    const res = await request(makeApp())
      .post(`/rfq/${RFQ_ID}/quotes`)
      .send({
        quoterInstitutionId: QUOTER_INSTITUTION_ID,
        quoterUserId: QUOTER_USER_ID,
        pricePerUnit: -5,
        quantity: 100,
      });

    expect(res.status).toBe(422);
  });

  it('should return 422 when quantity is zero', async () => {
    const res = await request(makeApp())
      .post(`/rfq/${RFQ_ID}/quotes`)
      .send({
        quoterInstitutionId: QUOTER_INSTITUTION_ID,
        quoterUserId: QUOTER_USER_ID,
        pricePerUnit: 25.50,
        quantity: 0,
      });

    expect(res.status).toBe(422);
  });

  it('should return 404 when RFQ not found', async () => {
    const app = makeApp({
      submitQuote: jest.fn().mockRejectedValue(new NotFoundError('RFQ Request', 'bad-id')),
    });

    const res = await request(app)
      .post('/rfq/bad-id/quotes')
      .send({
        quoterInstitutionId: QUOTER_INSTITUTION_ID,
        quoterUserId: QUOTER_USER_ID,
        pricePerUnit: 25.50,
        quantity: 100,
      });

    expect(res.status).toBe(404);
  });

  it('should return 422 when RFQ is not open', async () => {
    const app = makeApp({
      submitQuote: jest.fn().mockRejectedValue(
        new ValidationError("RFQ must be in 'open' status to submit a quote"),
      ),
    });

    const res = await request(app)
      .post(`/rfq/${RFQ_ID}/quotes`)
      .send({
        quoterInstitutionId: QUOTER_INSTITUTION_ID,
        quoterUserId: QUOTER_USER_ID,
        pricePerUnit: 25.50,
        quantity: 100,
      });

    expect(res.status).toBe(422);
  });
});

// ─── GET /rfq/:rfqId/quotes ────────────────────────────────────────────────

describe('GET /rfq/:rfqId/quotes', () => {
  it('should return 200 with quote list', async () => {
    const res = await request(makeApp()).get(`/rfq/${RFQ_ID}/quotes`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.metadata.total).toBe(1);
  });

  it('should include pagination metadata', async () => {
    const res = await request(makeApp()).get(`/rfq/${RFQ_ID}/quotes?limit=10&offset=0`);

    expect(res.body.metadata).toMatchObject({
      total: 1,
      limit: 10,
      offset: 0,
      hasMore: false,
    });
  });

  it('should pass rfqId to service', async () => {
    const listQuotesByRFQ = jest.fn().mockResolvedValue({ quotes: [], total: 0 });
    const app = makeApp({ listQuotesByRFQ });

    await request(app).get(`/rfq/${RFQ_ID}/quotes`);

    expect(listQuotesByRFQ).toHaveBeenCalledWith(
      RFQ_ID,
      expect.objectContaining({ limit: 20, offset: 0 }),
    );
  });
});

// ─── POST /quotes/:id/accept ───────────────────────────────────────────────

describe('POST /quotes/:id/accept', () => {
  it('should return 200 with accepted quote', async () => {
    const res = await request(makeApp())
      .post(`/quotes/${QUOTE_ID}/accept`)
      .send({ acceptedByUserId: ACCEPTED_BY_USER_ID });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('accepted');
  });

  it('should return 422 when acceptedByUserId is missing', async () => {
    const res = await request(makeApp())
      .post(`/quotes/${QUOTE_ID}/accept`)
      .send({});

    expect(res.status).toBe(422);
  });

  it('should return 422 when acceptedByUserId is not a UUID', async () => {
    const res = await request(makeApp())
      .post(`/quotes/${QUOTE_ID}/accept`)
      .send({ acceptedByUserId: 'not-a-uuid' });

    expect(res.status).toBe(422);
  });

  it('should return 404 when quote not found', async () => {
    const app = makeApp({
      acceptQuote: jest.fn().mockRejectedValue(new NotFoundError('Quote', 'bad-id')),
    });

    const res = await request(app)
      .post('/quotes/bad-id/accept')
      .send({ acceptedByUserId: ACCEPTED_BY_USER_ID });

    expect(res.status).toBe(404);
  });

  it('should return 422 when quote is not pending', async () => {
    const app = makeApp({
      acceptQuote: jest.fn().mockRejectedValue(
        new ValidationError("Quote must be in 'pending' status to accept"),
      ),
    });

    const res = await request(app)
      .post(`/quotes/${QUOTE_ID}/accept`)
      .send({ acceptedByUserId: ACCEPTED_BY_USER_ID });

    expect(res.status).toBe(422);
  });
});

// ─── POST /quotes/:id/withdraw ─────────────────────────────────────────────

describe('POST /quotes/:id/withdraw', () => {
  it('should return 200 with withdrawn quote', async () => {
    const res = await request(makeApp())
      .post(`/quotes/${QUOTE_ID}/withdraw`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('withdrawn');
  });

  it('should return 404 when quote not found', async () => {
    const app = makeApp({
      withdrawQuote: jest.fn().mockRejectedValue(new NotFoundError('Quote', 'bad-id')),
    });

    const res = await request(app).post('/quotes/bad-id/withdraw');

    expect(res.status).toBe(404);
  });

  it('should return 422 when quote is not pending', async () => {
    const app = makeApp({
      withdrawQuote: jest.fn().mockRejectedValue(
        new ValidationError("Quote must be in 'pending' status to withdraw"),
      ),
    });

    const res = await request(app).post(`/quotes/${QUOTE_ID}/withdraw`);

    expect(res.status).toBe(422);
  });
});
