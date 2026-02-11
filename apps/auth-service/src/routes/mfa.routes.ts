import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { ValidationError } from '@libs/errors';
import { createAuthenticateMiddleware } from '../middleware/authenticate.js';
import type { MFAService } from '../services/MFAService.js';
import type { TokenService } from '../services/TokenService.js';

const enableSchema = z.object({
  token: z.string().length(6, 'MFA token must be 6 digits'),
});

export function createMFARouter(mfaService: MFAService, tokenService: TokenService): Router {
  const router = Router();
  const authenticate = createAuthenticateMiddleware(tokenService);

  router.post('/setup', authenticate, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const result = await mfaService.setup(userId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  router.post('/enable', authenticate, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = enableSchema.safeParse(req.body);
      if (!parsed.success) {
        next(new ValidationError('Validation failed', [{ field: 'token', message: 'MFA token must be 6 digits', code: 'invalid_type' }]));
        return;
      }

      const userId = req.user!.userId;
      await mfaService.enable(userId, parsed.data.token);
      res.status(200).json({ message: 'MFA enabled successfully' });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
