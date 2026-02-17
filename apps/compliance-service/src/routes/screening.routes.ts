import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { ValidationError } from '@libs/errors';
import type { SanctionsScreeningService } from '../services/SanctionsScreeningService.js';

const ENTITY_TYPES = ['individual', 'organization'] as const;
const REVIEW_STATUSES = ['confirmed_match', 'false_positive'] as const;

const screenEntitySchema = z.object({
  entityType: z.enum(ENTITY_TYPES),
  entityName: z.string().min(1, 'Entity name is required').max(500),
  entityCountry: z.string().length(2, 'Country code must be 2 characters').optional(),
  entityDateOfBirth: z.string().date('Must be a valid date (YYYY-MM-DD)').optional(),
  entityIdentifiers: z.record(z.unknown()).optional(),
  institutionId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  screenedBy: z.string().uuid().optional(),
});

const reviewQueueQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const reviewScreeningSchema = z.object({
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

export interface ScreeningRouterDependencies {
  sanctionsScreeningService: SanctionsScreeningService;
}

export function createScreeningRouter(deps: ScreeningRouterDependencies): Router {
  const { sanctionsScreeningService: service } = deps;
  const router = Router();

  // POST /screenings/entity
  router.post('/entity', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = parseBody(screenEntitySchema, req.body, next);
      if (!data) return;

      const screening = await service.screenEntity(data);
      res.status(201).json({ data: screening });
    } catch (err) {
      next(err);
    }
  });

  // GET /screenings/review-queue
  router.get('/review-queue', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = parseBody(reviewQueueQuerySchema, req.query, next);
      if (!query) return;

      const result = await service.getReviewQueue(query);
      res.status(200).json({
        data: result.screenings,
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

  // GET /screenings/:id
  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const screening = await service.findById(req.params['id']!);
      res.status(200).json({ data: screening });
    } catch (err) {
      next(err);
    }
  });

  // POST /screenings/:id/review
  router.post('/:id/review', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = parseBody(reviewScreeningSchema, req.body, next);
      if (!data) return;

      const screening = await service.reviewScreening(req.params['id']!, data);
      res.status(200).json({ data: screening });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
