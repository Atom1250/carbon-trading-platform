import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { ValidationError } from '@libs/errors';
import type { SARService } from '../services/SARService.js';

const SAR_STATUSES = ['draft', 'pending_review', 'approved', 'filed', 'rejected'] as const;
const TRIGGER_TYPES = ['aml_alert', 'sanctions_match', 'pep_edd_failed', 'manual', 'threshold_exceeded'] as const;
const REVIEW_STATUSES = ['approved', 'rejected'] as const;

const generateSARSchema = z.object({
  institutionId: z.string().uuid().optional(),
  subjectType: z.string().min(1, 'Subject type is required').max(50),
  subjectId: z.string().uuid('Subject ID must be a valid UUID'),
  subjectName: z.string().min(1, 'Subject name is required').max(500),
  triggerType: z.enum(TRIGGER_TYPES),
  triggerReferenceId: z.string().uuid().optional(),
  suspiciousAmountUsd: z.number().positive().optional(),
  activityStartDate: z.string().date('Must be a valid date (YYYY-MM-DD)').optional(),
  activityEndDate: z.string().date('Must be a valid date (YYYY-MM-DD)').optional(),
  narrative: z.string().min(1, 'Narrative is required').max(50000),
  supportingData: z.record(z.string(), z.any()).optional(),
  generatedBy: z.string().uuid().optional(),
});

const listSARsQuerySchema = z.object({
  status: z.enum(SAR_STATUSES).optional(),
  triggerType: z.enum(TRIGGER_TYPES).optional(),
  institutionId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const reviewSARSchema = z.object({
  reviewedBy: z.string().uuid('Reviewed by must be a valid UUID'),
  status: z.enum(REVIEW_STATUSES),
  notes: z.string().min(1, 'Notes are required').max(5000),
});

const fileSARSchema = z.object({
  filingReference: z.string().min(1, 'Filing reference is required').max(200),
  filingConfirmation: z.record(z.string(), z.any()).optional(),
});

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

export interface SARRouterDependencies {
  sarService: SARService;
}

export function createSARRouter(deps: SARRouterDependencies): Router {
  const { sarService: service } = deps;
  const router = Router();

  // POST /sar/generate
  router.post('/generate', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = parseBody(generateSARSchema, req.body, next);
      if (!data) return;

      const report = await service.generateSAR(data);
      res.status(201).json({ data: report });
    } catch (err) {
      next(err);
    }
  });

  // GET /sar  (list)
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = parseBody(listSARsQuerySchema, req.query, next);
      if (!query) return;

      const result = await service.listSARs(query);
      res.status(200).json({
        data: result.reports,
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

  // GET /sar/:id
  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const report = await service.findById(req.params['id']!);
      res.status(200).json({ data: report });
    } catch (err) {
      next(err);
    }
  });

  // POST /sar/:id/submit  (draft → pending_review)
  router.post('/:id/submit', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const report = await service.submitSAR(req.params['id']!);
      res.status(200).json({ data: report });
    } catch (err) {
      next(err);
    }
  });

  // POST /sar/:id/review  (pending_review → approved/rejected)
  router.post('/:id/review', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = parseBody(reviewSARSchema, req.body, next);
      if (!data) return;

      const report = await service.reviewSAR(req.params['id']!, data);
      res.status(200).json({ data: report });
    } catch (err) {
      next(err);
    }
  });

  // POST /sar/:id/file  (approved → filed)
  router.post('/:id/file', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = parseBody(fileSARSchema, req.body, next);
      if (!data) return;

      const report = await service.fileSAR(req.params['id']!, data);
      res.status(200).json({ data: report });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
