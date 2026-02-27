import type { IDatabaseClient } from '@libs/database';
import { NotFoundError, ValidationError } from '@libs/errors';
import type {
  Quote,
  SubmitQuoteDTO,
  QuoteListQuery,
  RFQRequest,
} from '../types/trading.types.js';

const QUOTE_COLUMNS = `
  id,
  rfq_id                  AS "rfqId",
  quoter_institution_id   AS "quoterInstitutionId",
  quoter_user_id          AS "quoterUserId",
  price_per_unit          AS "pricePerUnit",
  quantity,
  total_amount            AS "totalAmount",
  status,
  expires_at              AS "expiresAt",
  accepted_at             AS "acceptedAt",
  withdrawn_at            AS "withdrawnAt",
  created_at              AS "createdAt",
  updated_at              AS "updatedAt"
`;

const RFQ_COLUMNS = `
  id,
  asset_id                 AS "assetId",
  requester_institution_id AS "requesterInstitutionId",
  requester_user_id        AS "requesterUserId",
  side,
  quantity,
  status,
  expires_at               AS "expiresAt",
  cancelled_at             AS "cancelledAt",
  cancellation_reason      AS "cancellationReason",
  created_at               AS "createdAt",
  updated_at               AS "updatedAt"
`;

export class QuoteService {
  constructor(private readonly db: IDatabaseClient) {}

  async submitQuote(rfqId: string, data: SubmitQuoteDTO): Promise<Quote> {
    // Fetch the RFQ to validate state
    const rfqRows = await this.db.query<RFQRequest>(
      `SELECT ${RFQ_COLUMNS} FROM rfq_requests WHERE id = $1`,
      [rfqId],
    );

    if (rfqRows.length === 0) {
      throw new NotFoundError('RFQ Request', rfqId);
    }

    const rfq = rfqRows[0];

    if (rfq.status !== 'open') {
      throw new ValidationError(
        `RFQ must be in 'open' status to submit a quote, current status: ${rfq.status}`,
      );
    }

    if (data.quoterInstitutionId === rfq.requesterInstitutionId) {
      throw new ValidationError(
        'Quoter institution cannot be the same as the requester institution',
      );
    }

    const totalAmount = Math.round(data.pricePerUnit * data.quantity * 100) / 100;

    const rows = await this.db.query<Quote>(
      `INSERT INTO quotes (
        rfq_id, quoter_institution_id, quoter_user_id,
        price_per_unit, quantity, total_amount, status, expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)
      RETURNING ${QUOTE_COLUMNS}`,
      [
        rfqId,
        data.quoterInstitutionId,
        data.quoterUserId,
        data.pricePerUnit,
        data.quantity,
        totalAmount,
        rfq.expiresAt,
      ],
    );

    return rows[0];
  }

  async findById(id: string): Promise<Quote> {
    const rows = await this.db.query<Quote>(
      `SELECT ${QUOTE_COLUMNS} FROM quotes WHERE id = $1`,
      [id],
    );

    if (rows.length === 0) {
      throw new NotFoundError('Quote', id);
    }

    return rows[0];
  }

  async listQuotesByRFQ(rfqId: string, params: QuoteListQuery): Promise<{ quotes: Quote[]; total: number }> {
    const countRows = await this.db.query<{ count: string }>(
      'SELECT COUNT(*) AS count FROM quotes WHERE rfq_id = $1',
      [rfqId],
    );
    const total = parseInt(countRows[0].count, 10);

    const quotes = await this.db.query<Quote>(
      `SELECT ${QUOTE_COLUMNS}
       FROM quotes
       WHERE rfq_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [rfqId, params.limit, params.offset],
    );

    return { quotes, total };
  }

  async acceptQuote(quoteId: string, acceptedByUserId: string): Promise<Quote> {
    void acceptedByUserId;
    const existing = await this.findById(quoteId);

    if (existing.status !== 'pending') {
      throw new ValidationError(
        `Quote must be in 'pending' status to accept, current status: ${existing.status}`,
      );
    }

    // Reject all other pending quotes for the same RFQ
    await this.db.query(
      `UPDATE quotes
       SET status = 'rejected', updated_at = NOW()
       WHERE rfq_id = $1 AND id != $2 AND status = 'pending'`,
      [existing.rfqId, quoteId],
    );

    // Update the RFQ status to 'accepted'
    await this.db.query(
      `UPDATE rfq_requests
       SET status = 'accepted', updated_at = NOW()
       WHERE id = $1`,
      [existing.rfqId],
    );

    // Accept the selected quote
    const rows = await this.db.query<Quote>(
      `UPDATE quotes
       SET status = 'accepted', accepted_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING ${QUOTE_COLUMNS}`,
      [quoteId],
    );

    return rows[0];
  }

  async withdrawQuote(quoteId: string): Promise<Quote> {
    const existing = await this.findById(quoteId);

    if (existing.status !== 'pending') {
      throw new ValidationError(
        `Quote must be in 'pending' status to withdraw, current status: ${existing.status}`,
      );
    }

    const rows = await this.db.query<Quote>(
      `UPDATE quotes
       SET status = 'withdrawn', withdrawn_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING ${QUOTE_COLUMNS}`,
      [quoteId],
    );

    return rows[0];
  }

  async expireQuotes(): Promise<number> {
    const rows = await this.db.query<{ count: string }>(
      `WITH expired AS (
        UPDATE quotes
        SET status = 'expired', updated_at = NOW()
        WHERE status = 'pending' AND expires_at < NOW()
        RETURNING id
      )
      SELECT COUNT(*) AS count FROM expired`,
      [],
    );

    return parseInt(rows[0].count, 10);
  }
}
