import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { ValidationError } from '@libs/errors';
import type { BankReconciliationService } from '../services/BankReconciliationService.js';

const RECON_STATUSES = ['pending', 'in_progress', 'completed', 'failed'] as const;

const importStatementSchema = z.object({
  institutionId: z.string().uuid(),
  bankName: z.string().min(1).max(255),
  accountNumber: z.string().min(1).max(50),
  statementDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  openingBalance: z.number(),
  closingBalance: z.number(),
  importedBy: z.string().uuid(),
  fileName: z.string().max(255).optional(),
  csvContent: z.string().min(1),
});

const runReconciliationSchema = z.object({
  runBy: z.string().uuid().optional(),
});

const disputeEntrySchema = z.object({
  reason: z.string().min(1).max(500),
});

const listRunsSchema = z.object({
  institutionId: z.string().uuid().optional(),
  status: z.enum(RECON_STATUSES).optional(),
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

export interface BankReconciliationRouterDependencies {
  bankReconciliationService: BankReconciliationService;
}

export function createBankReconciliationRouter(deps: BankReconciliationRouterDependencies): Router {
  const { bankReconciliationService: service } = deps;
  const router = Router();

  // POST /bank-reconciliation/statements — Import bank statement with CSV
  router.post('/statements', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = parseBody(importStatementSchema, req.body, next);
      if (!data) return;

      const { csvContent, ...dto } = data;
      const result = await service.importStatement(dto, csvContent);
      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  });

  // GET /bank-reconciliation/statements/:id — Get statement details
  router.get('/statements/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const statement = await service.getStatementById(req.params['id']!);
      res.status(200).json({ data: statement });
    } catch (err) {
      next(err);
    }
  });

  // GET /bank-reconciliation/statements/:id/entries — Get entries for a statement
  router.get('/statements/:id/entries', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const matchStatus = req.query['matchStatus'] as string | undefined;
      const entries = await service.getEntriesByStatement(req.params['id']!, matchStatus);
      res.status(200).json({ data: entries, metadata: { total: entries.length } });
    } catch (err) {
      next(err);
    }
  });

  // POST /bank-reconciliation/statements/:id/reconcile — Run reconciliation
  router.post('/statements/:id/reconcile', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = parseBody(runReconciliationSchema, req.body, next);
      if (!data) return;

      const run = await service.runReconciliation(req.params['id']!, data.runBy);
      res.status(200).json({ data: run });
    } catch (err) {
      next(err);
    }
  });

  // GET /bank-reconciliation/runs — List reconciliation runs
  router.get('/runs', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params = parseBody(listRunsSchema, req.query, next);
      if (!params) return;

      const { runs, total } = await service.listRuns(params);
      res.status(200).json({
        data: runs,
        metadata: { total, limit: params.limit, offset: params.offset },
      });
    } catch (err) {
      next(err);
    }
  });

  // GET /bank-reconciliation/runs/:id — Get run details
  router.get('/runs/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const run = await service.getRunById(req.params['id']!);
      res.status(200).json({ data: run });
    } catch (err) {
      next(err);
    }
  });

  // GET /bank-reconciliation/runs/:id/report — Get reconciliation report
  router.get('/runs/:id/report', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const report = await service.getReconciliationReport(req.params['id']!);
      res.status(200).json({ data: report });
    } catch (err) {
      next(err);
    }
  });

  // POST /bank-reconciliation/entries/:id/dispute — Dispute an entry
  router.post('/entries/:id/dispute', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = parseBody(disputeEntrySchema, req.body, next);
      if (!data) return;

      const entry = await service.disputeEntry(req.params['id']!, data.reason);
      res.status(200).json({ data: entry });
    } catch (err) {
      next(err);
    }
  });

  // POST /bank-reconciliation/entries/:id/resolve — Resolve a disputed entry
  router.post('/entries/:id/resolve', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const entry = await service.resolveEntry(req.params['id']!);
      res.status(200).json({ data: entry });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
