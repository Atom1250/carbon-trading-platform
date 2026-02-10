import type { Request, Response, NextFunction } from 'express';
import {
  ApplicationError,
  ValidationError,
  isOperationalError,
} from '@libs/errors';
import { createLogger } from '@libs/logger';
import type { ApiErrorResponse } from '@libs/common';

const logger = createLogger('api-gateway');

const ERROR_TYPE_BASE = 'https://api.carbon-platform.com/errors';

/**
 * Maps an HTTP status code to a human-readable problem type URI.
 */
function toTypeUri(statusCode: number): string {
  const slug: Record<number, string> = {
    400: 'bad-request',
    401: 'unauthorized',
    403: 'forbidden',
    404: 'not-found',
    409: 'conflict',
    422: 'validation-error',
    500: 'internal-server-error',
    503: 'service-unavailable',
  };
  return `${ERROR_TYPE_BASE}/${slug[statusCode] ?? 'error'}`;
}

/**
 * Maps an HTTP status code to a problem title.
 */
function toTitle(statusCode: number): string {
  const titles: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    422: 'Validation Error',
    500: 'Internal Server Error',
    503: 'Service Unavailable',
  };
  return titles[statusCode] ?? 'Error';
}

/**
 * Global Express error handler.
 *
 * Produces RFC 7807 Problem Details responses for all errors.
 * - Operational errors (ApplicationError subclasses) expose their message and statusCode.
 * - ValidationError also includes per-field error details.
 * - Non-operational errors (programmer errors) return a generic 500 with no details.
 *
 * SECURITY: Stack traces and internal error details are never sent to clients.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
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

  // Non-operational (programmer) error — log with full details, return generic 500
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
