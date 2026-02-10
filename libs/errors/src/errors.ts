/**
 * Base application error class.
 * All domain errors extend this class.
 */
export class ApplicationError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    options: { statusCode?: number; cause?: unknown; isOperational?: boolean } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = this.constructor.name;
    this.statusCode = options.statusCode ?? 500;
    this.isOperational = options.isOperational ?? true;
    // Restore prototype chain (required for extending Error in TypeScript)
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when input fails Zod (or other) validation.
 * HTTP 422 Unprocessable Entity.
 */
export class ValidationError extends ApplicationError {
  public readonly validationErrors: ValidationFieldError[];

  constructor(
    message: string,
    validationErrors: ValidationFieldError[] = [],
    options: { cause?: unknown } = {},
  ) {
    super(message, { statusCode: 422, cause: options.cause });
    this.validationErrors = validationErrors;
  }
}

export interface ValidationFieldError {
  field: string;
  message: string;
  code: string;
}

/**
 * Thrown when a database operation fails.
 * HTTP 500 Internal Server Error.
 */
export class DatabaseError extends ApplicationError {
  constructor(message: string, options: { cause?: unknown } = {}) {
    super(message, { statusCode: 500, cause: options.cause });
  }
}

/**
 * Thrown when a requested resource is not found.
 * HTTP 404 Not Found.
 */
export class NotFoundError extends ApplicationError {
  constructor(resource: string, id?: string) {
    const detail = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
    super(detail, { statusCode: 404 });
  }
}

/**
 * Thrown when a request is unauthenticated.
 * HTTP 401 Unauthorized.
 */
export class AuthenticationError extends ApplicationError {
  constructor(message = 'Authentication required') {
    super(message, { statusCode: 401 });
  }
}

/**
 * Thrown when an authenticated user lacks the required permissions.
 * HTTP 403 Forbidden.
 */
export class AuthorizationError extends ApplicationError {
  constructor(message = 'Insufficient permissions') {
    super(message, { statusCode: 403 });
  }
}

/**
 * Thrown when a resource already exists or a business logic conflict occurs.
 * HTTP 409 Conflict.
 */
export class ConflictError extends ApplicationError {
  constructor(message: string) {
    super(message, { statusCode: 409 });
  }
}

/**
 * Thrown when a dependency (DB, Redis, external service) is unavailable.
 * HTTP 503 Service Unavailable.
 */
export class ServiceUnavailableError extends ApplicationError {
  constructor(service: string, options: { cause?: unknown } = {}) {
    super(`Service unavailable: ${service}`, { statusCode: 503, cause: options.cause });
  }
}

/**
 * Determine if an error is an operational (expected) error vs a programmer error.
 * Operational errors are safe to send to clients; programmer errors should be logged and crashed.
 */
export function isOperationalError(error: unknown): boolean {
  if (error instanceof ApplicationError) {
    return error.isOperational;
  }
  return false;
}
