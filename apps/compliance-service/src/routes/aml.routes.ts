import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { ValidationError } from '@libs/errors';
import type { AMLMonitoringService } from '../services/AMLMonitoringService.js';

const ALERT_TYPES = ['structuring', 'layering', 'rapid_trading', 'large_volume', 'round_amounts', 'velocity_anomaly'] as const;
const ALERT_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
const ALERT_STATUSES = ['open', 'under_investigation', 'escalated', 'resolved_suspicious', 'resolved_legitimate'] as const;
const RESOLVE_STATUSES = ['resolved_suspicious', 'resolved_legitimate'] as const;

const checkTransactionSchema = z.object({
  transactionId: z.string().uuid('Transaction ID must be a valid UUID'),
  institutionId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  amountUsd: z.number().positive('Amount must be positive'),
  transactionType: z.string().min(1, 'Transaction type is required').max(50),
  counterpartyId: z.string().uuid().optional(),
});

const listAlertsQuerySchema = z.object({
  status: z.enum(ALERT_STATUSES).optional(),
  severity: z.enum(ALERT_SEVERITIES).optional(),
  alertType: z.enum(ALERT_TYPES).optional(),
  institutionId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const investigateAlertSchema = z.object({
  assignedTo: z.string().uuid('Assigned to must be a valid UUID'),
  notes: z.string().min(1, 'Notes are required').max(5000),
});

const resolveAlertSchema = z.object({
  status: z.enum(RESOLVE_STATUSES),
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

export interface AMLRouterDependencies {
  amlMonitoringService: AMLMonitoringService;
}

export function createAMLRouter(deps: AMLRouterDependencies): Router {
  const { amlMonitoringService: service } = deps;
  const router = Router();

  // POST /aml/check-transaction
  router.post('/check-transaction', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = parseBody(checkTransactionSchema, req.body, next);
      if (!data) return;

      const check = await service.checkTransaction(data);
      res.status(200).json({ data: check });
    } catch (err) {
      next(err);
    }
  });

  // GET /aml/alerts
  router.get('/alerts', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = parseBody(listAlertsQuerySchema, req.query, next);
      if (!query) return;

      const result = await service.listAlerts(query);
      res.status(200).json({
        data: result.alerts,
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

  // POST /aml/alerts/:id/investigate
  router.post('/alerts/:id/investigate', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = parseBody(investigateAlertSchema, req.body, next);
      if (!data) return;

      const alert = await service.investigateAlert(req.params['id']!, data);
      res.status(200).json({ data: alert });
    } catch (err) {
      next(err);
    }
  });

  // POST /aml/alerts/:id/resolve
  router.post('/alerts/:id/resolve', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = parseBody(resolveAlertSchema, req.body, next);
      if (!data) return;

      const alert = await service.resolveAlert(req.params['id']!, data);
      res.status(200).json({ data: alert });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
