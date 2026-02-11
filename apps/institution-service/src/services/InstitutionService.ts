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

    return rows[0];
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
