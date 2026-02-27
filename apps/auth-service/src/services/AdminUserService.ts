import type { IDatabaseClient } from '@libs/database';
import { NotFoundError } from '@libs/errors';

export interface AdminUser {
  id: string;
  institutionId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  hasVerifiedEmail: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListAdminUsersQuery {
  institutionId?: string;
  isActive?: boolean;
  limit: number;
  offset: number;
}

const USER_COLUMNS = `
  id,
  institution_id      AS "institutionId",
  email,
  first_name          AS "firstName",
  last_name           AS "lastName",
  role,
  is_active           AS "isActive",
  has_verified_email  AS "hasVerifiedEmail",
  created_at          AS "createdAt",
  updated_at          AS "updatedAt"
`;

export class AdminUserService {
  constructor(private readonly db: IDatabaseClient) {}

  async listUsers(params: ListAdminUsersQuery): Promise<{ users: AdminUser[]; total: number }> {
    const conditions: string[] = ['1=1'];
    const values: unknown[] = [];

    if (params.institutionId) {
      values.push(params.institutionId);
      conditions.push(`institution_id = $${values.length}`);
    }

    if (params.isActive !== undefined) {
      values.push(params.isActive);
      conditions.push(`is_active = $${values.length}`);
    }

    const countRows = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM users WHERE ${conditions.join(' AND ')}`,
      values,
    );
    const total = parseInt(countRows[0].count, 10);

    const limitParam = values.length + 1;
    const offsetParam = values.length + 2;

    const users = await this.db.query<AdminUser>(
      `SELECT ${USER_COLUMNS}
       FROM users
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      [...values, params.limit, params.offset],
    );

    return { users, total };
  }

  async approveUser(userId: string): Promise<AdminUser> {
    const rows = await this.db.query<AdminUser>(
      `UPDATE users
       SET is_active = true,
           has_verified_email = true,
           updated_at = NOW()
       WHERE id = $1
       RETURNING ${USER_COLUMNS}`,
      [userId],
    );

    if (rows.length === 0) {
      throw new NotFoundError('User', userId);
    }

    return rows[0];
  }

  async deactivateUser(userId: string): Promise<AdminUser> {
    const rows = await this.db.query<AdminUser>(
      `UPDATE users
       SET is_active = false,
           updated_at = NOW()
       WHERE id = $1
       RETURNING ${USER_COLUMNS}`,
      [userId],
    );

    if (rows.length === 0) {
      throw new NotFoundError('User', userId);
    }

    return rows[0];
  }
}
