import type { IDatabaseClient } from '@libs/database';
import { NotFoundError, ValidationError } from '@libs/errors';
import type {
  SARReport,
  GenerateSARDTO,
  ReviewSARDTO,
  FileSARDTO,
  SARListQuery,
} from '../types/compliance.types.js';

const SAR_COLUMNS = `
  id,
  institution_id        AS "institutionId",
  subject_type          AS "subjectType",
  subject_id            AS "subjectId",
  subject_name          AS "subjectName",
  trigger_type          AS "triggerType",
  trigger_reference_id  AS "triggerReferenceId",
  status,
  suspicious_amount_usd AS "suspiciousAmountUsd",
  activity_start_date   AS "activityStartDate",
  activity_end_date     AS "activityEndDate",
  narrative,
  supporting_data       AS "supportingData",
  generated_by          AS "generatedBy",
  reviewed_by           AS "reviewedBy",
  reviewed_at           AS "reviewedAt",
  review_notes          AS "reviewNotes",
  filed_at              AS "filedAt",
  filing_reference      AS "filingReference",
  filing_confirmation   AS "filingConfirmation",
  created_at            AS "createdAt",
  updated_at            AS "updatedAt"
`;

export class SARService {
  constructor(private readonly db: IDatabaseClient) {}

  async generateSAR(data: GenerateSARDTO): Promise<SARReport> {
    const rows = await this.db.query<SARReport>(
      `INSERT INTO sar_reports (
        institution_id, subject_type, subject_id, subject_name,
        trigger_type, trigger_reference_id, status,
        suspicious_amount_usd, activity_start_date, activity_end_date,
        narrative, supporting_data, generated_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7, $8, $9, $10, $11, $12)
      RETURNING ${SAR_COLUMNS}`,
      [
        data.institutionId ?? null,
        data.subjectType,
        data.subjectId,
        data.subjectName,
        data.triggerType,
        data.triggerReferenceId ?? null,
        data.suspiciousAmountUsd ?? null,
        data.activityStartDate ?? null,
        data.activityEndDate ?? null,
        data.narrative,
        data.supportingData ? JSON.stringify(data.supportingData) : '{}',
        data.generatedBy ?? null,
      ],
    );

    return rows[0];
  }

  async findById(id: string): Promise<SARReport> {
    const rows = await this.db.query<SARReport>(
      `SELECT ${SAR_COLUMNS} FROM sar_reports WHERE id = $1`,
      [id],
    );

    if (rows.length === 0) {
      throw new NotFoundError('SAR Report', id);
    }

    return rows[0];
  }

  async listSARs(params: SARListQuery): Promise<{ reports: SARReport[]; total: number }> {
    const conditions: string[] = ['1=1'];
    const filterValues: unknown[] = [];

    if (params.status) {
      filterValues.push(params.status);
      conditions.push(`status = $${filterValues.length}`);
    }

    if (params.triggerType) {
      filterValues.push(params.triggerType);
      conditions.push(`trigger_type = $${filterValues.length}`);
    }

    if (params.institutionId) {
      filterValues.push(params.institutionId);
      conditions.push(`institution_id = $${filterValues.length}`);
    }

    const countRows = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM sar_reports WHERE ${conditions.join(' AND ')}`,
      filterValues,
    );
    const total = parseInt(countRows[0].count, 10);

    const limitParam = filterValues.length + 1;
    const offsetParam = filterValues.length + 2;

    const reports = await this.db.query<SARReport>(
      `SELECT ${SAR_COLUMNS}
       FROM sar_reports
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      [...filterValues, params.limit, params.offset],
    );

    return { reports, total };
  }

  async submitSAR(id: string): Promise<SARReport> {
    const existing = await this.findById(id);

    if (existing.status !== 'draft') {
      throw new ValidationError(
        `SAR must be in 'draft' status to submit, current status: ${existing.status}`,
      );
    }

    const rows = await this.db.query<SARReport>(
      `UPDATE sar_reports
       SET status = 'pending_review', updated_at = NOW()
       WHERE id = $1
       RETURNING ${SAR_COLUMNS}`,
      [id],
    );

    return rows[0];
  }

  async reviewSAR(id: string, data: ReviewSARDTO): Promise<SARReport> {
    const existing = await this.findById(id);

    if (existing.status !== 'pending_review') {
      throw new ValidationError(
        `SAR must be in 'pending_review' status to review, current status: ${existing.status}`,
      );
    }

    const rows = await this.db.query<SARReport>(
      `UPDATE sar_reports
       SET status = $1, reviewed_by = $2, reviewed_at = NOW(),
           review_notes = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING ${SAR_COLUMNS}`,
      [data.status, data.reviewedBy, data.notes, id],
    );

    return rows[0];
  }

  async fileSAR(id: string, data: FileSARDTO): Promise<SARReport> {
    const existing = await this.findById(id);

    if (existing.status !== 'approved') {
      throw new ValidationError(
        `SAR must be in 'approved' status to file, current status: ${existing.status}`,
      );
    }

    const rows = await this.db.query<SARReport>(
      `UPDATE sar_reports
       SET status = 'filed', filed_at = NOW(),
           filing_reference = $1, filing_confirmation = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING ${SAR_COLUMNS}`,
      [
        data.filingReference,
        data.filingConfirmation ? JSON.stringify(data.filingConfirmation) : null,
        id,
      ],
    );

    return rows[0];
  }
}
