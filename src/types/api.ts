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

export interface ValidationErrorBody {
  message: string;
  errors: Record<string, string[]>;
}
