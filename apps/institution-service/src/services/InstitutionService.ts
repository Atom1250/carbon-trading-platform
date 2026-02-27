import type { IDatabaseClient } from '@libs/database';
import { NotFoundError, ConflictError } from '@libs/errors';
import type {
  Institution,
  CreateInstitutionDTO,
  UpdateInstitutionDTO,
  ListInstitutionsQuery,
  InstitutionListResult,
} from '../types/institution.types.js';

const SELECT_COLUMNS = `
  id,
  name,
  legal_name          AS "legalName",
  registration_number AS "registrationNumber",
  tier,
  status,
  country_code        AS "countryCode",
  created_at          AS "createdAt",
  updated_at          AS "updatedAt"
`;

export class InstitutionService {
  constructor(private readonly db: IDatabaseClient) {}

  private getDefaultLimitsByTier(tier: Institution['tier']): {
    dailyLimitUsd: number;
    singleTradeMinUsd: number;
    singleTradeMaxUsd: number;
  } {
    if (tier === 'tier1') {
      return { dailyLimitUsd: 0, singleTradeMinUsd: 1, singleTradeMaxUsd: 1_000_000 };
    }
    if (tier === 'tier2') {
      return { dailyLimitUsd: 250_000, singleTradeMinUsd: 1, singleTradeMaxUsd: 250_000 };
    }
    if (tier === 'tier3') {
      return { dailyLimitUsd: 1_000_000, singleTradeMinUsd: 1, singleTradeMaxUsd: 500_000 };
    }
    return { dailyLimitUsd: 2_000_000, singleTradeMinUsd: 1, singleTradeMaxUsd: 1_000_000 };
  }

  async create(data: CreateInstitutionDTO): Promise<Institution> {
    if (data.registrationNumber) {
      const existing = await this.db.query<Institution>(
        `SELECT id FROM institutions WHERE registration_number = $1`,
        [data.registrationNumber],
      );
      if (existing.length > 0) {
        throw new ConflictError(
          `Institution with registration number '${data.registrationNumber}' already exists`,
        );
      }
    }

    const rows = await this.db.query<Institution>(
      `INSERT INTO institutions (name, legal_name, registration_number, tier, country_code)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${SELECT_COLUMNS}`,
      [
        data.name,
        data.legalName,
        data.registrationNumber ?? null,
        data.tier,
        data.countryCode,
      ],
    );

    const created = rows[0];
    const limits = this.getDefaultLimitsByTier(created.tier);
    await this.db.query(
      `INSERT INTO trading_limits (institution_id, daily_limit_usd, single_trade_min_usd, single_trade_max_usd)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (institution_id) DO NOTHING`,
      [created.id, limits.dailyLimitUsd, limits.singleTradeMinUsd, limits.singleTradeMaxUsd],
    );

    return created;
  }

  async findById(id: string): Promise<Institution> {
    const rows = await this.db.query<Institution>(
      `SELECT ${SELECT_COLUMNS} FROM institutions WHERE id = $1`,
      [id],
    );

    if (rows.length === 0) {
      throw new NotFoundError('Institution', id);
    }

    return rows[0];
  }

  async update(id: string, data: UpdateInstitutionDTO): Promise<Institution> {
    // Verify exists first
    await this.findById(id);

    const setClauses: string[] = [];
    const values: unknown[] = [];

    if (data.tier !== undefined) {
      setClauses.push(`tier = $${values.length + 1}`);
      values.push(data.tier);
    }

    if (data.status !== undefined) {
      setClauses.push(`status = $${values.length + 1}`);
      values.push(data.status);
    }

    setClauses.push('updated_at = NOW()');
    values.push(id);

    const rows = await this.db.query<Institution>(
      `UPDATE institutions
       SET ${setClauses.join(', ')}
       WHERE id = $${values.length}
       RETURNING ${SELECT_COLUMNS}`,
      values,
    );

    return rows[0];
  }

  async list(params: ListInstitutionsQuery): Promise<InstitutionListResult> {
    const conditions: string[] = [];
    const filterValues: unknown[] = [];

    if (params.status) {
      conditions.push(`status = $${filterValues.length + 1}`);
      filterValues.push(params.status);
    }

    if (params.tier) {
      conditions.push(`tier = $${filterValues.length + 1}`);
      filterValues.push(params.tier);
    }

    if (params.countryCode) {
      conditions.push(`country_code = $${filterValues.length + 1}`);
      filterValues.push(params.countryCode.toUpperCase());
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRows = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM institutions ${whereClause}`,
      filterValues,
    );
    const total = parseInt(countRows[0].count, 10);

    const limitParam = filterValues.length + 1;
    const offsetParam = filterValues.length + 2;
    const paginatedValues = [...filterValues, params.limit, params.offset];

    const institutions = await this.db.query<Institution>(
      `SELECT ${SELECT_COLUMNS}
       FROM institutions
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      paginatedValues,
    );

    return { institutions, total };
  }
}
