import type { Request, Response, NextFunction } from 'express';
import { AuthenticationError } from '@libs/errors';
import type { TokenService } from '../services/TokenService.js';

/**
 * Factory that returns an Express middleware which verifies the JWT access
 * token and attaches the decoded payload to `req.user`.
 */
export function createAuthenticateMiddleware(tokenService: TokenService) {
  return function authenticate(req: Request, _res: Response, next: NextFunction): void {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next(new AuthenticationError('Missing or malformed Authorization header'));
      return;
    }

    const token = authHeader.slice(7);

    try {
      req.user = tokenService.verifyAccessToken(token);
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Middleware that asserts `req.user` is present (i.e. authenticate ran first).
 * Use after createAuthenticateMiddleware in the middleware chain.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new AuthenticationError());
    return;
  }
  next();
}
