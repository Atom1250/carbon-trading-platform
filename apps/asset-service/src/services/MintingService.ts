import type { IDatabaseClient } from '@libs/database';
import { NotFoundError, ValidationError } from '@libs/errors';
import { createLogger } from '@libs/logger';
import type { BlockchainService } from './BlockchainService.js';
import type { Asset } from '../types/asset.types.js';

const logger = createLogger('minting-service');

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

export class MintingService {
  constructor(
    private readonly db: IDatabaseClient,
    private readonly blockchainService: BlockchainService,
  ) {}

  async mintAssetTokens(
    assetId: string,
    recipientAddress: string,
  ): Promise<{ tokenId: string; txHash: string }> {
    const assets = await this.db.query<Asset>(
      `SELECT ${ASSET_SELECT_COLUMNS} FROM assets WHERE id = $1`,
      [assetId],
    );

    if (assets.length === 0) {
      throw new NotFoundError('Asset', assetId);
    }

    const asset = assets[0];

    if (asset.status !== 'verified') {
      throw new ValidationError(
        `Asset must be in 'verified' status to mint (current: '${asset.status}')`,
      );
    }

    if (asset.tokenId) {
      throw new ValidationError('Asset has already been minted');
    }

    // Generate a numeric token ID from the asset UUID (take first 8 hex chars)
    const tokenId = parseInt(asset.id.replace(/-/g, '').slice(0, 8), 16).toString();

    logger.info('Minting asset tokens', { assetId, tokenId, amount: asset.totalSupply });

    const { txHash } = await this.blockchainService.mintToken(
      recipientAddress,
      tokenId,
      asset.totalSupply,
      asset.metadataUri ?? '',
    );

    await this.db.query<Asset>(
      `UPDATE assets
       SET token_id = $1, minting_tx_hash = $2, minted_at = NOW(), status = 'minted', updated_at = NOW()
       WHERE id = $3
       RETURNING ${ASSET_SELECT_COLUMNS}`,
      [tokenId, txHash, assetId],
    );

    logger.info('Asset minted successfully', { assetId, tokenId, txHash });

    return { tokenId, txHash };
  }
}
