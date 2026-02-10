/**
 * Shared TypeScript types used across all services.
 *
 * Response envelope types follow the conventions defined in PROJECT_CONTEXT.md:
 *   - Success: { data, metadata? }
 *   - Error: RFC 7807 Problem Details
 * Pagination uses limit/offset with hasMore flag.
 */

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface PaginationQuery {
  limit?: number;
  offset?: number;
}

// ---------------------------------------------------------------------------
// API response envelopes
// ---------------------------------------------------------------------------

/**
 * Standard success response for single resources.
 */
export interface ApiResponse<T> {
  data: T;
}

/**
 * Standard success response for paginated collections.
 */
export interface PaginatedResponse<T> {
  data: T[];
  metadata: PaginationMeta;
}

// ---------------------------------------------------------------------------
// RFC 7807 Problem Details (used for all error responses)
// ---------------------------------------------------------------------------

export interface ValidationFieldDetail {
  field: string;
  message: string;
  code: string;
}

/**
 * RFC 7807 Problem Details error response shape.
 * @see https://datatracker.ietf.org/doc/html/rfc7807
 */
export interface ApiErrorResponse {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  errors?: ValidationFieldDetail[];
}

// ---------------------------------------------------------------------------
// Entity base types
// ---------------------------------------------------------------------------

/**
 * All database entities have these fields.
 */
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Entities that support soft-delete have this field.
 */
export interface SoftDeletableEntity extends BaseEntity {
  deletedAt: Date | null;
}

// ---------------------------------------------------------------------------
// Utility types
// ---------------------------------------------------------------------------

/**
 * Make a subset of fields in T optional.
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Make a subset of fields in T required.
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * Extract a subset of keys from T that have values of type V.
 */
export type KeysOfType<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];
