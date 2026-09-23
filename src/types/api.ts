export interface ApiSuccessEnvelope<T> {
  data: T;
  message: string | null;
  meta?: {
    request_id?: string;
    [key: string]: unknown;
  };
}

export interface PaginatedMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface PaginatedLinks {
  first: string | null;
  last: string | null;
  prev: string | null;
  next: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  links: PaginatedLinks;
  meta: PaginatedMeta;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  request_id?: string;
}

/**
 * Three different list endpoints wrap pagination three different ways —
 * confirmed by reading the actual controllers, not assumed. Never treat
 * these as interchangeable with `PaginatedResponse<T>` above.
 */

/**
 * `GET /me/events`, `/me/history`, `/me/notifications` — these controllers
 * pass a raw `LengthAwarePaginator` straight into `respond()` instead of a
 * Resource collection's `->response()`, so Laravel's *default* paginator
 * JSON shape ends up nested one level under the envelope's `data` key,
 * with pagination fields flat inside it (not in `meta`).
 */
export interface NestedPaginatorEnvelope<T> {
  data: {
    current_page: number;
    data: T[];
    last_page: number;
    per_page: number;
    total: number;
  };
  message: string | null;
  meta?: { request_id?: string; unread_count?: number };
}

/**
 * `GET /store/products`, `GET /me/support-sessions` — `respond(collection,
 * meta: [...])`: flat `data` array, but `meta` only carries
 * `current_page`/`last_page`/`total` (no `per_page`, no `links`).
 */
export interface FlatMetaPaginatedResponse<T> {
  data: T[];
  message: string | null;
  meta: {
    current_page: number;
    last_page: number;
    total: number;
    request_id?: string;
  };
}

export interface ValidationErrorBody {
  message: string;
  errors: Record<string, string[]>;
}
