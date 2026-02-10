import type { Request, Response, NextFunction } from 'express';
import { loggingMiddleware } from './logging.js';

jest.mock('@libs/logger', () => {
  const instance = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
  return { createLogger: jest.fn(() => instance), __instance: instance };
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockLogger = (jest.requireMock('@libs/logger') as any).__instance as {
  info: jest.Mock; warn: jest.Mock; error: jest.Mock; debug: jest.Mock;
};

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    method: 'GET',
    url: '/test',
    requestId: 'req-123',
    ...overrides,
  } as unknown as Request;
}

function makeRes(statusCode = 200): {
  statusCode: number;
  on: jest.Mock;
  emit: (event: string) => void;
} {
  const listeners: Record<string, () => void> = {};
  return {
    statusCode,
    on: jest.fn((event: string, cb: () => void) => {
      listeners[event] = cb;
    }),
    emit: (event: string) => listeners[event]?.(),
  };
}

describe('loggingMiddleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call next() immediately', () => {
    const req = makeReq();
    const res = makeRes();
    const next: NextFunction = jest.fn();

    loggingMiddleware(req, res as unknown as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    // No logging before response finishes
    expect(mockLogger.info).not.toHaveBeenCalled();
  });

  it('should log info for 2xx responses', () => {
    const req = makeReq({ method: 'GET', url: '/health', requestId: 'abc' });
    const res = makeRes(200);
    const next: NextFunction = jest.fn();

    loggingMiddleware(req, res as unknown as Response, next);
    res.emit('finish');

    expect(mockLogger.info).toHaveBeenCalledWith(
      'HTTP request',
      expect.objectContaining({
        method: 'GET',
        url: '/health',
        statusCode: 200,
        requestId: 'abc',
      }),
    );
  });

  it('should log warn for 4xx responses', () => {
    const req = makeReq({ method: 'GET', url: '/missing' });
    const res = makeRes(404);
    const next: NextFunction = jest.fn();

    loggingMiddleware(req, res as unknown as Response, next);
    res.emit('finish');

    expect(mockLogger.warn).toHaveBeenCalledWith(
      'HTTP request',
      expect.objectContaining({ statusCode: 404 }),
    );
  });

  it('should log error for 5xx responses', () => {
    const req = makeReq({ method: 'POST', url: '/crash' });
    const res = makeRes(500);
    const next: NextFunction = jest.fn();

    loggingMiddleware(req, res as unknown as Response, next);
    res.emit('finish');

    expect(mockLogger.error).toHaveBeenCalledWith(
      'HTTP request',
      expect.objectContaining({ statusCode: 500 }),
    );
  });

  it('should include durationMs in log entry', () => {
    const req = makeReq();
    const res = makeRes(201);
    const next: NextFunction = jest.fn();

    loggingMiddleware(req, res as unknown as Response, next);
    res.emit('finish');

    const call = mockLogger.info.mock.calls[0];
    expect(call[1].durationMs).toBeGreaterThanOrEqual(0);
    expect(typeof call[1].durationMs).toBe('number');
  });

  it('should not log before the response finishes', () => {
    const req = makeReq();
    const res = makeRes(200);
    const next: NextFunction = jest.fn();

    loggingMiddleware(req, res as unknown as Response, next);

    expect(mockLogger.info).not.toHaveBeenCalled();
    expect(mockLogger.warn).not.toHaveBeenCalled();
    expect(mockLogger.error).not.toHaveBeenCalled();
  });
});
