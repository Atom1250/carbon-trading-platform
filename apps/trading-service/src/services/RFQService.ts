import type { IDatabaseClient } from '@libs/database';
import { NotFoundError, ValidationError } from '@libs/errors';
import type {
  RFQRequest,
  CreateRFQDTO,
  CancelRFQDTO,
  RFQListQuery,
} from '../types/trading.types.js';

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

const RFQ_VALIDITY_MINUTES = 5;

export class RFQService {
  constructor(private readonly db: IDatabaseClient) {}

  async createRFQ(data: CreateRFQDTO): Promise<RFQRequest> {
    const rows = await this.db.query<RFQRequest>(
      `INSERT INTO rfq_requests (
        asset_id, requester_institution_id, requester_user_id,
        side, quantity, status, expires_at
      )
      VALUES ($1, $2, $3, $4, $5, 'open', NOW() + INTERVAL '${RFQ_VALIDITY_MINUTES} minutes')
      RETURNING ${RFQ_COLUMNS}`,
      [
        data.assetId,
        data.requesterInstitutionId,
        data.requesterUserId,
        data.side,
        data.quantity,
      ],
    );

    return rows[0];
  }

  async findById(id: string): Promise<RFQRequest> {
    const rows = await this.db.query<RFQRequest>(
      `SELECT ${RFQ_COLUMNS} FROM rfq_requests WHERE id = $1`,
      [id],
    );

    if (rows.length === 0) {
      throw new NotFoundError('RFQ Request', id);
    }

    return rows[0];
  }

  async listRFQs(params: RFQListQuery): Promise<{ rfqs: RFQRequest[]; total: number }> {
    const conditions: string[] = ['1=1'];
    const filterValues: unknown[] = [];

    if (params.status) {
      filterValues.push(params.status);
      conditions.push(`status = $${filterValues.length}`);
    }

    if (params.assetId) {
      filterValues.push(params.assetId);
      conditions.push(`asset_id = $${filterValues.length}`);
    }

    if (params.institutionId) {
      filterValues.push(params.institutionId);
      conditions.push(`requester_institution_id = $${filterValues.length}`);
    }

    if (params.side) {
      filterValues.push(params.side);
      conditions.push(`side = $${filterValues.length}`);
    }

    const countRows = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM rfq_requests WHERE ${conditions.join(' AND ')}`,
      filterValues,
    );
    const total = parseInt(countRows[0].count, 10);

    const limitParam = filterValues.length + 1;
    const offsetParam = filterValues.length + 2;

    const rfqs = await this.db.query<RFQRequest>(
      `SELECT ${RFQ_COLUMNS}
       FROM rfq_requests
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      [...filterValues, params.limit, params.offset],
    );

    return { rfqs, total };
  }

  async cancelRFQ(id: string, data: CancelRFQDTO): Promise<RFQRequest> {
    const existing = await this.findById(id);

    if (existing.status !== 'open') {
      throw new ValidationError(
        `RFQ must be in 'open' status to cancel, current status: ${existing.status}`,
      );
    }

    const rows = await this.db.query<RFQRequest>(
      `UPDATE rfq_requests
       SET status = 'cancelled', cancelled_at = NOW(),
           cancellation_reason = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING ${RFQ_COLUMNS}`,
      [data.cancellationReason ?? null, id],
    );

    return rows[0];
  }

  async expireRFQs(): Promise<number> {
    const rows = await this.db.query<{ count: string }>(
      `WITH expired AS (
        UPDATE rfq_requests
        SET status = 'expired', updated_at = NOW()
        WHERE status = 'open' AND expires_at < NOW()
        RETURNING id
      )
      SELECT COUNT(*) AS count FROM expired`,
      [],
    );

    return parseInt(rows[0].count, 10);
  }
}
