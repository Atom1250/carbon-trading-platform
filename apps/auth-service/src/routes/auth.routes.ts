import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { ValidationError } from '@libs/errors';
import type { AuthService } from '../services/AuthService.js';
import type { RegistrationService } from '../services/RegistrationService.js';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const mfaVerifySchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  token: z.string().length(6, 'MFA token must be 6 digits'),
});

const registerSchema = z.object({
  institutionId: z.string().uuid('Invalid institution ID'),
  email: z.string().email('Invalid email address').max(255),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be at most 100 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  role: z.enum(['developer', 'investor', 'compliance_officer', 'operations'], {
    errorMap: () => ({ message: 'Role must be one of: developer, investor, compliance_officer, operations' }),
  }),
});

const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

function getMeta(req: Request): { ipAddress: string; userAgent: string } {
  return {
    ipAddress: (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim()
      ?? req.socket.remoteAddress
      ?? '0.0.0.0',
    userAgent: req.headers['user-agent'] ?? '',
  };
}

export function createAuthRouter(authService: AuthService, registrationService: RegistrationService): Router {
  const router = Router();

  router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        const errors = parsed.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
          code: i.code,
        }));
        next(new ValidationError('Validation failed', errors));
        return;
      }

      const result = await authService.login(
        parsed.data.email,
        parsed.data.password,
        getMeta(req),
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = refreshSchema.safeParse(req.body);
      if (!parsed.success) {
        next(new ValidationError('Validation failed', [{ field: 'refreshToken', message: 'Refresh token is required', code: 'invalid_type' }]));
        return;
      }

      const result = await authService.refresh(parsed.data.refreshToken, getMeta(req));
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers['authorization'];
      const parsed = refreshSchema.safeParse(req.body);

      // Accept refresh token from body or Bearer header
      const rawToken = parsed.success
        ? parsed.data.refreshToken
        : authHeader?.startsWith('Bearer ')
          ? authHeader.slice(7)
          : null;

      if (!rawToken) {
        next(new ValidationError('Validation failed', [{ field: 'refreshToken', message: 'Refresh token is required', code: 'invalid_type' }]));
        return;
      }

      await authService.logout(rawToken);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  router.post('/mfa/verify', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = mfaVerifySchema.safeParse(req.body);
      if (!parsed.success) {
        const errors = parsed.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
          code: i.code,
        }));
        next(new ValidationError('Validation failed', errors));
        return;
      }

      const result = await authService.verifyMFA(
        parsed.data.userId,
        parsed.data.token,
        getMeta(req),
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        const errors = parsed.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
          code: i.code,
        }));
        next(new ValidationError('Validation failed', errors));
        return;
      }

      const result = await registrationService.register(parsed.data);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  });

  router.post('/verify-email', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = verifyEmailSchema.safeParse(req.body);
      if (!parsed.success) {
        const errors = parsed.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
          code: i.code,
        }));
        next(new ValidationError('Validation failed', errors));
        return;
      }

      const result = await registrationService.verifyEmail(parsed.data.token);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
