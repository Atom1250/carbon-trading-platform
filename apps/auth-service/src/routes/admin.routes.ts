import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { ValidationError } from '@libs/errors';
import type { AdminUserService } from '../services/AdminUserService.js';

const listUsersQuerySchema = z.object({
  institutionId: z.string().uuid().optional(),
  isActive: z.coerce.boolean().optional(),
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

export interface AdminRouterDependencies {
  adminUserService: AdminUserService;
}

export function createAdminRouter(deps: AdminRouterDependencies): Router {
  const router = Router();
  const { adminUserService } = deps;

  router.get('/users', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = parseBody(listUsersQuerySchema, req.query, next);
      if (!query) return;

      const result = await adminUserService.listUsers({
        institutionId: query.institutionId ?? req.user?.institutionId,
        isActive: query.isActive,
        limit: query.limit,
        offset: query.offset,
      });

      res.status(200).json({
        data: result.users,
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

  router.post('/users/:id/approve', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await adminUserService.approveUser(req.params['id']!);
      res.status(200).json({ data: user });
    } catch (err) {
      next(err);
    }
  });

  router.post('/users/:id/deactivate', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await adminUserService.deactivateUser(req.params['id']!);
      res.status(200).json({ data: user });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
