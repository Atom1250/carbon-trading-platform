import type { Request, Response, NextFunction } from 'express';
import { errorHandler } from './errorHandler.js';
import {
  ApplicationError,
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  DatabaseError,
  NotFoundError,
  ServiceUnavailableError,
  ValidationError,
} from '@libs/errors';
jest.mock('@libs/logger', () => {
  const instance = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
  return { createLogger: jest.fn(() => instance), __instance: instance };
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockLogger = (jest.requireMock('@libs/logger') as any).__instance as {
  info: jest.Mock; warn: jest.Mock; error: jest.Mock; debug: jest.Mock;
};

function makeReq(path = '/api/v1/test'): Request {
  return { path, requestId: 'req-abc' } as unknown as Request;
}

function makeRes(): { statusCode: number; status: jest.Mock; json: jest.Mock; body: unknown } {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status: jest.fn(),
    json: jest.fn(),
  };
  res.status.mockReturnValue(res);
  res.json.mockImplementation((b: unknown) => {
    res.body = b;
    return res;
  });
  return res;
}

const next: NextFunction = jest.fn();

describe('errorHandler', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('operational errors (ApplicationError subclasses)', () => {
    it('should return 404 for NotFoundError with RFC 7807 body', () => {
      const err = new NotFoundError('User', 'abc-123');
      const req = makeReq('/api/v1/users/abc-123');
      const res = makeRes();

      errorHandler(err, req, res as unknown as Response, next);

      expect(res.status).toHaveBeenCalledWith(404);
      const body = res.body as Record<string, unknown>;
      expect(body.status).toBe(404);
      expect(body.title).toBe('Not Found');
      expect(body.instance).toBe('/api/v1/users/abc-123');
      expect(typeof body.type).toBe('string');
      expect((body.type as string).startsWith('https://')).toBe(true);
    });

    it('should return 401 for AuthenticationError', () => {
      const err = new AuthenticationError('Token expired');
      const res = makeRes();
      errorHandler(err, makeReq(), res as unknown as Response, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect((res.body as Record<string, unknown>).title).toBe('Unauthorized');
    });

    it('should return 403 for AuthorizationError', () => {
      const err = new AuthorizationError();
      const res = makeRes();
      errorHandler(err, makeReq(), res as unknown as Response, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 409 for ConflictError', () => {
      const err = new ConflictError('Email already exists');
      const res = makeRes();
      errorHandler(err, makeReq(), res as unknown as Response, next);
      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('should return 503 for ServiceUnavailableError', () => {
      const err = new ServiceUnavailableError('redis');
      const res = makeRes();
      errorHandler(err, makeReq(), res as unknown as Response, next);
      expect(res.status).toHaveBeenCalledWith(503);
    });

    it('should return 500 for DatabaseError', () => {
      const err = new DatabaseError('Query failed');
      const res = makeRes();
      errorHandler(err, makeReq(), res as unknown as Response, next);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('should include field errors for ValidationError', () => {
      const fieldErrors = [{ field: 'email', message: 'Invalid', code: 'INVALID' }];
      const err = new ValidationError('Validation failed', fieldErrors);
      const res = makeRes();
      errorHandler(err, makeReq(), res as unknown as Response, next);

      expect(res.status).toHaveBeenCalledWith(422);
      const body = res.body as Record<string, unknown>;
      expect(body.errors).toEqual(fieldErrors);
    });

    it('should not include errors field when ValidationError has no field errors', () => {
      const err = new ValidationError('Invalid input');
      const res = makeRes();
      errorHandler(err, makeReq(), res as unknown as Response, next);

      const body = res.body as Record<string, unknown>;
      expect(body.errors).toBeUndefined();
    });

    it('should log warn for operational errors (not error)', () => {
      const err = new NotFoundError('Item');
      errorHandler(err, makeReq(), makeRes() as unknown as Response, next);
      expect(mockLogger.warn).toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should use "unknown" as requestId when req.requestId is missing', () => {
      const err = new ApplicationError('Test', { statusCode: 400 });
      const req = { path: '/test' } as unknown as Request;
      const res = makeRes();
      errorHandler(err, req, res as unknown as Response, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('non-operational errors (programmer errors)', () => {
    it('should return 500 with generic message for plain Error', () => {
      const err = new Error('Something exploded');
      const res = makeRes();
      errorHandler(err, makeReq(), res as unknown as Response, next);

      expect(res.status).toHaveBeenCalledWith(500);
      const body = res.body as Record<string, unknown>;
      expect(body.status).toBe(500);
      expect(body.detail).toBe('An unexpected error occurred');
      // Must NOT expose internal error message to client
      expect(body.detail).not.toContain('Something exploded');
    });

    it('should return 500 for null/undefined errors', () => {
      const res = makeRes();
      errorHandler(null, makeReq(), res as unknown as Response, next);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('should return 500 for string errors', () => {
      const res = makeRes();
      errorHandler('boom', makeReq(), res as unknown as Response, next);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('should log error level for non-operational errors', () => {
      const err = new Error('Programmer error');
      // Make it non-operational
      errorHandler(err, makeReq(), makeRes() as unknown as Response, next);
      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('should never expose stack trace in response', () => {
      const err = new Error('with\nstack\ntrace');
      err.stack = 'Error: with\n  at doSomething (file.ts:10:5)';
      const res = makeRes();
      errorHandler(err, makeReq(), res as unknown as Response, next);

      const body = JSON.stringify(res.body);
      expect(body).not.toContain('at doSomething');
      expect(body).not.toContain('file.ts');
    });
  });
});
