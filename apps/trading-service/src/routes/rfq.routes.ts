import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { ValidationError } from '@libs/errors';
import type { RFQService } from '../services/RFQService.js';

const RFQ_SIDES = ['buy', 'sell'] as const;
const RFQ_STATUSES = ['open', 'quoted', 'accepted', 'expired', 'cancelled'] as const;

const createRFQSchema = z.object({
  assetId: z.string().uuid('Asset ID must be a valid UUID'),
  requesterInstitutionId: z.string().uuid('Requester institution ID must be a valid UUID'),
  requesterUserId: z.string().uuid('Requester user ID must be a valid UUID'),
  side: z.enum(RFQ_SIDES),
  quantity: z.number().positive('Quantity must be a positive number'),
});

const listRFQsQuerySchema = z.object({
  status: z.enum(RFQ_STATUSES).optional(),
  assetId: z.string().uuid().optional(),
  institutionId: z.string().uuid().optional(),
  side: z.enum(RFQ_SIDES).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const cancelRFQSchema = z.object({
  cancellationReason: z.string().max(5000).optional(),
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

export interface RFQRouterDependencies {
  rfqService: RFQService;
}

export function createRFQRouter(deps: RFQRouterDependencies): Router {
  const { rfqService: service } = deps;
  const router = Router();

  // POST /rfq
  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = parseBody(createRFQSchema, req.body, next);
      if (!data) return;

      const rfq = await service.createRFQ(data);
      res.status(201).json({ data: rfq });
    } catch (err) {
      next(err);
    }
  });

  // GET /rfq  (list)
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = parseBody(listRFQsQuerySchema, req.query, next);
      if (!query) return;

      const result = await service.listRFQs(query);
      res.status(200).json({
        data: result.rfqs,
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

  // GET /rfq/:id
  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rfq = await service.findById(req.params['id']!);
      res.status(200).json({ data: rfq });
    } catch (err) {
      next(err);
    }
  });

  // POST /rfq/:id/cancel
  router.post('/:id/cancel', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = parseBody(cancelRFQSchema, req.body, next);
      if (!data) return;

      const rfq = await service.cancelRFQ(req.params['id']!, data);
      res.status(200).json({ data: rfq });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
