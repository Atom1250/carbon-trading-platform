import type { IDatabaseClient } from '@libs/database';
import { NotFoundError, ValidationError } from '@libs/errors';
import type {
  KYCDocument,
  CreateKYCDocumentDTO,
  ReviewKYCDocumentDTO,
  KYCDocumentListQuery,
  KYCStatus,
  KYCEntityType,
  KYCDocumentType,
} from '../types/compliance.types.js';

const DOCUMENT_COLUMNS = `
  id,
  institution_id       AS "institutionId",
  user_id              AS "userId",
  document_type        AS "documentType",
  status,
  file_url             AS "fileUrl",
  reviewer_id          AS "reviewerId",
  reviewed_at          AS "reviewedAt",
  rejection_reason     AS "rejectionReason",
  document_expiry_date AS "documentExpiryDate",
  created_at           AS "createdAt",
  updated_at           AS "updatedAt"
`;

const INSTITUTION_REQUIRED_DOCS: KYCDocumentType[] = [
  'certificate_of_incorporation',
  'proof_of_address',
  'ownership_structure',
];

const USER_REQUIRED_DOCS: KYCDocumentType[] = [
  'government_id',
  'proof_of_address',
  'selfie',
];

export class KYCDocumentService {
  constructor(private readonly db: IDatabaseClient) {}

  async createDocument(data: CreateKYCDocumentDTO): Promise<KYCDocument> {
    if (!data.institutionId && !data.userId) {
      throw new ValidationError('Either institutionId or userId is required');
    }

    const rows = await this.db.query<KYCDocument>(
      `INSERT INTO kyc_documents (
        institution_id, user_id, document_type, file_url, document_expiry_date
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING ${DOCUMENT_COLUMNS}`,
      [
        data.institutionId ?? null,
        data.userId ?? null,
        data.documentType,
        data.fileUrl,
        data.documentExpiryDate ?? null,
      ],
    );

    return rows[0];
  }

  async findById(id: string): Promise<KYCDocument> {
    const rows = await this.db.query<KYCDocument>(
      `SELECT ${DOCUMENT_COLUMNS} FROM kyc_documents WHERE id = $1`,
      [id],
    );

    if (rows.length === 0) {
      throw new NotFoundError('KYC Document', id);
    }

    return rows[0];
  }

  async listDocuments(params: KYCDocumentListQuery): Promise<{ documents: KYCDocument[]; total: number }> {
    const conditions: string[] = [];
    const filterValues: unknown[] = [];

    if (params.institutionId) {
      filterValues.push(params.institutionId);
      conditions.push(`institution_id = $${filterValues.length}`);
    }
    if (params.userId) {
      filterValues.push(params.userId);
      conditions.push(`user_id = $${filterValues.length}`);
    }
    if (params.status) {
      filterValues.push(params.status);
      conditions.push(`status = $${filterValues.length}`);
    }
    if (params.documentType) {
      filterValues.push(params.documentType);
      conditions.push(`document_type = $${filterValues.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRows = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM kyc_documents ${whereClause}`,
      filterValues,
    );
    const total = parseInt(countRows[0].count, 10);

    const limitParam = filterValues.length + 1;
    const offsetParam = filterValues.length + 2;

    const documents = await this.db.query<KYCDocument>(
      `SELECT ${DOCUMENT_COLUMNS}
       FROM kyc_documents
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      [...filterValues, params.limit, params.offset],
    );

    return { documents, total };
  }

  async reviewDocument(id: string, data: ReviewKYCDocumentDTO): Promise<KYCDocument> {
    const rows = await this.db.query<KYCDocument>(
      `SELECT ${DOCUMENT_COLUMNS} FROM kyc_documents WHERE id = $1`,
      [id],
    );

    if (rows.length === 0) {
      throw new NotFoundError('KYC Document', id);
    }

    const doc = rows[0];
    if (doc.status !== 'pending') {
      throw new ValidationError(`Document must be in 'pending' status to review, current status: ${doc.status}`);
    }

    if (data.status === 'rejected' && !data.rejectionReason) {
      throw new ValidationError('Rejection reason is required when rejecting a document');
    }

    const updated = await this.db.query<KYCDocument>(
      `UPDATE kyc_documents
       SET status = $1, reviewer_id = $2, reviewed_at = NOW(),
           rejection_reason = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING ${DOCUMENT_COLUMNS}`,
      [data.status, data.reviewerId, data.rejectionReason ?? null, id],
    );

    return updated[0];
  }

  async getEntityStatus(entityType: KYCEntityType, entityId: string): Promise<KYCStatus> {
    const column = entityType === 'institution' ? 'institution_id' : 'user_id';
    const requiredDocs = entityType === 'institution' ? INSTITUTION_REQUIRED_DOCS : USER_REQUIRED_DOCS;

    const documents = await this.db.query<KYCDocument>(
      `SELECT ${DOCUMENT_COLUMNS} FROM kyc_documents WHERE ${column} = $1 ORDER BY created_at DESC`,
      [entityId],
    );

    const approvedTypes = new Set<KYCDocumentType>();
    const expiredTypes: KYCDocumentType[] = [];
    const now = new Date();

    for (const doc of documents) {
      if (doc.status === 'approved') {
        if (doc.documentExpiryDate && new Date(doc.documentExpiryDate) < now) {
          expiredTypes.push(doc.documentType);
        } else {
          approvedTypes.add(doc.documentType);
        }
      }
    }

    const missingDocuments = requiredDocs.filter((t) => !approvedTypes.has(t));
    const hasPending = documents.some((d) => d.status === 'pending');

    let overallStatus: KYCStatus['overallStatus'];
    if (expiredTypes.length > 0) {
      overallStatus = 'expired';
    } else if (missingDocuments.length === 0) {
      overallStatus = 'complete';
    } else if (hasPending) {
      overallStatus = 'pending';
    } else {
      overallStatus = 'incomplete';
    }

    return {
      entityType,
      entityId,
      overallStatus,
      documents,
      missingDocuments,
      expiredDocuments: expiredTypes,
    };
  }
}
