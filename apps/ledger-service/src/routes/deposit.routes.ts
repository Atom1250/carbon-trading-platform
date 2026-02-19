import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { ValidationError } from '@libs/errors';
import type { DepositService } from '../services/DepositService.js';

const DEPOSIT_METHODS = ['card', 'wire', 'ach'] as const;
const DEPOSIT_STATUSES = ['pending', 'processing', 'completed', 'failed', 'cancelled'] as const;

const createDepositSchema = z.object({
  institutionId: z.string().uuid(),
  userId: z.string().uuid(),
  method: z.enum(DEPOSIT_METHODS),
  amount: z.number().positive(),
  currency: z.string().length(3).optional(),
  description: z.string().max(500).optional(),
});

const failDepositSchema = z.object({
  reason: z.string().min(1).max(500),
});

const listDepositsSchema = z.object({
  institutionId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  status: z.enum(DEPOSIT_STATUSES).optional(),
  method: z.enum(DEPOSIT_METHODS).optional(),
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

export interface DepositRouterDependencies {
  depositService: DepositService;
}

export function createDepositRouter(deps: DepositRouterDependencies): Router {
  const { depositService: service } = deps;
  const router = Router();

  // POST /deposits
  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = parseBody(createDepositSchema, req.body, next);
      if (!data) return;

      const deposit = await service.initiateDeposit(data);
      res.status(201).json({ data: deposit });
    } catch (err) {
      next(err);
    }
  });

  // GET /deposits
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params = parseBody(listDepositsSchema, req.query, next);
      if (!params) return;

      const { deposits, total } = await service.listDeposits(params);
      res.status(200).json({
        data: deposits,
        metadata: { total, limit: params.limit, offset: params.offset },
      });
    } catch (err) {
      next(err);
    }
  });

  // GET /deposits/:id
  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const deposit = await service.findById(req.params['id']!);
      res.status(200).json({ data: deposit });
    } catch (err) {
      next(err);
    }
  });

  // POST /deposits/:id/complete
  router.post('/:id/complete', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const deposit = await service.completeDeposit(req.params['id']!);
      res.status(200).json({ data: deposit });
    } catch (err) {
      next(err);
    }
  });

  // POST /deposits/:id/fail
  router.post('/:id/fail', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = parseBody(failDepositSchema, req.body, next);
      if (!data) return;

      const deposit = await service.failDeposit(req.params['id']!, data.reason);
      res.status(200).json({ data: deposit });
    } catch (err) {
      next(err);
    }
  });

  // POST /deposits/:id/cancel
  router.post('/:id/cancel', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const deposit = await service.cancelDeposit(req.params['id']!);
      res.status(200).json({ data: deposit });
    } catch (err) {
      next(err);
    }
  });

  // GET /deposits/institution/:institutionId
  router.get('/institution/:institutionId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { deposits, total } = await service.getDepositsByInstitution(
        req.params['institutionId']!,
        { limit: 20, offset: 0 },
      );
      res.status(200).json({
        data: deposits,
        metadata: { total },
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
