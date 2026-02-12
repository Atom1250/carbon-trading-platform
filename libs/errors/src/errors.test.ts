import {
  ApplicationError,
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  DatabaseError,
  NotFoundError,
  RateLimitError,
  ServiceUnavailableError,
  ValidationError,
  isOperationalError,
} from './errors.js';

describe('ApplicationError', () => {
  it('should have correct name, message, and default statusCode 500', () => {
    const err = new ApplicationError('something went wrong');
    expect(err.name).toBe('ApplicationError');
    expect(err.message).toBe('something went wrong');
    expect(err.statusCode).toBe(500);
    expect(err.isOperational).toBe(true);
    expect(err instanceof Error).toBe(true);
    expect(err instanceof ApplicationError).toBe(true);
  });

  it('should accept custom statusCode', () => {
    const err = new ApplicationError('bad request', { statusCode: 400 });
    expect(err.statusCode).toBe(400);
  });

  it('should accept cause', () => {
    const cause = new Error('root cause');
    const err = new ApplicationError('wrapped', { cause });
    expect(err.cause).toBe(cause);
  });

  it('should allow isOperational: false', () => {
    const err = new ApplicationError('programmer error', { isOperational: false });
    expect(err.isOperational).toBe(false);
  });
});

describe('ValidationError', () => {
  it('should have statusCode 422', () => {
    const err = new ValidationError('validation failed');
    expect(err.statusCode).toBe(422);
    expect(err.name).toBe('ValidationError');
    expect(err instanceof ApplicationError).toBe(true);
  });

  it('should hold field-level validation errors', () => {
    const fieldErrors = [{ field: 'email', message: 'Invalid email', code: 'INVALID_EMAIL' }];
    const err = new ValidationError('invalid input', fieldErrors);
    expect(err.validationErrors).toEqual(fieldErrors);
  });

  it('should default validationErrors to empty array', () => {
    const err = new ValidationError('invalid');
    expect(err.validationErrors).toEqual([]);
  });

  it('should accept a cause', () => {
    const cause = new Error('zod error');
    const err = new ValidationError('bad', [], { cause });
    expect(err.cause).toBe(cause);
  });
});

describe('DatabaseError', () => {
  it('should have statusCode 500', () => {
    const err = new DatabaseError('query failed');
    expect(err.statusCode).toBe(500);
    expect(err.name).toBe('DatabaseError');
    expect(err instanceof ApplicationError).toBe(true);
  });

  it('should accept a cause', () => {
    const cause = new Error('connection refused');
    const err = new DatabaseError('db error', { cause });
    expect(err.cause).toBe(cause);
  });
});

describe('NotFoundError', () => {
  it('should have statusCode 404', () => {
    const err = new NotFoundError('User');
    expect(err.statusCode).toBe(404);
    expect(err.name).toBe('NotFoundError');
    expect(err instanceof ApplicationError).toBe(true);
  });

  it('should include resource name in message when no id given', () => {
    const err = new NotFoundError('User');
    expect(err.message).toContain('User');
  });

  it('should include id in message when given', () => {
    const err = new NotFoundError('User', 'abc-123');
    expect(err.message).toContain('abc-123');
    expect(err.message).toContain('User');
  });
});

describe('AuthenticationError', () => {
  it('should have statusCode 401 and default message', () => {
    const err = new AuthenticationError();
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe('Authentication required');
    expect(err instanceof ApplicationError).toBe(true);
  });

  it('should accept custom message', () => {
    const err = new AuthenticationError('token expired');
    expect(err.message).toBe('token expired');
  });
});

describe('AuthorizationError', () => {
  it('should have statusCode 403 and default message', () => {
    const err = new AuthorizationError();
    expect(err.statusCode).toBe(403);
    expect(err.message).toBe('Insufficient permissions');
    expect(err instanceof ApplicationError).toBe(true);
  });

  it('should accept custom message', () => {
    const err = new AuthorizationError('admin only');
    expect(err.message).toBe('admin only');
  });
});

describe('ConflictError', () => {
  it('should have statusCode 409', () => {
    const err = new ConflictError('email already exists');
    expect(err.statusCode).toBe(409);
    expect(err.message).toBe('email already exists');
    expect(err instanceof ApplicationError).toBe(true);
  });
});

describe('RateLimitError', () => {
  it('should have statusCode 429 and default message', () => {
    const err = new RateLimitError();
    expect(err.statusCode).toBe(429);
    expect(err.message).toBe('Too many requests');
    expect(err.name).toBe('RateLimitError');
    expect(err instanceof ApplicationError).toBe(true);
  });

  it('should accept custom message and retryAfterSeconds', () => {
    const err = new RateLimitError('Slow down', 60);
    expect(err.message).toBe('Slow down');
    expect(err.retryAfterSeconds).toBe(60);
  });

  it('should default retryAfterSeconds to 900', () => {
    const err = new RateLimitError();
    expect(err.retryAfterSeconds).toBe(900);
  });
});

describe('ServiceUnavailableError', () => {
  it('should have statusCode 503', () => {
    const err = new ServiceUnavailableError('redis');
    expect(err.statusCode).toBe(503);
    expect(err.message).toContain('redis');
    expect(err instanceof ApplicationError).toBe(true);
  });

  it('should accept a cause', () => {
    const cause = new Error('ECONNREFUSED');
    const err = new ServiceUnavailableError('postgres', { cause });
    expect(err.cause).toBe(cause);
  });
});

describe('isOperationalError', () => {
  it('should return true for ApplicationError with isOperational: true', () => {
    const err = new ApplicationError('operational');
    expect(isOperationalError(err)).toBe(true);
  });

  it('should return false for ApplicationError with isOperational: false', () => {
    const err = new ApplicationError('crash', { isOperational: false });
    expect(isOperationalError(err)).toBe(false);
  });

  it('should return false for plain Error', () => {
    expect(isOperationalError(new Error('plain'))).toBe(false);
  });

  it('should return false for non-error values', () => {
    expect(isOperationalError(null)).toBe(false);
    expect(isOperationalError('string error')).toBe(false);
    expect(isOperationalError(42)).toBe(false);
  });

  it('should return true for all operational subclasses', () => {
    expect(isOperationalError(new ValidationError('v'))).toBe(true);
    expect(isOperationalError(new NotFoundError('R'))).toBe(true);
    expect(isOperationalError(new AuthenticationError())).toBe(true);
    expect(isOperationalError(new AuthorizationError())).toBe(true);
    expect(isOperationalError(new ConflictError('c'))).toBe(true);
    expect(isOperationalError(new DatabaseError('d'))).toBe(true);
    expect(isOperationalError(new ServiceUnavailableError('s'))).toBe(true);
    expect(isOperationalError(new RateLimitError())).toBe(true);
  });
});
