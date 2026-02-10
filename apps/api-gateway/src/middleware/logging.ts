import type { Request, Response, NextFunction } from 'express';
import { createLogger } from '@libs/logger';

const logger = createLogger('api-gateway');

/**
 * HTTP access logger middleware.
 *
 * Logs structured JSON for each completed request:
 *   { method, url, statusCode, durationMs, requestId }
 *
 * Logging happens on the `finish` event so the status code is always correct.
 */
export function loggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    logger[level]('HTTP request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      durationMs,
      requestId: req.requestId,
    });
  });

  next();
}
