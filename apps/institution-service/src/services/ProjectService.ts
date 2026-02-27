import type { IDatabaseClient } from '@libs/database';
import { NotFoundError, ValidationError } from '@libs/errors';

export interface CreateProjectInput {
  institutionId: string;
  ownerUserId: string;
  name: string;
  description?: string;
  publicDetails?: Record<string, unknown>;
  dataroomDetails?: Record<string, unknown>;
  targetAmount: number;
  currency?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  publicDetails?: Record<string, unknown>;
  dataroomDetails?: Record<string, unknown>;
  targetAmount?: number;
  currency?: string;
  status?: 'draft' | 'open' | 'funding_approved' | 'funded' | 'closed';
}

export interface AddDataroomItemInput {
  title: string;
  description?: string;
  fileUrl: string;
  visibility?: 'public' | 'private';
  createdByUserId: string;
}

export interface CreateFundingRequestInput {
  projectId: string;
  requesterInstitutionId: string;
  requesterUserId: string;
  amount: number;
  currency?: string;
  notes?: string;
}

const PROJECT_COLUMNS = `
  id,
  institution_id AS "institutionId",
  owner_user_id AS "ownerUserId",
  name,
  description,
  public_details AS "publicDetails",
  dataroom_details AS "dataroomDetails",
  target_amount AS "targetAmount",
  currency,
  status,
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

const FUNDING_REQUEST_COLUMNS = `
  id,
  project_id AS "projectId",
  requester_institution_id AS "requesterInstitutionId",
  requester_user_id AS "requesterUserId",
  amount,
  currency,
  status,
  approved_by_user_id AS "approvedByUserId",
  approved_at AS "approvedAt",
  rejected_by_user_id AS "rejectedByUserId",
  rejected_at AS "rejectedAt",
  rejection_reason AS "rejectionReason",
  funded_at AS "fundedAt",
  notes,
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

export class ProjectService {
  constructor(private readonly db: IDatabaseClient) {}

  private async ensureProjectLoanAsset(params: {
    projectId: string;
    issuerInstitutionId: string;
    projectName: string;
    totalSupply: number;
  }): Promise<string> {
    const existing = await this.db.query<{ id: string }>(
      `SELECT id
       FROM assets
       WHERE institution_id = $1
         AND asset_type = 'loan_portion'
         AND metadata_uri = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [params.issuerInstitutionId, `project:${params.projectId}:loan_token`],
    );

    if (existing.length > 0) {
      return existing[0].id;
    }

    const created = await this.db.query<{ id: string }>(
      `INSERT INTO assets (
         institution_id, asset_type, name, description, status,
         total_supply, available_supply, retired_supply, metadata_uri
       ) VALUES (
         $1, 'loan_portion', $2, $3, 'minted',
         $4, $4, 0, $5
       )
       RETURNING id`,
      [
        params.issuerInstitutionId,
        `${params.projectName} Loan Token`,
        `Tokenized loan position for project ${params.projectName}`,
        params.totalSupply,
        `project:${params.projectId}:loan_token`,
      ],
    );

    return created[0].id;
  }

  async createProject(input: CreateProjectInput): Promise<Record<string, unknown>> {
    const rows = await this.db.query<Record<string, unknown>>(
      `INSERT INTO projects (
         institution_id, owner_user_id, name, description, public_details,
         dataroom_details, target_amount, currency, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft')
       RETURNING ${PROJECT_COLUMNS}`,
      [
        input.institutionId,
        input.ownerUserId,
        input.name,
        input.description ?? null,
        JSON.stringify(input.publicDetails ?? {}),
        JSON.stringify(input.dataroomDetails ?? {}),
        input.targetAmount,
        (input.currency ?? 'USD').toUpperCase(),
      ],
    );
    return rows[0];
  }

  async listProjects(params: {
    institutionId?: string;
    status?: string;
    limit: number;
    offset: number;
  }): Promise<{ projects: Record<string, unknown>[]; total: number }> {
    const conditions: string[] = ['1=1'];
    const values: unknown[] = [];

    if (params.institutionId) {
      values.push(params.institutionId);
      conditions.push(`institution_id = $${values.length}`);
    }
    if (params.status) {
      values.push(params.status);
      conditions.push(`status = $${values.length}`);
    }

    const countRows = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM projects WHERE ${conditions.join(' AND ')}`,
      values,
    );

    const limitParam = values.length + 1;
    const offsetParam = values.length + 2;
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT ${PROJECT_COLUMNS}
       FROM projects
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      [...values, params.limit, params.offset],
    );

    return { projects: rows, total: parseInt(countRows[0].count, 10) };
  }

  async findProjectById(projectId: string): Promise<Record<string, unknown>> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT ${PROJECT_COLUMNS} FROM projects WHERE id = $1`,
      [projectId],
    );
    if (rows.length === 0) {
      throw new NotFoundError('Project', projectId);
    }
    return rows[0];
  }

  async updateProject(projectId: string, input: UpdateProjectInput): Promise<Record<string, unknown>> {
    if (
      input.name === undefined &&
      input.description === undefined &&
      input.publicDetails === undefined &&
      input.dataroomDetails === undefined &&
      input.targetAmount === undefined &&
      input.currency === undefined &&
      input.status === undefined
    ) {
      throw new ValidationError('At least one update field is required');
    }

    const existing = await this.findProjectById(projectId);
    const rows = await this.db.query<Record<string, unknown>>(
      `UPDATE projects
       SET name = $2,
           description = $3,
           public_details = $4,
           dataroom_details = $5,
           target_amount = $6,
           currency = $7,
           status = $8,
           updated_at = NOW()
       WHERE id = $1
       RETURNING ${PROJECT_COLUMNS}`,
      [
        projectId,
        input.name ?? existing['name'],
        input.description ?? existing['description'],
        JSON.stringify(input.publicDetails ?? existing['publicDetails'] ?? {}),
        JSON.stringify(input.dataroomDetails ?? existing['dataroomDetails'] ?? {}),
        input.targetAmount ?? existing['targetAmount'],
        (input.currency ?? String(existing['currency'] ?? 'USD')).toUpperCase(),
        input.status ?? existing['status'],
      ],
    );
    return rows[0];
  }

  async addDataroomItem(projectId: string, input: AddDataroomItemInput): Promise<Record<string, unknown>> {
    await this.findProjectById(projectId);
    const rows = await this.db.query<Record<string, unknown>>(
      `INSERT INTO project_dataroom_items (
         project_id, title, description, file_url, visibility, created_by_user_id
       ) VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING
         id, project_id AS "projectId", title, description,
         file_url AS "fileUrl", visibility, created_by_user_id AS "createdByUserId",
         created_at AS "createdAt"`,
      [
        projectId,
        input.title,
        input.description ?? null,
        input.fileUrl,
        input.visibility ?? 'private',
        input.createdByUserId,
      ],
    );
    return rows[0];
  }

  async listDataroomItems(projectId: string): Promise<Record<string, unknown>[]> {
    await this.findProjectById(projectId);
    return this.db.query<Record<string, unknown>>(
      `SELECT
         id, project_id AS "projectId", title, description,
         file_url AS "fileUrl", visibility, created_by_user_id AS "createdByUserId",
         created_at AS "createdAt"
       FROM project_dataroom_items
       WHERE project_id = $1
       ORDER BY created_at DESC`,
      [projectId],
    );
  }

  async createFundingRequest(input: CreateFundingRequestInput): Promise<Record<string, unknown>> {
    await this.findProjectById(input.projectId);
    const rows = await this.db.query<Record<string, unknown>>(
      `INSERT INTO funding_requests (
         project_id, requester_institution_id, requester_user_id, amount, currency, status, notes
       ) VALUES ($1, $2, $3, $4, $5, 'pending', $6)
       RETURNING ${FUNDING_REQUEST_COLUMNS}`,
      [
        input.projectId,
        input.requesterInstitutionId,
        input.requesterUserId,
        input.amount,
        (input.currency ?? 'USD').toUpperCase(),
        input.notes ?? null,
      ],
    );
    return rows[0];
  }

  async listFundingRequests(params: {
    projectId?: string;
    status?: string;
    requesterInstitutionId?: string;
    limit: number;
    offset: number;
  }): Promise<{ requests: Record<string, unknown>[]; total: number }> {
    const conditions: string[] = ['1=1'];
    const values: unknown[] = [];

    if (params.projectId) {
      values.push(params.projectId);
      conditions.push(`project_id = $${values.length}`);
    }
    if (params.status) {
      values.push(params.status);
      conditions.push(`status = $${values.length}`);
    }
    if (params.requesterInstitutionId) {
      values.push(params.requesterInstitutionId);
      conditions.push(`requester_institution_id = $${values.length}`);
    }

    const countRows = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM funding_requests WHERE ${conditions.join(' AND ')}`,
      values,
    );
    const limitParam = values.length + 1;
    const offsetParam = values.length + 2;
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT ${FUNDING_REQUEST_COLUMNS}
       FROM funding_requests
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      [...values, params.limit, params.offset],
    );
    return { requests: rows, total: parseInt(countRows[0].count, 10) };
  }

  async findFundingRequestById(requestId: string): Promise<Record<string, unknown>> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT ${FUNDING_REQUEST_COLUMNS} FROM funding_requests WHERE id = $1`,
      [requestId],
    );
    if (rows.length === 0) {
      throw new NotFoundError('Funding request', requestId);
    }
    return rows[0];
  }

  async approveFundingRequest(requestId: string, approvedByUserId: string, notes?: string): Promise<Record<string, unknown>> {
    const existing = await this.findFundingRequestById(requestId);
    if (existing['status'] !== 'pending') {
      throw new ValidationError(`Only pending funding requests can be approved (current: ${String(existing['status'])})`);
    }

    const rows = await this.db.query<Record<string, unknown>>(
      `UPDATE funding_requests
       SET status = 'approved',
           approved_by_user_id = $2,
           approved_at = NOW(),
           notes = COALESCE($3, notes),
           updated_at = NOW()
       WHERE id = $1
       RETURNING ${FUNDING_REQUEST_COLUMNS}`,
      [requestId, approvedByUserId, notes ?? null],
    );

    await this.db.query(
      `UPDATE projects
       SET status = 'funding_approved', updated_at = NOW()
       WHERE id = $1 AND status IN ('draft', 'open')`,
      [rows[0]['projectId']],
    );

    return rows[0];
  }

  async rejectFundingRequest(requestId: string, rejectedByUserId: string, reason: string): Promise<Record<string, unknown>> {
    const existing = await this.findFundingRequestById(requestId);
    if (existing['status'] !== 'pending') {
      throw new ValidationError(`Only pending funding requests can be rejected (current: ${String(existing['status'])})`);
    }

    const rows = await this.db.query<Record<string, unknown>>(
      `UPDATE funding_requests
       SET status = 'rejected',
           rejected_by_user_id = $2,
           rejected_at = NOW(),
           rejection_reason = $3,
           updated_at = NOW()
       WHERE id = $1
       RETURNING ${FUNDING_REQUEST_COLUMNS}`,
      [requestId, rejectedByUserId, reason],
    );

    return rows[0];
  }

  async markFundingRequestFunded(requestId: string, notes?: string): Promise<Record<string, unknown>> {
    const existing = await this.findFundingRequestById(requestId);
    if (existing['status'] !== 'approved') {
      throw new ValidationError(`Only approved funding requests can be marked funded (current: ${String(existing['status'])})`);
    }

    const rows = await this.db.query<Record<string, unknown>>(
      `UPDATE funding_requests
       SET status = 'funded',
           funded_at = NOW(),
           notes = COALESCE($2, notes),
           updated_at = NOW()
       WHERE id = $1
       RETURNING ${FUNDING_REQUEST_COLUMNS}`,
      [requestId, notes ?? null],
    );

    await this.db.query(
      `UPDATE projects
       SET status = 'funded', updated_at = NOW()
       WHERE id = $1`,
      [rows[0]['projectId']],
    );

    const projectRows = await this.db.query<{
      id: string;
      institutionId: string;
      ownerUserId: string;
      name: string;
    }>(
      `SELECT
         id,
         institution_id AS "institutionId",
         owner_user_id AS "ownerUserId",
         name
       FROM projects
       WHERE id = $1`,
      [rows[0]['projectId']],
    );

    if (projectRows.length === 0) {
      throw new NotFoundError('Project', String(rows[0]['projectId']));
    }

    const project = projectRows[0];
    const amount = Number(rows[0]['amount']);
    const loanAssetId = await this.ensureProjectLoanAsset({
      projectId: project.id,
      issuerInstitutionId: project.institutionId,
      projectName: project.name,
      totalSupply: amount,
    });

    await this.db.query(
      `INSERT INTO wallet_token_positions (
         institution_id, user_id, asset_id, token_type, quantity
       ) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (institution_id, user_id, asset_id, token_type)
       DO UPDATE SET
         quantity = wallet_token_positions.quantity + EXCLUDED.quantity,
         updated_at = NOW()`,
      [
        rows[0]['requesterInstitutionId'],
        rows[0]['requesterUserId'],
        loanAssetId,
        'loan_token',
        amount,
      ],
    );

    await this.db.query(
      `INSERT INTO wallet_token_positions (
         institution_id, user_id, asset_id, token_type, quantity
       ) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (institution_id, user_id, asset_id, token_type)
       DO UPDATE SET
         quantity = wallet_token_positions.quantity + EXCLUDED.quantity,
         updated_at = NOW()`,
      [
        project.institutionId,
        project.ownerUserId,
        loanAssetId,
        'funding_receipt',
        amount,
      ],
    );

    return rows[0];
  }
}
