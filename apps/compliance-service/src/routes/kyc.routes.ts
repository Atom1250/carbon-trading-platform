import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { ValidationError } from '@libs/errors';
import type { KYCDocumentService } from '../services/KYCDocumentService.js';

const DOCUMENT_TYPES = ['certificate_of_incorporation', 'proof_of_address', 'ownership_structure', 'government_id', 'selfie'] as const;
const DOCUMENT_STATUSES = ['pending', 'approved', 'rejected'] as const;
const REVIEW_STATUSES = ['approved', 'rejected'] as const;
const ENTITY_TYPES = ['institution', 'user'] as const;

const createDocumentSchema = z.object({
  institutionId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  documentType: z.enum(DOCUMENT_TYPES),
  fileUrl: z.string().url('File URL must be a valid URL').max(500),
  documentExpiryDate: z.string().date('Must be a valid date (YYYY-MM-DD)').optional(),
}).refine(
  (data) => data.institutionId || data.userId,
  { message: 'Either institutionId or userId is required', path: ['institutionId'] },
);

const listDocumentsQuerySchema = z.object({
  institutionId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  status: z.enum(DOCUMENT_STATUSES).optional(),
  documentType: z.enum(DOCUMENT_TYPES).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const reviewDocumentSchema = z.object({
  reviewerId: z.string().uuid('Reviewer ID must be a valid UUID'),
  status: z.enum(REVIEW_STATUSES),
  rejectionReason: z.string().min(1).max(5000).optional(),
}).refine(
  (data) => data.status !== 'rejected' || data.rejectionReason,
  { message: 'Rejection reason is required when rejecting a document', path: ['rejectionReason'] },
);

function parseBody<T>(
  schema: z.ZodType<T>,
  body: unknown,
  next: NextFunction,
): T | null {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
      code: i.code,
    }));
    next(new ValidationError('Validation failed', errors));
    return null;
  }
  return parsed.data;
}

export interface KYCRouterDependencies {
  kycDocumentService: KYCDocumentService;
}

export function createKYCRouter(deps: KYCRouterDependencies): Router {
  const { kycDocumentService: service } = deps;
  const router = Router();

  // POST /kyc/documents
  router.post('/documents', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = parseBody(createDocumentSchema, req.body, next);
      if (!data) return;

      const doc = await service.createDocument(data);
      res.status(201).json({ data: doc });
    } catch (err) {
      next(err);
    }
  });

  // GET /kyc/documents
  router.get('/documents', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = parseBody(listDocumentsQuerySchema, req.query, next);
      if (!query) return;

      const result = await service.listDocuments(query);
      res.status(200).json({
        data: result.documents,
        metadata: {
          total: result.total,
          limit: query.limit,
          offset: query.offset,
          hasMore: query.offset + query.limit < result.total,
        },
      });
    } catch (err) {
      next(err);
    }
  });

  // GET /kyc/documents/:id
  router.get('/documents/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const doc = await service.findById(req.params['id']!);
      res.status(200).json({ data: doc });
    } catch (err) {
      next(err);
    }
  });

  // POST /kyc/documents/:id/review
  router.post('/documents/:id/review', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = parseBody(reviewDocumentSchema, req.body, next);
      if (!data) return;

      const doc = await service.reviewDocument(req.params['id']!, data);
      res.status(200).json({ data: doc });
    } catch (err) {
      next(err);
    }
  });

  // GET /kyc/status/:entityType/:entityId
  router.get('/status/:entityType/:entityId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const entityType = req.params['entityType'];
      if (!ENTITY_TYPES.includes(entityType as typeof ENTITY_TYPES[number])) {
        next(new ValidationError(`Entity type must be one of: ${ENTITY_TYPES.join(', ')}`));
        return;
      }

      const status = await service.getEntityStatus(
        entityType as typeof ENTITY_TYPES[number],
        req.params['entityId']!,
      );
      res.status(200).json({ data: status });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
