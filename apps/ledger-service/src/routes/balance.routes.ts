import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { ValidationError } from '@libs/errors';
import type { BalanceService } from '../services/BalanceService.js';

const ACCOUNT_CATEGORIES = ['asset', 'liability', 'revenue', 'expense'] as const;

const categoryQuerySchema = z.object({
  category: z.enum(ACCOUNT_CATEGORIES),
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

export interface BalanceRouterDependencies {
  balanceService: BalanceService;
}

export function createBalanceRouter(deps: BalanceRouterDependencies): Router {
  const { balanceService: service } = deps;
  const router = Router();

  // GET /balances/summary
  router.get('/summary', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const summary = await service.getBalanceSummary();
      res.status(200).json({ data: summary });
    } catch (err) {
      next(err);
    }
  });

  // GET /balances/category/:category
  router.get('/category/:category', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params = parseBody(categoryQuerySchema, { category: req.params['category'] }, next);
      if (!params) return;

      const balances = await service.getBalancesByCategory(params.category);
      res.status(200).json({ data: balances });
    } catch (err) {
      next(err);
    }
  });

  // GET /balances/:accountId
  router.get('/:accountId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const balance = await service.getAccountBalance(req.params['accountId']!);
      res.status(200).json({ data: balance });
    } catch (err) {
      next(err);
    }
  });

  // POST /balances/invalidate
  router.post('/invalidate', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const accountId = req.body?.accountId;
      await service.invalidateCache(accountId);
      res.status(200).json({ data: { message: 'Cache invalidated' } });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
