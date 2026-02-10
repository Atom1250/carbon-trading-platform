/**
 * Types are compile-time constructs; we test them by exercising the runtime
 * shapes that the types describe, and by verifying utility helpers behave
 * correctly at runtime (pagination meta, error response construction, etc.).
 */
import type {
  ApiErrorResponse,
  ApiResponse,
  BaseEntity,
  KeysOfType,
  PaginatedResponse,
  PaginationMeta,
  PaginationQuery,
  PartialBy,
  RequiredBy,
  SoftDeletableEntity,
  ValidationFieldDetail,
} from './types.js';

// ---------------------------------------------------------------------------
// Helper to build typed objects (validates structural conformance at compile time)
// ---------------------------------------------------------------------------

function makePaginationMeta(overrides: Partial<PaginationMeta> = {}): PaginationMeta {
  return { total: 100, page: 1, limit: 20, hasMore: true, ...overrides };
}

function makeApiError(overrides: Partial<ApiErrorResponse> = {}): ApiErrorResponse {
  return {
    type: 'https://api.example.com/errors/not-found',
    title: 'Not Found',
    status: 404,
    detail: 'User not found',
    instance: '/api/v1/users/abc',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PaginationMeta', () => {
  it('should have total, page, limit, hasMore', () => {
    const meta = makePaginationMeta();
    expect(meta.total).toBe(100);
    expect(meta.page).toBe(1);
    expect(meta.limit).toBe(20);
    expect(meta.hasMore).toBe(true);
  });

  it('hasMore should be false when on last page', () => {
    const meta = makePaginationMeta({ total: 10, page: 1, limit: 20, hasMore: false });
    expect(meta.hasMore).toBe(false);
  });
});

describe('PaginationQuery', () => {
  it('should accept optional limit and offset', () => {
    const q: PaginationQuery = {};
    expect(q.limit).toBeUndefined();
    expect(q.offset).toBeUndefined();

    const q2: PaginationQuery = { limit: 10, offset: 0 };
    expect(q2.limit).toBe(10);
    expect(q2.offset).toBe(0);
  });
});

describe('ApiResponse', () => {
  it('should wrap data in a data key', () => {
    const response: ApiResponse<{ id: string }> = { data: { id: 'abc' } };
    expect(response.data.id).toBe('abc');
  });
});

describe('PaginatedResponse', () => {
  it('should have data array and metadata', () => {
    const response: PaginatedResponse<{ id: string }> = {
      data: [{ id: '1' }, { id: '2' }],
      metadata: makePaginationMeta({ total: 2, hasMore: false }),
    };
    expect(response.data).toHaveLength(2);
    expect(response.metadata.total).toBe(2);
    expect(response.metadata.hasMore).toBe(false);
  });
});

describe('ApiErrorResponse (RFC 7807)', () => {
  it('should have required RFC 7807 fields', () => {
    const err = makeApiError();
    expect(err.type).toMatch(/^https/);
    expect(err.title).toBeTruthy();
    expect(err.status).toBe(404);
    expect(err.detail).toBeTruthy();
    expect(err.instance).toBeTruthy();
  });

  it('should support optional errors array', () => {
    const fieldErrors: ValidationFieldDetail[] = [
      { field: 'email', message: 'Invalid email', code: 'INVALID_EMAIL' },
    ];
    const err = makeApiError({ status: 422, errors: fieldErrors });
    expect(err.errors).toBeDefined();
    expect(err.errors).toHaveLength(1);
    expect(err.errors![0].field).toBe('email');
  });

  it('should allow errors to be undefined', () => {
    const err = makeApiError();
    expect(err.errors).toBeUndefined();
  });
});

describe('BaseEntity', () => {
  it('should have id, createdAt, updatedAt', () => {
    const entity: BaseEntity = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(entity.id).toBeTruthy();
    expect(entity.createdAt instanceof Date).toBe(true);
    expect(entity.updatedAt instanceof Date).toBe(true);
  });
});

describe('SoftDeletableEntity', () => {
  it('should allow deletedAt to be null', () => {
    const entity: SoftDeletableEntity = {
      id: 'abc',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };
    expect(entity.deletedAt).toBeNull();
  });

  it('should allow deletedAt to be a Date', () => {
    const deletedAt = new Date();
    const entity: SoftDeletableEntity = {
      id: 'abc',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt,
    };
    expect(entity.deletedAt).toBe(deletedAt);
  });
});

describe('PartialBy utility type', () => {
  type User = { id: string; name: string; email: string };
  type CreateUser = PartialBy<User, 'id'>;

  it('should make specified fields optional', () => {
    const user: CreateUser = { name: 'Alice', email: 'alice@example.com' };
    expect(user.name).toBe('Alice');
    expect(user.id).toBeUndefined();

    const userWithId: CreateUser = { id: '1', name: 'Bob', email: 'bob@example.com' };
    expect(userWithId.id).toBe('1');
  });
});

describe('RequiredBy utility type', () => {
  type UpdateUser = { id?: string; name?: string; email?: string };
  type UpdateUserWithRequiredId = RequiredBy<UpdateUser, 'id'>;

  it('should make specified fields required', () => {
    const update: UpdateUserWithRequiredId = { id: 'abc', name: 'Alice' };
    expect(update.id).toBe('abc');
  });
});

describe('KeysOfType utility type', () => {
  type Mixed = { a: string; b: number; c: string; d: boolean };
  type StringKeys = KeysOfType<Mixed, string>;

  it('should extract only keys with string values', () => {
    const key: StringKeys = 'a';
    expect(['a', 'c']).toContain(key);
  });
});
