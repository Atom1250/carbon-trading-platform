import crypto from 'node:crypto';
import type { IDatabaseClient } from '@libs/database';
import { NotFoundError, ValidationError } from '@libs/errors';
import type {
  Trade,
  Quote,
  RFQRequest,
  FeeBreakdown,
} from '../types/trading.types.js';
import type { FeeCalculationService } from './FeeCalculationService.js';

const TRADE_COLUMNS = `
  id,
  rfq_id                  AS "rfqId",
  quote_id                AS "quoteId",
  asset_id                AS "assetId",
  buyer_institution_id    AS "buyerInstitutionId",
  seller_institution_id   AS "sellerInstitutionId",
  buyer_user_id           AS "buyerUserId",
  seller_user_id          AS "sellerUserId",
  quantity,
  price_per_unit          AS "pricePerUnit",
  total_amount            AS "totalAmount",
  maker_fee               AS "makerFee",
  taker_fee               AS "takerFee",
  platform_fee            AS "platformFee",
  status,
  settlement_tx_hash      AS "settlementTxHash",
  settled_at              AS "settledAt",
  failed_at               AS "failedAt",
  failure_reason          AS "failureReason",
  created_at              AS "createdAt",
  updated_at              AS "updatedAt"
`;

export class SettlementService {
  constructor(
    private readonly db: IDatabaseClient,
    private readonly feeService: FeeCalculationService,
  ) {}

  async createTradeFromQuote(quote: Quote, rfq: RFQRequest): Promise<Trade> {
    const totalAmount = parseFloat(quote.totalAmount);
    const fees: FeeBreakdown = this.feeService.calculateFees(totalAmount);

    // Determine buyer/seller based on RFQ side
    const buyerInstitutionId = rfq.side === 'buy' ? rfq.requesterInstitutionId : quote.quoterInstitutionId;
    const sellerInstitutionId = rfq.side === 'sell' ? rfq.requesterInstitutionId : quote.quoterInstitutionId;
    const buyerUserId = rfq.side === 'buy' ? rfq.requesterUserId : quote.quoterUserId;
    const sellerUserId = rfq.side === 'sell' ? rfq.requesterUserId : quote.quoterUserId;

    const rows = await this.db.query<Trade>(
      `INSERT INTO trades (
        rfq_id, quote_id, asset_id,
        buyer_institution_id, seller_institution_id,
        buyer_user_id, seller_user_id,
        quantity, price_per_unit, total_amount,
        maker_fee, taker_fee, platform_fee,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'pending_settlement')
      RETURNING ${TRADE_COLUMNS}`,
      [
        rfq.id,
        quote.id,
        rfq.assetId,
        buyerInstitutionId,
        sellerInstitutionId,
        buyerUserId,
        sellerUserId,
        quote.quantity,
        quote.pricePerUnit,
        quote.totalAmount,
        fees.makerFee,
        fees.takerFee,
        fees.platformFee,
      ],
    );

    return rows[0];
  }

  async settleTradeSync(tradeId: string): Promise<Trade> {
    const trade = await this.findById(tradeId);

    if (trade.status !== 'pending_settlement') {
      throw new ValidationError(
        `Trade must be in 'pending_settlement' status to settle, current status: ${trade.status}`,
      );
    }

    // Simulated DvP settlement: generate a mock tx hash
    const txHash = '0x' + crypto.randomBytes(32).toString('hex');

    const rows = await this.db.query<Trade>(
      `UPDATE trades
       SET status = 'settled', settlement_tx_hash = $1,
           settled_at = NOW(), updated_at = NOW()
       WHERE id = $2
       RETURNING ${TRADE_COLUMNS}`,
      [txHash, tradeId],
    );

    return rows[0];
  }

  async failTrade(tradeId: string, reason: string): Promise<Trade> {
    const trade = await this.findById(tradeId);

    if (trade.status !== 'pending_settlement') {
      throw new ValidationError(
        `Trade must be in 'pending_settlement' status to fail, current status: ${trade.status}`,
      );
    }

    const rows = await this.db.query<Trade>(
      `UPDATE trades
       SET status = 'failed', failed_at = NOW(),
           failure_reason = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING ${TRADE_COLUMNS}`,
      [reason, tradeId],
    );

    return rows[0];
  }

  async findById(id: string): Promise<Trade> {
    const rows = await this.db.query<Trade>(
      `SELECT ${TRADE_COLUMNS} FROM trades WHERE id = $1`,
      [id],
    );

    if (rows.length === 0) {
      throw new NotFoundError('Trade', id);
    }

    return rows[0];
  }

  async listTrades(params: {
    status?: string;
    assetId?: string;
    institutionId?: string;
    limit: number;
    offset: number;
  }): Promise<{ trades: Trade[]; total: number }> {
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
      conditions.push(`(buyer_institution_id = $${filterValues.length} OR seller_institution_id = $${filterValues.length})`);
    }

    const countRows = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM trades WHERE ${conditions.join(' AND ')}`,
      filterValues,
    );
    const total = parseInt(countRows[0].count, 10);

    const limitParam = filterValues.length + 1;
    const offsetParam = filterValues.length + 2;

    const trades = await this.db.query<Trade>(
      `SELECT ${TRADE_COLUMNS}
       FROM trades
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      [...filterValues, params.limit, params.offset],
    );

    return { trades, total };
  }
}
