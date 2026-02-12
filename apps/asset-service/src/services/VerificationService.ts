import type { IDatabaseClient } from '@libs/database';
import { NotFoundError, ValidationError } from '@libs/errors';
import type { Asset, VerificationRecord } from '../types/asset.types.js';

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

const VERIFICATION_SELECT_COLUMNS = `
  id,
  asset_id      AS "assetId",
  decision,
  verified_by   AS "verifiedBy",
  notes,
  created_at    AS "createdAt"
`;

export class VerificationService {
  constructor(private readonly db: IDatabaseClient) {}

  async submitForVerification(assetId: string): Promise<Asset> {
    const assets = await this.db.query<Asset>(
      `SELECT ${ASSET_SELECT_COLUMNS} FROM assets WHERE id = $1`,
      [assetId],
    );

    if (assets.length === 0) {
      throw new NotFoundError('Asset', assetId);
    }

    const asset = assets[0];

    if (asset.status !== 'draft') {
      throw new ValidationError(
        `Asset must be in 'draft' status to submit for verification (current: '${asset.status}')`,
      );
    }

    const rows = await this.db.query<Asset>(
      `UPDATE assets SET status = 'pending_verification', updated_at = NOW()
       WHERE id = $1
       RETURNING ${ASSET_SELECT_COLUMNS}`,
      [assetId],
    );

    return rows[0];
  }

  async approve(assetId: string, verifiedBy: string, notes?: string): Promise<Asset> {
    const assets = await this.db.query<Asset>(
      `SELECT ${ASSET_SELECT_COLUMNS} FROM assets WHERE id = $1`,
      [assetId],
    );

    if (assets.length === 0) {
      throw new NotFoundError('Asset', assetId);
    }

    const asset = assets[0];

    if (asset.status !== 'pending_verification') {
      throw new ValidationError(
        `Asset must be in 'pending_verification' status to approve (current: '${asset.status}')`,
      );
    }

    await this.db.query(
      `INSERT INTO asset_verifications (asset_id, decision, verified_by, notes)
       VALUES ($1, 'approved', $2, $3)`,
      [assetId, verifiedBy, notes ?? null],
    );

    const rows = await this.db.query<Asset>(
      `UPDATE assets SET status = 'verified', updated_at = NOW()
       WHERE id = $1
       RETURNING ${ASSET_SELECT_COLUMNS}`,
      [assetId],
    );

    return rows[0];
  }

  async reject(assetId: string, verifiedBy: string, notes: string): Promise<Asset> {
    const assets = await this.db.query<Asset>(
      `SELECT ${ASSET_SELECT_COLUMNS} FROM assets WHERE id = $1`,
      [assetId],
    );

    if (assets.length === 0) {
      throw new NotFoundError('Asset', assetId);
    }

    const asset = assets[0];

    if (asset.status !== 'pending_verification') {
      throw new ValidationError(
        `Asset must be in 'pending_verification' status to reject (current: '${asset.status}')`,
      );
    }

    await this.db.query(
      `INSERT INTO asset_verifications (asset_id, decision, verified_by, notes)
       VALUES ($1, 'rejected', $2, $3)`,
      [assetId, verifiedBy, notes],
    );

    const rows = await this.db.query<Asset>(
      `UPDATE assets SET status = 'draft', updated_at = NOW()
       WHERE id = $1
       RETURNING ${ASSET_SELECT_COLUMNS}`,
      [assetId],
    );

    return rows[0];
  }

  async getHistory(assetId: string): Promise<VerificationRecord[]> {
    const assets = await this.db.query<Asset>(
      `SELECT id FROM assets WHERE id = $1`,
      [assetId],
    );

    if (assets.length === 0) {
      throw new NotFoundError('Asset', assetId);
    }

    return this.db.query<VerificationRecord>(
      `SELECT ${VERIFICATION_SELECT_COLUMNS}
       FROM asset_verifications
       WHERE asset_id = $1
       ORDER BY created_at DESC`,
      [assetId],
    );
  }
}
