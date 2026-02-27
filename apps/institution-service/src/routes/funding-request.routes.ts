import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { ValidationError } from '@libs/errors';
import type { ProjectService } from '../services/ProjectService.js';

const fundingStatusSchema = z.enum(['pending', 'approved', 'rejected', 'funded']);

const createFundingRequestSchema = z.object({
  projectId: z.string().uuid(),
  requesterInstitutionId: z.string().uuid(),
  requesterUserId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().length(3).optional(),
  notes: z.string().max(5000).optional(),
});

const listFundingRequestsSchema = z.object({
  projectId: z.string().uuid().optional(),
  requesterInstitutionId: z.string().uuid().optional(),
  status: fundingStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const approveFundingRequestSchema = z.object({
  approvedByUserId: z.string().uuid(),
  notes: z.string().max(5000).optional(),
});

const rejectFundingRequestSchema = z.object({
  rejectedByUserId: z.string().uuid(),
  reason: z.string().min(1).max(5000),
});

const markFundedSchema = z.object({
  notes: z.string().max(5000).optional(),
});

function parseBody<T>(schema: z.ZodType<T>, body: unknown, next: NextFunction): T | null {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    next(new ValidationError('Validation failed', parsed.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
      code: i.code,
    }))));
    return null;
  }
  return parsed.data;
}

export function createFundingRequestRouter(projectService: ProjectService): Router {
  const router = Router();

  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = parseBody(createFundingRequestSchema, req.body, next);
      if (!data) return;
      const request = await projectService.createFundingRequest(data);
      res.status(201).json({ data: request });
    } catch (err) {
      next(err);
    }
  });

  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = parseBody(listFundingRequestsSchema, req.query, next);
      if (!query) return;
      const result = await projectService.listFundingRequests(query);
      res.status(200).json({
        data: result.requests,
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

  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const request = await projectService.findFundingRequestById(req.params['id']!);
      res.status(200).json({ data: request });
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/approve', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = parseBody(approveFundingRequestSchema, req.body, next);
      if (!data) return;
      const request = await projectService.approveFundingRequest(req.params['id']!, data.approvedByUserId, data.notes);
      res.status(200).json({ data: request });
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/reject', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = parseBody(rejectFundingRequestSchema, req.body, next);
      if (!data) return;
      const request = await projectService.rejectFundingRequest(req.params['id']!, data.rejectedByUserId, data.reason);
      res.status(200).json({ data: request });
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/fund', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = parseBody(markFundedSchema, req.body, next);
      if (!data) return;
      const request = await projectService.markFundingRequestFunded(req.params['id']!, data.notes);
      res.status(200).json({ data: request });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
