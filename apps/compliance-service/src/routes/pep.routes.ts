import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { ValidationError } from '@libs/errors';
import type { PEPCheckingService } from '../services/PEPCheckingService.js';

const PEP_CATEGORIES = [
  'government_official', 'military', 'state_corp_executive',
  'political_party_official', 'family_member', 'close_associate',
] as const;

const PEP_CHECK_STATUSES = ['clear', 'pep_identified', 'edd_required', 'edd_completed', 'edd_failed'] as const;
const REVIEW_STATUSES = ['edd_completed', 'edd_failed'] as const;

const checkPEPSchema = z.object({
  individualName: z.string().min(1, 'Individual name is required').max(500),
  dateOfBirth: z.string().date('Must be a valid date (YYYY-MM-DD)').optional(),
  nationality: z.string().length(2, 'Nationality must be a 2-character country code').optional(),
  beneficialOwnerId: z.string().uuid().optional(),
  institutionId: z.string().uuid().optional(),
  checkedBy: z.string().uuid().optional(),
});

const listChecksQuerySchema = z.object({
  institutionId: z.string().uuid().optional(),
  status: z.enum(PEP_CHECK_STATUSES).optional(),
  isPep: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const completePEPReviewSchema = z.object({
  reviewedBy: z.string().uuid('Reviewed by must be a valid UUID'),
  status: z.enum(REVIEW_STATUSES),
  notes: z.string().min(1, 'Notes are required').max(5000),
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

export interface PEPRouterDependencies {
  pepCheckingService: PEPCheckingService;
}

export function createPEPRouter(deps: PEPRouterDependencies): Router {
  const { pepCheckingService: service } = deps;
  const router = Router();

  // POST /pep/check
  router.post('/check', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = parseBody(checkPEPSchema, req.body, next);
      if (!data) return;

      const pepCheck = await service.checkIndividual(data);
      res.status(201).json({ data: pepCheck });
    } catch (err) {
      next(err);
    }
  });

  // GET /pep/checks  (before /:id to avoid conflict)
  router.get('/checks', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = parseBody(listChecksQuerySchema, req.query, next);
      if (!query) return;

      const result = await service.listChecks(query);
      res.status(200).json({
        data: result.checks,
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

  // GET /pep/checks/:id
  router.get('/checks/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pepCheck = await service.findById(req.params['id']!);
      res.status(200).json({ data: pepCheck });
    } catch (err) {
      next(err);
    }
  });

  // POST /pep/checks/:id/review
  router.post('/checks/:id/review', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = parseBody(completePEPReviewSchema, req.body, next);
      if (!data) return;

      const pepCheck = await service.completeReview(req.params['id']!, data);
      res.status(200).json({ data: pepCheck });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
