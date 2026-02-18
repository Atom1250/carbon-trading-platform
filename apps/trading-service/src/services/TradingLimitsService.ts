import type { IDatabaseClient } from '@libs/database';
import { NotFoundError, ValidationError } from '@libs/errors';
import type {
  PreTradeValidation,
  TradingLimits,
  DailyLimitStatus,
} from '../types/trading.types.js';

export class TradingLimitsService {
  constructor(private readonly db: IDatabaseClient) {}

  async validatePreTrade(data: PreTradeValidation): Promise<void> {
    // 1. Check institution is active
    const instRows = await this.db.query<{ status: string }>(
      `SELECT status FROM institutions WHERE id = $1`,
      [data.institutionId],
    );

    if (instRows.length === 0) {
      throw new NotFoundError('Institution', data.institutionId);
    }

    if (instRows[0].status !== 'active') {
      throw new ValidationError(
        `Institution is not active (status: ${instRows[0].status})`,
      );
    }

    // 2. Check asset is minted
    const assetRows = await this.db.query<{ status: string }>(
      `SELECT status FROM assets WHERE id = $1`,
      [data.assetId],
    );

    if (assetRows.length === 0) {
      throw new NotFoundError('Asset', data.assetId);
    }

    if (assetRows[0].status !== 'minted') {
      throw new ValidationError(
        `Asset is not available for trading (status: ${assetRows[0].status})`,
      );
    }

    // 3. Check per-trade min/max
    const limits = await this.getTradingLimits(data.institutionId);
    const min = parseFloat(limits.singleTradeMinUsd);
    const max = parseFloat(limits.singleTradeMaxUsd);

    if (data.totalAmount < min) {
      throw new ValidationError(
        `Trade amount $${data.totalAmount} is below minimum of $${min}`,
      );
    }

    if (data.totalAmount > max) {
      throw new ValidationError(
        `Trade amount $${data.totalAmount} exceeds maximum of $${max}`,
      );
    }

    // 4. Check daily limit
    const dailyLimit = parseFloat(limits.dailyLimitUsd);
    if (dailyLimit > 0) {
      const dailyVolume = await this.getDailyVolume(data.institutionId);
      const remaining = dailyLimit - dailyVolume;

      if (data.totalAmount > remaining) {
        throw new ValidationError(
          `Trade amount $${data.totalAmount} would exceed daily limit (remaining: $${remaining.toFixed(2)})`,
        );
      }
    }
    // dailyLimit <= 0 means unlimited (Tier 1)
  }

  async getDailyVolume(institutionId: string): Promise<number> {
    const rows = await this.db.query<{ volume: string }>(
      `SELECT COALESCE(SUM(total_amount), 0) AS volume
       FROM trades
       WHERE (buyer_institution_id = $1 OR seller_institution_id = $1)
         AND status = 'settled'
         AND settled_at >= DATE_TRUNC('day', NOW())`,
      [institutionId],
    );

    return parseFloat(rows[0].volume);
  }

  async getRemainingDailyLimit(institutionId: string): Promise<DailyLimitStatus> {
    const limits = await this.getTradingLimits(institutionId);
    const dailyLimit = parseFloat(limits.dailyLimitUsd);

    if (dailyLimit <= 0) {
      // Unlimited tier
      return { limit: -1, used: 0, remaining: -1 };
    }

    const used = await this.getDailyVolume(institutionId);
    const remaining = Math.max(0, dailyLimit - used);

    return { limit: dailyLimit, used, remaining };
  }

  async getTradingLimits(institutionId: string): Promise<TradingLimits> {
    const rows = await this.db.query<TradingLimits>(
      `SELECT
        institution_id       AS "institutionId",
        daily_limit_usd      AS "dailyLimitUsd",
        single_trade_min_usd AS "singleTradeMinUsd",
        single_trade_max_usd AS "singleTradeMaxUsd",
        created_at           AS "createdAt",
        updated_at           AS "updatedAt"
       FROM trading_limits
       WHERE institution_id = $1`,
      [institutionId],
    );

    if (rows.length === 0) {
      throw new NotFoundError('Trading limits', institutionId);
    }

    return rows[0];
  }
}
