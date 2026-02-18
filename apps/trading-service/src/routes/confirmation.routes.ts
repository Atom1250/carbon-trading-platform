import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { ValidationError } from '@libs/errors';
import type { TradeExecutionService } from '../services/TradeExecutionService.js';

const listTradesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
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

export interface ConfirmationRouterDependencies {
  tradeExecutionService: TradeExecutionService;
}

export function createConfirmationRouter(deps: ConfirmationRouterDependencies): Router {
  const { tradeExecutionService: service } = deps;
  const router = Router();

  // GET /trades/:id/confirmation
  router.get('/:id/confirmation', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const confirmation = await service.getTradeConfirmation(req.params['id']!);
      res.status(200).json({ data: confirmation });
    } catch (err) {
      next(err);
    }
  });

  // GET /trades/institution/:institutionId
  router.get('/institution/:institutionId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = parseBody(listTradesQuerySchema, req.query, next);
      if (!query) return;

      const result = await service.getTradesByInstitution(
        req.params['institutionId']!,
        query,
      );
      res.status(200).json({
        data: result.trades,
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
