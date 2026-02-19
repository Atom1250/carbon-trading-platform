import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { ValidationError } from '@libs/errors';
import type { ReconciliationService } from '../services/ReconciliationService.js';

const RECONCILIATION_STATUSES = ['passed', 'failed', 'warning'] as const;

const runReconciliationSchema = z.object({
  runType: z.string().min(1).max(50).default('daily'),
});

const listReconciliationQuerySchema = z.object({
  status: z.enum(RECONCILIATION_STATUSES).optional(),
  runType: z.string().optional(),
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

export interface ReconciliationRouterDependencies {
  reconciliationService: ReconciliationService;
}

export function createReconciliationRouter(deps: ReconciliationRouterDependencies): Router {
  const { reconciliationService: service } = deps;
  const router = Router();

  // POST /reconciliation/run
  router.post('/run', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = parseBody(runReconciliationSchema, req.body ?? {}, next);
      if (!data) return;

      const run = await service.runReconciliation(data.runType);
      res.status(201).json({ data: run });
    } catch (err) {
      next(err);
    }
  });

  // GET /reconciliation/latest
  router.get('/latest', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const run = await service.getLatestReconciliation();
      if (!run) {
        res.status(200).json({ data: null });
        return;
      }
      res.status(200).json({ data: run });
    } catch (err) {
      next(err);
    }
  });

  // GET /reconciliation
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = parseBody(listReconciliationQuerySchema, req.query, next);
      if (!query) return;

      const result = await service.listReconciliationRuns(query);
      res.status(200).json({
        data: result.runs,
        metadata: {
          total: result.total,
          limit: query.limit,
          offset: query.offset,
        },
      });
    } catch (err) {
      next(err);
    }
  });

  // GET /reconciliation/:id
  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const run = await service.getReconciliationById(req.params['id']!);
      res.status(200).json({ data: run });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
