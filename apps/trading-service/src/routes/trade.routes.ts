import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { ValidationError } from '@libs/errors';
import type { SettlementService } from '../services/SettlementService.js';
import type { FeeCalculationService } from '../services/FeeCalculationService.js';

const TRADE_STATUSES = ['pending_settlement', 'settled', 'failed'] as const;

const listTradesQuerySchema = z.object({
  status: z.enum(TRADE_STATUSES).optional(),
  assetId: z.string().uuid().optional(),
  institutionId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const feeReportQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
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

export interface TradeRouterDependencies {
  settlementService: SettlementService;
}

export interface FeeRouterDependencies {
  feeCalculationService: FeeCalculationService;
}

export function createTradeRouter(deps: TradeRouterDependencies): Router {
  const { settlementService: service } = deps;
  const router = Router();

  // GET /trades
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = parseBody(listTradesQuerySchema, req.query, next);
      if (!query) return;

      const result = await service.listTrades(query);
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

  // GET /trades/:id
  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const trade = await service.findById(req.params['id']!);
      res.status(200).json({ data: trade });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export function createFeeRouter(deps: FeeRouterDependencies): Router {
  const { feeCalculationService: service } = deps;
  const router = Router();

  // GET /fees/report
  router.get('/report', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = parseBody(feeReportQuerySchema, req.query, next);
      if (!query) return;

      const report = await service.getFeeReport(query);
      res.status(200).json({ data: report });
    } catch (err) {
      next(err);
    }
  });

  // GET /fees/institution/:institutionId
  router.get('/institution/:institutionId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const fees = await service.getFeesByInstitution(req.params['institutionId']!);
      res.status(200).json({ data: fees });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
