import type { Request, Response, NextFunction } from 'express';
import { createAuthenticateMiddleware, requireAuth } from './authenticate';
import { AuthenticationError } from '@libs/errors';

const mockPayload = {
  userId: '550e8400-e29b-41d4-a716-446655440000',
  institutionId: '660e8400-e29b-41d4-a716-446655440001',
  role: 'investor',
  tokenId: 'tok-123',
};

function makeTokenService(verifyResult: unknown) {
  return {
    verifyAccessToken: jest.fn().mockImplementation(() => {
      if (verifyResult instanceof Error) throw verifyResult;
      return verifyResult;
    }),
    generateAccessToken: jest.fn(),
    generateRefreshToken: jest.fn(),
    verifyRefreshToken: jest.fn(),
  };
}

function makeReq(headers: Record<string, string> = {}, user?: unknown): Partial<Request> {
  return { headers, user: user as never };
}

function makeRes(): Partial<Response> {
  return {};
}

function makeNext(): NextFunction {
  return jest.fn();
}

describe('authenticate middleware', () => {
  describe('createAuthenticateMiddleware', () => {
    it('should set req.user and call next() for a valid Bearer token', () => {
      const tokenService = makeTokenService(mockPayload);
      const authenticate = createAuthenticateMiddleware(tokenService as never);

      const req = makeReq({ authorization: 'Bearer valid-token' });
      const next = makeNext();

      authenticate(req as Request, makeRes() as Response, next);

      expect(tokenService.verifyAccessToken).toHaveBeenCalledWith('valid-token');
      expect(req.user).toEqual(mockPayload);
      expect(next).toHaveBeenCalledWith(/* no args */);
      expect((next as jest.Mock).mock.calls[0]).toHaveLength(0);
    });

    it('should call next(AuthenticationError) when Authorization header is missing', () => {
      const tokenService = makeTokenService(mockPayload);
      const authenticate = createAuthenticateMiddleware(tokenService as never);

      const req = makeReq({});
      const next = makeNext();

      authenticate(req as Request, makeRes() as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });

    it('should call next(AuthenticationError) when header is not Bearer', () => {
      const tokenService = makeTokenService(mockPayload);
      const authenticate = createAuthenticateMiddleware(tokenService as never);

      const req = makeReq({ authorization: 'Basic dXNlcjpwYXNz' });
      const next = makeNext();

      authenticate(req as Request, makeRes() as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });

    it('should call next(err) when verifyAccessToken throws', () => {
      const err = new AuthenticationError('Invalid token');
      const tokenService = makeTokenService(err);
      const authenticate = createAuthenticateMiddleware(tokenService as never);

      const req = makeReq({ authorization: 'Bearer bad-token' });
      const next = makeNext();

      authenticate(req as Request, makeRes() as Response, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe('requireAuth', () => {
    it('should call next() when req.user is set', () => {
      const req = makeReq({}, mockPayload);
      const next = makeNext();

      requireAuth(req as Request, makeRes() as Response, next);

      expect((next as jest.Mock).mock.calls[0]).toHaveLength(0);
    });

    it('should call next(AuthenticationError) when req.user is undefined', () => {
      const req = makeReq({});
      const next = makeNext();

      requireAuth(req as Request, makeRes() as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });
  });
});
