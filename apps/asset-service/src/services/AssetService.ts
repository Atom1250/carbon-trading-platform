import type { IDatabaseClient } from '@libs/database';
import { NotFoundError } from '@libs/errors';
import type {
  Asset,
  CreateAssetDTO,
  UpdateAssetDTO,
  ListAssetsQuery,
  AssetListResult,
} from '../types/asset.types.js';

const SELECT_COLUMNS = `
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

export class AssetService {
  constructor(private readonly db: IDatabaseClient) {}

  async create(data: CreateAssetDTO): Promise<Asset> {
    const rows = await this.db.query<Asset>(
      `INSERT INTO assets (institution_id, asset_type, name, description, vintage, standard, geography, total_supply, available_supply)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
       RETURNING ${SELECT_COLUMNS}`,
      [
        data.institutionId,
        data.assetType,
        data.name,
        data.description ?? null,
        data.vintage ?? null,
        data.standard ?? null,
        data.geography ?? null,
        data.totalSupply,
      ],
    );

    return rows[0];
  }

  async findById(id: string): Promise<Asset> {
    const rows = await this.db.query<Asset>(
      `SELECT ${SELECT_COLUMNS} FROM assets WHERE id = $1`,
      [id],
    );

    if (rows.length === 0) {
      throw new NotFoundError('Asset', id);
    }

    return rows[0];
  }

  async update(id: string, data: UpdateAssetDTO): Promise<Asset> {
    await this.findById(id);

    const setClauses: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) {
      setClauses.push(`name = $${values.length + 1}`);
      values.push(data.name);
    }

    if (data.description !== undefined) {
      setClauses.push(`description = $${values.length + 1}`);
      values.push(data.description);
    }

    if (data.status !== undefined) {
      setClauses.push(`status = $${values.length + 1}`);
      values.push(data.status);
    }

    if (data.vintage !== undefined) {
      setClauses.push(`vintage = $${values.length + 1}`);
      values.push(data.vintage);
    }

    if (data.standard !== undefined) {
      setClauses.push(`standard = $${values.length + 1}`);
      values.push(data.standard);
    }

    if (data.geography !== undefined) {
      setClauses.push(`geography = $${values.length + 1}`);
      values.push(data.geography);
    }

    if (data.metadataUri !== undefined) {
      setClauses.push(`metadata_uri = $${values.length + 1}`);
      values.push(data.metadataUri);
    }

    setClauses.push('updated_at = NOW()');
    values.push(id);

    const rows = await this.db.query<Asset>(
      `UPDATE assets
       SET ${setClauses.join(', ')}
       WHERE id = $${values.length}
       RETURNING ${SELECT_COLUMNS}`,
      values,
    );

    return rows[0];
  }

  async list(params: ListAssetsQuery): Promise<AssetListResult> {
    const conditions: string[] = [];
    const filterValues: unknown[] = [];

    if (params.assetType) {
      conditions.push(`asset_type = $${filterValues.length + 1}`);
      filterValues.push(params.assetType);
    }

    if (params.status) {
      conditions.push(`status = $${filterValues.length + 1}`);
      filterValues.push(params.status);
    }

    if (params.institutionId) {
      conditions.push(`institution_id = $${filterValues.length + 1}`);
      filterValues.push(params.institutionId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRows = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM assets ${whereClause}`,
      filterValues,
    );
    const total = parseInt(countRows[0].count, 10);

    const limitParam = filterValues.length + 1;
    const offsetParam = filterValues.length + 2;
    const paginatedValues = [...filterValues, params.limit, params.offset];

    const assets = await this.db.query<Asset>(
      `SELECT ${SELECT_COLUMNS}
       FROM assets
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      paginatedValues,
    );

    return { assets, total };
  }
}
