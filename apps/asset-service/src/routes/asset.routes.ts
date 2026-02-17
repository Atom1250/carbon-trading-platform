import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { ValidationError } from '@libs/errors';
import type { AssetService } from '../services/AssetService.js';
import type { VerificationService } from '../services/VerificationService.js';
import type { MintingService } from '../services/MintingService.js';
import type { RetirementService } from '../services/RetirementService.js';

const ASSET_TYPES = ['carbon_credit', 'loan_portion'] as const;
const ASSET_STATUSES = ['draft', 'pending_verification', 'verified', 'minted', 'suspended'] as const;

const createSchema = z.object({
  institutionId: z.string().uuid('Institution ID must be a valid UUID'),
  assetType: z.enum(ASSET_TYPES),
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(5000).optional(),
  vintage: z.number().int().min(1900).max(2100).optional(),
  standard: z.string().max(100).optional(),
  geography: z.string().max(100).optional(),
  totalSupply: z.number().positive('Total supply must be positive'),
});

const updateSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(5000).optional(),
    status: z.enum(ASSET_STATUSES).optional(),
    vintage: z.number().int().min(1900).max(2100).optional(),
    standard: z.string().max(100).optional(),
    geography: z.string().max(100).optional(),
    metadataUri: z.string().max(500).optional(),
  })
  .refine(
    (d) =>
      d.name !== undefined ||
      d.description !== undefined ||
      d.status !== undefined ||
      d.vintage !== undefined ||
      d.standard !== undefined ||
      d.geography !== undefined ||
      d.metadataUri !== undefined,
    { message: 'At least one field must be provided' },
  );

const approveSchema = z.object({
  verifiedBy: z.string().uuid('Verified by must be a valid UUID'),
  notes: z.string().max(5000).optional(),
});

const rejectSchema = z.object({
  verifiedBy: z.string().uuid('Verified by must be a valid UUID'),
  notes: z.string().min(1, 'Notes are required for rejection').max(5000),
});

const SORT_BY_VALUES = ['created_at', 'total_supply', 'name'] as const;
const SORT_ORDER_VALUES = ['asc', 'desc'] as const;

const listQuerySchema = z.object({
  assetType: z.enum(ASSET_TYPES).optional(),
  status: z.enum(ASSET_STATUSES).optional(),
  institutionId: z.string().uuid().optional(),
  vintage: z.coerce.number().int().min(1900).max(2100).optional(),
  geography: z.string().max(100).optional(),
  standard: z.string().max(100).optional(),
  minSupply: z.coerce.number().min(0).optional(),
  maxSupply: z.coerce.number().min(0).optional(),
  search: z.string().max(255).optional(),
  sortBy: z.enum(SORT_BY_VALUES).optional(),
  sortOrder: z.enum(SORT_ORDER_VALUES).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const mintSchema = z.object({
  recipientAddress: z.string().min(1, 'Recipient address is required'),
});

const retireSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  userId: z.string().uuid('User ID must be a valid UUID'),
  reason: z.string().min(1, 'Reason is required').max(5000),
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

export interface AssetRouterDependencies {
  assetService: AssetService;
  verificationService: VerificationService;
  mintingService: MintingService;
  retirementService: RetirementService;
}

export function createAssetRouter(deps: AssetRouterDependencies): Router {
  const { assetService: service, verificationService, mintingService, retirementService } = deps;
  const router = Router();

  // POST /assets
  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = parseBody(createSchema, req.body, next);
      if (!data) return;

      const asset = await service.create(data);
      res.status(201).json({ data: asset });
    } catch (err) {
      next(err);
    }
  });

  // GET /assets
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = parseBody(listQuerySchema, req.query, next);
      if (!query) return;

      const result = await service.list(query);
      res.status(200).json({
        data: result.assets,
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

  // GET /assets/analytics
  router.get('/analytics', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const [analytics, geographyBreakdown] = await Promise.all([
        service.getAnalytics(),
        service.getGeographyBreakdown(),
      ]);
      res.status(200).json({ data: { analytics, geographyBreakdown } });
    } catch (err) {
      next(err);
    }
  });

  // GET /assets/:id
  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const asset = await service.findById(req.params['id']!);
      res.status(200).json({ data: asset });
    } catch (err) {
      next(err);
    }
  });

  // PATCH /assets/:id
  router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = parseBody(updateSchema, req.body, next);
      if (!data) return;

      const asset = await service.update(req.params['id']!, data);
      res.status(200).json({ data: asset });
    } catch (err) {
      next(err);
    }
  });

  // POST /assets/:id/submit-verification
  router.post('/:id/submit-verification', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const asset = await verificationService.submitForVerification(req.params['id']!);
      res.status(200).json({ data: asset });
    } catch (err) {
      next(err);
    }
  });

  // POST /assets/:id/approve
  router.post('/:id/approve', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = parseBody(approveSchema, req.body, next);
      if (!data) return;

      const asset = await verificationService.approve(req.params['id']!, data.verifiedBy, data.notes);
      res.status(200).json({ data: asset });
    } catch (err) {
      next(err);
    }
  });

  // POST /assets/:id/reject
  router.post('/:id/reject', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = parseBody(rejectSchema, req.body, next);
      if (!data) return;

      const asset = await verificationService.reject(req.params['id']!, data.verifiedBy, data.notes);
      res.status(200).json({ data: asset });
    } catch (err) {
      next(err);
    }
  });

  // GET /assets/:id/verifications
  router.get('/:id/verifications', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const records = await verificationService.getHistory(req.params['id']!);
      res.status(200).json({ data: records });
    } catch (err) {
      next(err);
    }
  });

  // POST /assets/:id/mint
  router.post('/:id/mint', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = parseBody(mintSchema, req.body, next);
      if (!data) return;

      const result = await mintingService.mintAssetTokens(req.params['id']!, data.recipientAddress);
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  });

  // POST /assets/:id/retire
  router.post('/:id/retire', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = parseBody(retireSchema, req.body, next);
      if (!data) return;

      const result = await retirementService.retire(req.params['id']!, data.amount, data.userId, data.reason);
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  });

  // GET /assets/:id/retirements
  router.get('/:id/retirements', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const records = await retirementService.getHistory(req.params['id']!);
      res.status(200).json({ data: records });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
