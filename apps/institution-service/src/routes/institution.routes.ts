import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { ValidationError } from '@libs/errors';
import type { InstitutionService } from '../services/InstitutionService.js';

const TIERS = ['tier1', 'tier2', 'tier3', 'tier4'] as const;
const STATUSES = ['pending', 'active', 'suspended', 'closed'] as const;

const createSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  legalName: z.string().min(1, 'Legal name is required').max(255),
  registrationNumber: z.string().min(1).max(100).optional(),
  tier: z.enum(TIERS),
  countryCode: z
    .string()
    .length(2, 'Country code must be exactly 2 characters')
    .transform((s) => s.toUpperCase()),
});

const updateSchema = z
  .object({
    tier: z.enum(TIERS).optional(),
    status: z.enum(STATUSES).optional(),
  })
  .refine((d) => d.tier !== undefined || d.status !== undefined, {
    message: 'At least one of tier or status must be provided',
  });

const listQuerySchema = z.object({
  status: z.enum(STATUSES).optional(),
  tier: z.enum(TIERS).optional(),
  countryCode: z
    .string()
    .length(2)
    .transform((s) => s.toUpperCase())
    .optional(),
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

export function createInstitutionRouter(service: InstitutionService): Router {
  const router = Router();

  // POST /institutions
  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = parseBody(createSchema, req.body, next);
      if (!data) return;

      const institution = await service.create(data);
      res.status(201).json({ data: institution });
    } catch (err) {
      next(err);
    }
  });

  // GET /institutions
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = parseBody(listQuerySchema, req.query, next);
      if (!query) return;

      const result = await service.list(query);
      res.status(200).json({
        data: result.institutions,
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

  // GET /institutions/:id
  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const institution = await service.findById(req.params['id']!);
      res.status(200).json({ data: institution });
    } catch (err) {
      next(err);
    }
  });

  // PATCH /institutions/:id
  router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = parseBody(updateSchema, req.body, next);
      if (!data) return;

      const institution = await service.update(req.params['id']!, data);
      res.status(200).json({ data: institution });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
