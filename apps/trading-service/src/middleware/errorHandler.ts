import type { Request, Response, NextFunction } from 'express';
import {
  ApplicationError,
  ValidationError,
  isOperationalError,
} from '@libs/errors';
import { createLogger } from '@libs/logger';
import type { ApiErrorResponse } from '@libs/common';

const logger = createLogger('trading-service');

const ERROR_TYPE_BASE = 'https://api.carbon-platform.com/errors';

function toTypeUri(statusCode: number): string {
  const slug: Record<number, string> = {
    400: 'bad-request',
    401: 'unauthorized',
    403: 'forbidden',
    404: 'not-found',
    409: 'conflict',
    422: 'validation-error',
    429: 'rate-limited',
    500: 'internal-server-error',
    503: 'service-unavailable',
  };
  return `${ERROR_TYPE_BASE}/${slug[statusCode] ?? 'error'}`;
}

function toTitle(statusCode: number): string {
  const titles: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    422: 'Validation Error',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    503: 'Service Unavailable',
  };
  return titles[statusCode] ?? 'Error';
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  void next;
  const requestId = req.requestId ?? 'unknown';
  const instance = req.path;

  if (isOperationalError(err)) {
    const appErr = err as ApplicationError;
    const statusCode = appErr.statusCode;

    logger.warn('Operational error', {
      statusCode,
      message: appErr.message,
      requestId,
      name: appErr.name,
    });

    const body: ApiErrorResponse = {
      type: toTypeUri(statusCode),
      title: toTitle(statusCode),
      status: statusCode,
      detail: appErr.message,
      instance,
    };

    if (appErr instanceof ValidationError && appErr.validationErrors.length > 0) {
      body.errors = appErr.validationErrors;
    }

    res.status(statusCode).json(body);
    return;
  }

  logger.error('Unhandled error', {
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
    requestId,
  });

  const body: ApiErrorResponse = {
    type: toTypeUri(500),
    title: 'Internal Server Error',
    status: 500,
    detail: 'An unexpected error occurred',
    instance,
  };

  res.status(500).json(body);
}
