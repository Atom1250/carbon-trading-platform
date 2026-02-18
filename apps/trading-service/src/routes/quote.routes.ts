import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { ValidationError } from '@libs/errors';
import type { QuoteService } from '../services/QuoteService.js';

const submitQuoteSchema = z.object({
  quoterInstitutionId: z.string().uuid('Quoter institution ID must be a valid UUID'),
  quoterUserId: z.string().uuid('Quoter user ID must be a valid UUID'),
  pricePerUnit: z.number().positive('Price per unit must be a positive number'),
  quantity: z.number().positive('Quantity must be a positive number'),
});

const listQuotesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const acceptQuoteSchema = z.object({
  acceptedByUserId: z.string().uuid('Accepted by user ID must be a valid UUID'),
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

export interface QuoteRouterDependencies {
  quoteService: QuoteService;
}

export function createQuoteRouter(deps: QuoteRouterDependencies): Router {
  const { quoteService: service } = deps;
  const router = Router({ mergeParams: true });

  // POST /rfq/:rfqId/quotes
  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = parseBody(submitQuoteSchema, req.body, next);
      if (!data) return;

      const quote = await service.submitQuote(req.params['rfqId']!, data);
      res.status(201).json({ data: quote });
    } catch (err) {
      next(err);
    }
  });

  // GET /rfq/:rfqId/quotes
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = parseBody(listQuotesQuerySchema, req.query, next);
      if (!query) return;

      const result = await service.listQuotesByRFQ(req.params['rfqId']!, query);
      res.status(200).json({
        data: result.quotes,
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

  return router;
}

export function createQuoteActionsRouter(deps: QuoteRouterDependencies): Router {
  const { quoteService: service } = deps;
  const router = Router();

  // POST /quotes/:id/accept
  router.post('/:id/accept', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = parseBody(acceptQuoteSchema, req.body, next);
      if (!data) return;

      const quote = await service.acceptQuote(req.params['id']!, data.acceptedByUserId);
      res.status(200).json({ data: quote });
    } catch (err) {
      next(err);
    }
  });

  // POST /quotes/:id/withdraw
  router.post('/:id/withdraw', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const quote = await service.withdrawQuote(req.params['id']!);
      res.status(200).json({ data: quote });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
