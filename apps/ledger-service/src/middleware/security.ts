import type { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { createLogger } from '@libs/logger';

const logger = createLogger('ledger-service');

export interface SecurityOptions {
  rateLimitWindowMs?: number;
  rateLimitMax?: number;
  enableCsrfProtection?: boolean;
}

export function createSecurityRateLimiter(options: SecurityOptions = {}) {
  return rateLimit({
    windowMs: options.rateLimitWindowMs ?? 60_000,
    max: options.rateLimitMax ?? 120,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        method: req.method,
        path: req.path,
        ip: req.ip,
      });

      res.status(429).json({
        type: 'https://api.carbon-platform.com/errors/rate-limited',
        title: 'Too Many Requests',
        status: 429,
        detail: 'Request rate limit exceeded. Please retry later.',
        instance: req.path,
      });
    },
  });
}

export function createCsrfProtection(options: SecurityOptions = {}) {
  const enabled = options.enableCsrfProtection ?? true;

  return (req: Request, res: Response, next: NextFunction) => {
    if (!enabled) {
      next();
      return;
    }

    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      next();
      return;
    }

    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) {
      next();
      return;
    }

    const csrfCookie = cookieHeader
      .split(';')
      .map((chunk) => chunk.trim())
      .find((chunk) => chunk.startsWith('csrf_token='))
      ?.replace('csrf_token=', '');

    if (!csrfCookie) {
      next();
      return;
    }

    const csrfHeader = req.headers['x-csrf-token'];
    const csrfToken = Array.isArray(csrfHeader) ? csrfHeader[0] : csrfHeader;

    if (!csrfToken || csrfToken !== csrfCookie) {
      logger.warn('CSRF validation failed', {
        method: req.method,
        path: req.path,
        requestId: req.requestId,
      });

      res.status(403).json({
        type: 'https://api.carbon-platform.com/errors/forbidden',
        title: 'Forbidden',
        status: 403,
        detail: 'Invalid CSRF token',
        instance: req.path,
      });
      return;
    }

    next();
  };
}
