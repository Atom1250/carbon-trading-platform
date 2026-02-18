import type { IDatabaseClient } from '@libs/database';
import type {
  FeeBreakdown,
  FeeReport,
  FeeReportQuery,
  InstitutionFees,
} from '../types/trading.types.js';

const MAKER_FEE_RATE = 0.00125; // 0.125%
const TAKER_FEE_RATE = 0.00125; // 0.125%

export class FeeCalculationService {
  constructor(private readonly db: IDatabaseClient) {}

  calculateFees(totalAmount: number): FeeBreakdown {
    const makerFee = Math.round(totalAmount * MAKER_FEE_RATE * 100) / 100;
    const takerFee = Math.round(totalAmount * TAKER_FEE_RATE * 100) / 100;
    const platformFee = Math.round((makerFee + takerFee) * 100) / 100;

    return { makerFee, takerFee, platformFee };
  }

  async getFeeReport(params: FeeReportQuery): Promise<FeeReport> {
    const conditions: string[] = ['1=1'];
    const values: unknown[] = [];

    if (params.startDate) {
      values.push(params.startDate);
      conditions.push(`created_at >= $${values.length}::timestamptz`);
    }

    if (params.endDate) {
      values.push(params.endDate);
      conditions.push(`created_at <= $${values.length}::timestamptz`);
    }

    const rows = await this.db.query<{
      totalMakerFees: string;
      totalTakerFees: string;
      totalPlatformFees: string;
      tradeCount: string;
    }>(
      `SELECT
        COALESCE(SUM(maker_fee), 0)   AS "totalMakerFees",
        COALESCE(SUM(taker_fee), 0)   AS "totalTakerFees",
        COALESCE(SUM(platform_fee), 0) AS "totalPlatformFees",
        COUNT(*)                        AS "tradeCount"
       FROM trades
       WHERE ${conditions.join(' AND ')}`,
      values,
    );

    return {
      totalMakerFees: rows[0].totalMakerFees,
      totalTakerFees: rows[0].totalTakerFees,
      totalPlatformFees: rows[0].totalPlatformFees,
      tradeCount: parseInt(rows[0].tradeCount, 10),
      startDate: params.startDate ?? null,
      endDate: params.endDate ?? null,
    };
  }

  async getFeesByInstitution(institutionId: string): Promise<InstitutionFees> {
    const rows = await this.db.query<{
      totalFeesPaid: string;
      tradeCount: string;
    }>(
      `SELECT
        COALESCE(SUM(
          CASE
            WHEN buyer_institution_id = $1 THEN taker_fee
            WHEN seller_institution_id = $1 THEN maker_fee
            ELSE 0
          END
        ), 0)  AS "totalFeesPaid",
        COUNT(*) AS "tradeCount"
       FROM trades
       WHERE buyer_institution_id = $1 OR seller_institution_id = $1`,
      [institutionId],
    );

    return {
      institutionId,
      totalFeesPaid: rows[0].totalFeesPaid,
      tradeCount: parseInt(rows[0].tradeCount, 10),
    };
  }
}
