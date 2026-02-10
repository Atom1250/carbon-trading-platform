import type { Request, Response, NextFunction } from 'express';
import { requestIdMiddleware } from './requestId.js';

function makeReq(headers: Record<string, string> = {}): Request {
  return { headers } as unknown as Request;
}

function makeRes(): { headers: Record<string, string>; setHeader: jest.Mock } & Partial<Response> {
  const headers: Record<string, string> = {};
  return {
    headers,
    setHeader: jest.fn((key: string, value: string) => {
      headers[key] = value;
    }),
  };
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('requestIdMiddleware', () => {
  it('should generate a UUID v4 when no X-Request-ID header is present', () => {
    const req = makeReq();
    const res = makeRes();
    const next: NextFunction = jest.fn();

    requestIdMiddleware(req as Request, res as unknown as Response, next);

    expect(req.requestId).toMatch(UUID_REGEX);
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', req.requestId);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should use existing X-Request-ID header when present', () => {
    const existingId = 'my-trace-id-12345';
    const req = makeReq({ 'x-request-id': existingId });
    const res = makeRes();
    const next: NextFunction = jest.fn();

    requestIdMiddleware(req as Request, res as unknown as Response, next);

    expect(req.requestId).toBe(existingId);
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', existingId);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should generate a new UUID when X-Request-ID header is empty string', () => {
    const req = makeReq({ 'x-request-id': '' });
    const res = makeRes();
    const next: NextFunction = jest.fn();

    requestIdMiddleware(req as Request, res as unknown as Response, next);

    expect(req.requestId).toMatch(UUID_REGEX);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should always call next()', () => {
    const req = makeReq();
    const res = makeRes();
    const next: NextFunction = jest.fn();

    requestIdMiddleware(req as Request, res as unknown as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it('should set X-Request-ID on the response for every call', () => {
    const next: NextFunction = jest.fn();

    // Two calls should produce two different IDs
    const req1 = makeReq();
    const res1 = makeRes();
    requestIdMiddleware(req1 as Request, res1 as unknown as Response, next);

    const req2 = makeReq();
    const res2 = makeRes();
    requestIdMiddleware(req2 as Request, res2 as unknown as Response, next);

    expect(req1.requestId).not.toBe(req2.requestId);
    expect(res1.headers['X-Request-ID']).toBe(req1.requestId);
    expect(res2.headers['X-Request-ID']).toBe(req2.requestId);
  });
});
