import { v4 as uuidv4 } from 'uuid';
import type { Request, Response, NextFunction } from 'express';

/**
 * Assigns a unique request ID to each incoming request.
 *
 * - Honours an existing `X-Request-ID` header if present (allows clients
 *   and upstream proxies to propagate correlation IDs).
 * - Generates a UUID v4 if no header is provided.
 * - Attaches the ID to `req.requestId` and reflects it in the response
 *   via the `X-Request-ID` header.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers['x-request-id'];
  const requestId = typeof incoming === 'string' && incoming.length > 0 ? incoming : uuidv4();
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
}
