import type { IDatabaseClient } from '@libs/database';

export class WalletTokenService {
  constructor(private readonly db: IDatabaseClient) {}

  async listTokenPositions(params: {
    institutionId?: string;
    userId?: string;
    assetId?: string;
    limit: number;
    offset: number;
  }): Promise<{ positions: Record<string, unknown>[]; total: number }> {
    const conditions: string[] = ['1=1'];
    const values: unknown[] = [];

    if (params.institutionId) {
      values.push(params.institutionId);
      conditions.push(`institution_id = $${values.length}`);
    }
    if (params.userId) {
      values.push(params.userId);
      conditions.push(`user_id = $${values.length}`);
    }
    if (params.assetId) {
      values.push(params.assetId);
      conditions.push(`asset_id = $${values.length}`);
    }

    const countRows = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM wallet_token_positions WHERE ${conditions.join(' AND ')}`,
      values,
    );
    const limitParam = values.length + 1;
    const offsetParam = values.length + 2;

    const positions = await this.db.query<Record<string, unknown>>(
      `SELECT
         id,
         institution_id AS "institutionId",
         user_id AS "userId",
         asset_id AS "assetId",
         token_type AS "tokenType",
         quantity,
         created_at AS "createdAt",
         updated_at AS "updatedAt"
       FROM wallet_token_positions
       WHERE ${conditions.join(' AND ')}
       ORDER BY updated_at DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      [...values, params.limit, params.offset],
    );

    return { positions, total: parseInt(countRows[0].count, 10) };
  }

  async listDvpSettlements(params: {
    institutionId?: string;
    userId?: string;
    tradeId?: string;
    limit: number;
    offset: number;
  }): Promise<{ settlements: Record<string, unknown>[]; total: number }> {
    const conditions: string[] = ['1=1'];
    const values: unknown[] = [];

    if (params.tradeId) {
      values.push(params.tradeId);
      conditions.push(`trade_id = $${values.length}`);
    }
    if (params.institutionId) {
      values.push(params.institutionId);
      conditions.push(`(buyer_institution_id = $${values.length} OR seller_institution_id = $${values.length})`);
    }
    if (params.userId) {
      values.push(params.userId);
      conditions.push(`(buyer_user_id = $${values.length} OR seller_user_id = $${values.length})`);
    }

    const countRows = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM dvp_settlements WHERE ${conditions.join(' AND ')}`,
      values,
    );

    const limitParam = values.length + 1;
    const offsetParam = values.length + 2;

    const settlements = await this.db.query<Record<string, unknown>>(
      `SELECT
         id,
         trade_id AS "tradeId",
         buyer_institution_id AS "buyerInstitutionId",
         seller_institution_id AS "sellerInstitutionId",
         buyer_user_id AS "buyerUserId",
         seller_user_id AS "sellerUserId",
         asset_id AS "assetId",
         token_quantity AS "tokenQuantity",
         cash_amount AS "cashAmount",
         currency,
         settlement_tx_hash AS "settlementTxHash",
         status,
         settled_at AS "settledAt",
         created_at AS "createdAt"
       FROM dvp_settlements
       WHERE ${conditions.join(' AND ')}
       ORDER BY settled_at DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      [...values, params.limit, params.offset],
    );

    return { settlements, total: parseInt(countRows[0].count, 10) };
  }
}
