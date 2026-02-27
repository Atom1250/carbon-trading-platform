import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { ValidationError } from '@libs/errors';
import type { ProjectService } from '../services/ProjectService.js';

const projectStatusSchema = z.enum(['draft', 'open', 'funding_approved', 'funded', 'closed']);

const createProjectSchema = z.object({
  institutionId: z.string().uuid(),
  ownerUserId: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  publicDetails: z.record(z.string(), z.unknown()).optional(),
  dataroomDetails: z.record(z.string(), z.unknown()).optional(),
  targetAmount: z.number().positive(),
  currency: z.string().length(3).optional(),
});

const updateProjectSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(5000).optional(),
    publicDetails: z.record(z.string(), z.unknown()).optional(),
    dataroomDetails: z.record(z.string(), z.unknown()).optional(),
    targetAmount: z.number().positive().optional(),
    currency: z.string().length(3).optional(),
    status: projectStatusSchema.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field is required' });

const listProjectsSchema = z.object({
  institutionId: z.string().uuid().optional(),
  status: projectStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const addDataroomItemSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  fileUrl: z.string().url(),
  visibility: z.enum(['public', 'private']).optional(),
  createdByUserId: z.string().uuid(),
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

export function createProjectRouter(projectService: ProjectService): Router {
  const router = Router();

  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = parseBody(createProjectSchema, req.body, next);
      if (!data) return;
      const project = await projectService.createProject(data);
      res.status(201).json({ data: project });
    } catch (err) {
      next(err);
    }
  });

  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = parseBody(listProjectsSchema, req.query, next);
      if (!query) return;
      const result = await projectService.listProjects(query);
      res.status(200).json({
        data: result.projects,
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
      const project = await projectService.findProjectById(req.params['id']!);
      res.status(200).json({ data: project });
    } catch (err) {
      next(err);
    }
  });

  router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = parseBody(updateProjectSchema, req.body, next);
      if (!data) return;
      const project = await projectService.updateProject(req.params['id']!, data);
      res.status(200).json({ data: project });
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/dataroom', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = parseBody(addDataroomItemSchema, req.body, next);
      if (!data) return;
      const item = await projectService.addDataroomItem(req.params['id']!, data);
      res.status(201).json({ data: item });
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id/dataroom', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const items = await projectService.listDataroomItems(req.params['id']!);
      res.status(200).json({ data: items });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
