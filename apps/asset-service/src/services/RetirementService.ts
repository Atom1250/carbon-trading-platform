import type { IDatabaseClient } from '@libs/database';
import { NotFoundError, ValidationError } from '@libs/errors';
import { createLogger } from '@libs/logger';
import type { BlockchainService } from './BlockchainService.js';
import type { Asset, Retirement } from '../types/asset.types.js';

const logger = createLogger('retirement-service');

const ASSET_SELECT_COLUMNS = `
  id,
  institution_id    AS "institutionId",
  asset_type        AS "assetType",
  name,
  description,
  status,
  token_id          AS "tokenId",
  minting_tx_hash   AS "mintingTxHash",
  minted_at         AS "mintedAt",
  vintage,
  standard,
  geography,
  metadata_uri      AS "metadataUri",
  total_supply      AS "totalSupply",
  available_supply  AS "availableSupply",
  retired_supply    AS "retiredSupply",
  created_at        AS "createdAt",
  updated_at        AS "updatedAt"
`;

const RETIREMENT_SELECT_COLUMNS = `
  id,
  asset_id            AS "assetId",
  amount,
  retired_by_user_id  AS "retiredByUserId",
  reason,
  transaction_hash    AS "transactionHash",
  created_at          AS "createdAt"
`;

export class RetirementService {
  constructor(
    private readonly db: IDatabaseClient,
    private readonly blockchainService: BlockchainService,
  ) {}

  async retire(
    assetId: string,
    amount: number,
    userId: string,
    reason: string,
  ): Promise<{ txHash: string; amount: number }> {
    const assets = await this.db.query<Asset>(
      `SELECT ${ASSET_SELECT_COLUMNS} FROM assets WHERE id = $1`,
      [assetId],
    );

    if (assets.length === 0) {
      throw new NotFoundError('Asset', assetId);
    }

    const asset = assets[0];

    if (asset.assetType !== 'carbon_credit') {
      throw new ValidationError('Only carbon credits can be retired');
    }

    if (asset.status !== 'minted') {
      throw new ValidationError(
        `Asset must be in 'minted' status to retire (current: '${asset.status}')`,
      );
    }

    if (!asset.tokenId) {
      throw new ValidationError('Asset has no token ID — it has not been minted');
    }

    const availableSupply = parseFloat(asset.availableSupply);

    if (amount <= 0) {
      throw new ValidationError('Retirement amount must be greater than zero');
    }

    if (amount > availableSupply) {
      throw new ValidationError(
        `Insufficient available supply: requested ${amount}, available ${availableSupply}`,
      );
    }

    logger.info('Retiring carbon credits', { assetId, amount, userId });

    const { txHash } = await this.blockchainService.burnToken(
      userId, // In a real system this would be a wallet address
      parseInt(asset.tokenId, 10),
      amount.toString(),
    );

    await this.db.query(
      `INSERT INTO asset_retirements (asset_id, amount, retired_by_user_id, reason, transaction_hash)
       VALUES ($1, $2, $3, $4, $5)`,
      [assetId, amount, userId, reason, txHash],
    );

    await this.db.query(
      `UPDATE assets
       SET available_supply = available_supply - $1,
           retired_supply = retired_supply + $1,
           updated_at = NOW()
       WHERE id = $2`,
      [amount, assetId],
    );

    logger.info('Carbon credits retired successfully', { assetId, amount, txHash });

    return { txHash, amount };
  }

  async getHistory(assetId: string): Promise<Retirement[]> {
    const assets = await this.db.query<Asset>(
      `SELECT id FROM assets WHERE id = $1`,
      [assetId],
    );

    if (assets.length === 0) {
      throw new NotFoundError('Asset', assetId);
    }

    return this.db.query<Retirement>(
      `SELECT ${RETIREMENT_SELECT_COLUMNS}
       FROM asset_retirements
       WHERE asset_id = $1
       ORDER BY created_at DESC`,
      [assetId],
    );
  }
}
