import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { ValidationError } from '@libs/errors';
import type { WithdrawalService } from '../services/WithdrawalService.js';

const WITHDRAWAL_METHODS = ['wire', 'ach'] as const;
const WITHDRAWAL_STATUSES = ['pending_approval', 'approved', 'processing', 'completed', 'failed', 'rejected'] as const;

const createWithdrawalSchema = z.object({
  institutionId: z.string().uuid(),
  userId: z.string().uuid(),
  method: z.enum(WITHDRAWAL_METHODS),
  amount: z.number().positive(),
  currency: z.string().length(3).optional(),
  description: z.string().max(500).optional(),
});

const approveWithdrawalSchema = z.object({
  approvedBy: z.string().uuid(),
});

const rejectWithdrawalSchema = z.object({
  rejectedBy: z.string().uuid(),
  reason: z.string().min(1).max(500),
});

const failWithdrawalSchema = z.object({
  reason: z.string().min(1).max(500),
});

const listWithdrawalsSchema = z.object({
  institutionId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  status: z.enum(WITHDRAWAL_STATUSES).optional(),
  method: z.enum(WITHDRAWAL_METHODS).optional(),
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

export interface WithdrawalRouterDependencies {
  withdrawalService: WithdrawalService;
}

export function createWithdrawalRouter(deps: WithdrawalRouterDependencies): Router {
  const { withdrawalService: service } = deps;
  const router = Router();

  // POST /withdrawals
  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = parseBody(createWithdrawalSchema, req.body, next);
      if (!data) return;

      const withdrawal = await service.requestWithdrawal(data);
      res.status(201).json({ data: withdrawal });
    } catch (err) {
      next(err);
    }
  });

  // GET /withdrawals
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params = parseBody(listWithdrawalsSchema, req.query, next);
      if (!params) return;

      const { withdrawals, total } = await service.listWithdrawals(params);
      res.status(200).json({
        data: withdrawals,
        metadata: { total, limit: params.limit, offset: params.offset },
      });
    } catch (err) {
      next(err);
    }
  });

  // GET /withdrawals/pending
  router.get('/pending', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { withdrawals, total } = await service.getPendingApprovals();
      res.status(200).json({
        data: withdrawals,
        metadata: { total },
      });
    } catch (err) {
      next(err);
    }
  });

  // GET /withdrawals/:id
  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const withdrawal = await service.findById(req.params['id']!);
      res.status(200).json({ data: withdrawal });
    } catch (err) {
      next(err);
    }
  });

  // POST /withdrawals/:id/approve
  router.post('/:id/approve', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = parseBody(approveWithdrawalSchema, req.body, next);
      if (!data) return;

      const withdrawal = await service.approveWithdrawal(req.params['id']!, data.approvedBy);
      res.status(200).json({ data: withdrawal });
    } catch (err) {
      next(err);
    }
  });

  // POST /withdrawals/:id/reject
  router.post('/:id/reject', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = parseBody(rejectWithdrawalSchema, req.body, next);
      if (!data) return;

      const withdrawal = await service.rejectWithdrawal(req.params['id']!, data.rejectedBy, data.reason);
      res.status(200).json({ data: withdrawal });
    } catch (err) {
      next(err);
    }
  });

  // POST /withdrawals/:id/process
  router.post('/:id/process', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const withdrawal = await service.processWithdrawal(req.params['id']!);
      res.status(200).json({ data: withdrawal });
    } catch (err) {
      next(err);
    }
  });

  // POST /withdrawals/:id/fail
  router.post('/:id/fail', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = parseBody(failWithdrawalSchema, req.body, next);
      if (!data) return;

      const withdrawal = await service.failWithdrawal(req.params['id']!, data.reason);
      res.status(200).json({ data: withdrawal });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
