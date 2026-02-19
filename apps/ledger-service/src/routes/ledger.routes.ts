import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { ValidationError } from '@libs/errors';
import type { LedgerService } from '../services/LedgerService.js';

const ACCOUNT_CATEGORIES = ['asset', 'liability', 'revenue', 'expense'] as const;
const ENTRY_STATUSES = ['pending', 'posted', 'reversed'] as const;

const createAccountSchema = z.object({
  code: z.string().min(1, 'Code is required').max(20),
  name: z.string().min(1, 'Name is required').max(200),
  category: z.enum(ACCOUNT_CATEGORIES),
  description: z.string().max(5000).optional(),
  parentAccountId: z.string().uuid('Parent account ID must be a valid UUID').optional(),
});

const listAccountsQuerySchema = z.object({
  category: z.enum(ACCOUNT_CATEGORIES).optional(),
  isActive: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const createJournalEntrySchema = z.object({
  referenceType: z.string().min(1, 'Reference type is required').max(50),
  referenceId: z.string().uuid('Reference ID must be a valid UUID'),
  description: z.string().min(1, 'Description is required').max(5000),
  createdBy: z.string().uuid('Created by must be a valid UUID'),
  lines: z.array(z.object({
    accountId: z.string().uuid('Account ID must be a valid UUID'),
    debitAmount: z.number().min(0, 'Debit amount must be non-negative'),
    creditAmount: z.number().min(0, 'Credit amount must be non-negative'),
    description: z.string().max(5000).optional(),
  })).min(2, 'At least 2 lines are required'),
});

const listEntriesQuerySchema = z.object({
  referenceType: z.string().optional(),
  referenceId: z.string().uuid().optional(),
  status: z.enum(ENTRY_STATUSES).optional(),
  accountId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const reverseEntrySchema = z.object({
  reversedBy: z.string().uuid('Reversed by must be a valid UUID'),
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

export interface AccountRouterDependencies {
  ledgerService: LedgerService;
}

export interface EntryRouterDependencies {
  ledgerService: LedgerService;
}

export function createAccountRouter(deps: AccountRouterDependencies): Router {
  const { ledgerService: service } = deps;
  const router = Router();

  // POST /accounts
  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = parseBody(createAccountSchema, req.body, next);
      if (!data) return;

      const account = await service.createAccount(data);
      res.status(201).json({ data: account });
    } catch (err) {
      next(err);
    }
  });

  // GET /accounts
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = parseBody(listAccountsQuerySchema, req.query, next);
      if (!query) return;

      const result = await service.listAccounts(query);
      res.status(200).json({
        data: result.accounts,
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

  // GET /accounts/:id
  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const account = await service.getAccountById(req.params['id']!);
      res.status(200).json({ data: account });
    } catch (err) {
      next(err);
    }
  });

  // GET /accounts/:id/balance
  router.get('/:id/balance', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const balance = await service.getAccountBalance(req.params['id']!);
      res.status(200).json({ data: balance });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export function createEntryRouter(deps: EntryRouterDependencies): Router {
  const { ledgerService: service } = deps;
  const router = Router();

  // POST /entries
  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = parseBody(createJournalEntrySchema, req.body, next);
      if (!data) return;

      const entry = await service.createJournalEntry(data);
      res.status(201).json({ data: entry });
    } catch (err) {
      next(err);
    }
  });

  // GET /entries
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = parseBody(listEntriesQuerySchema, req.query, next);
      if (!query) return;

      const result = await service.listJournalEntries(query);
      res.status(200).json({
        data: result.entries,
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

  // GET /entries/:id
  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const entry = await service.getJournalEntryById(req.params['id']!);
      res.status(200).json({ data: entry });
    } catch (err) {
      next(err);
    }
  });

  // POST /entries/:id/reverse
  router.post('/:id/reverse', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = parseBody(reverseEntrySchema, req.body, next);
      if (!data) return;

      const reversal = await service.reverseJournalEntry(req.params['id']!, data.reversedBy);
      res.status(201).json({ data: reversal });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export function createTrialBalanceRouter(deps: EntryRouterDependencies): Router {
  const { ledgerService: service } = deps;
  const router = Router();

  // GET /trial-balance
  router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const trialBalance = await service.getTrialBalance();
      res.status(200).json({ data: trialBalance });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
