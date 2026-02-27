import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { ValidationError } from '@libs/errors';
import type { WalletTokenService } from '../services/WalletTokenService.js';

const listPositionsQuerySchema = z.object({
  institutionId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  assetId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const listSettlementsQuerySchema = z.object({
  institutionId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  tradeId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

function parseBody<T>(schema: z.ZodType<T>, body: unknown, next: NextFunction): T | null {
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

export function createWalletRouter(walletTokenService: WalletTokenService): Router {
  const router = Router();

  router.get('/positions', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = parseBody(listPositionsQuerySchema, req.query, next);
      if (!query) return;
      const result = await walletTokenService.listTokenPositions(query);
      res.status(200).json({
        data: result.positions,
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

  router.get('/dvp-settlements', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = parseBody(listSettlementsQuerySchema, req.query, next);
      if (!query) return;
      const result = await walletTokenService.listDvpSettlements(query);
      res.status(200).json({
        data: result.settlements,
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
