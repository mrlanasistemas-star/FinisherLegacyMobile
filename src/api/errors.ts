import { isAxiosError } from 'axios';

import type { ApiErrorBody, ValidationErrorBody } from '@/types/api';

export type AppErrorKind =
  | 'validation'
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  /**
   * A domain rule rejected the request — always carries a real `code` from
   * `App\Enums\ApiErrorCode` (e.g. COUPON_NOT_APPLICABLE,
   * PRODUCT_OUT_OF_STOCK, MEDIA_LIMIT_REACHED). Distinct from `validation`:
   * these are thrown as `App\Exceptions\Api\ApiException` subclasses, which
   * render as `{error:{code,message,details}}` EVEN AT STATUS 422 — not
   * Laravel's `{message,errors}` shape. Confirmed reading
   * `ApiExceptionRenderer` — it renders any `ApiException` the same way
   * regardless of status, and only real `ValidationException`s get the
   * Laravel-native shape.
   */
  | 'business_rule'
  | 'rate_limited'
  | 'server'
  | 'network'
  | 'timeout'
  | 'unknown';

/**
 * Normalized error every screen/hook deals with — never a raw AxiosError,
 * never a stack trace shown to a human (AGENTS.md §48).
 */
export class AppError extends Error {
  readonly kind: AppErrorKind;
  readonly code?: string;
  readonly status?: number;
  readonly fieldErrors?: Record<string, string[]>;
  readonly details?: Record<string, unknown>;
  readonly requestId?: string;

  constructor(params: {
    kind: AppErrorKind;
    message: string;
    code?: string;
    status?: number;
    fieldErrors?: Record<string, string[]>;
    details?: Record<string, unknown>;
    requestId?: string;
  }) {
    super(params.message);
    this.kind = params.kind;
    this.code = params.code;
    this.status = params.status;
    this.fieldErrors = params.fieldErrors;
    this.details = params.details;
    this.requestId = params.requestId;
  }
}

const GENERIC_MESSAGE = 'Algo salió mal. Intenta nuevamente.';

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  if (!isAxiosError(error)) {
    return new AppError({ kind: 'unknown', message: GENERIC_MESSAGE });
  }

  if (error.code === 'ECONNABORTED') {
    return new AppError({
      kind: 'timeout',
      message: 'La solicitud tardó demasiado. Verifica tu conexión e intenta de nuevo.',
    });
  }

  if (!error.response) {
    return new AppError({
      kind: 'network',
      message: 'No hay conexión a Internet. Verifica tu red e intenta de nuevo.',
    });
  }

  const status = error.response.status;
  const raw = error.response.data as
    | (Partial<ValidationErrorBody> & Partial<ApiErrorBody> & { message?: string | null })
    | undefined;

  // Real Laravel ValidationException — the only 422 shape with an `errors`
  // object. Checked by shape, not status: a domain ApiException (e.g.
  // CouponNotApplicableException) also returns 422 but with an `error`
  // object instead — see the `business_rule` kind above.
  if (status === 422 && raw?.errors) {
    return new AppError({
      kind: 'validation',
      message: raw.message ?? 'Los datos proporcionados no son válidos.',
      status,
      fieldErrors: raw.errors ?? {},
    });
  }

  const code = raw?.error?.code;
  const details = raw?.error?.details;
  const requestId = raw?.request_id;
  // A few endpoints (e.g. LegacyCodeController::claim) return their
  // 403/409 bodies through the plain success envelope {data:null, message}
  // instead of {error:{code,message}} — fall back to that top-level
  // `message` before the generic copy so those specific strings surface.
  const backendMessage = raw?.error?.message ?? raw?.message ?? undefined;

  if (status === 422) {
    return new AppError({
      kind: 'business_rule',
      message: backendMessage ?? 'No pudimos completar esta acción.',
      code,
      status,
      details,
      requestId,
    });
  }

  switch (status) {
    case 401:
      return new AppError({
        kind: 'unauthenticated',
        message: 'Tu sesión expiró. Inicia sesión nuevamente.',
        code,
        status,
        details,
        requestId,
      });
    case 403:
      return new AppError({
        kind: 'forbidden',
        message: backendMessage ?? 'No tienes permiso para hacer esto.',
        code,
        status,
        details,
        requestId,
      });
    case 404:
      return new AppError({
        kind: 'not_found',
        message: 'No pudimos encontrar lo que buscas.',
        code,
        status,
        details,
        requestId,
      });
    case 409:
      return new AppError({
        kind: 'conflict',
        message: backendMessage ?? 'Ya se realizó esta acción o hay un conflicto.',
        code,
        status,
        details,
        requestId,
      });
    case 429:
      return new AppError({
        kind: 'rate_limited',
        message: 'Has realizado demasiados intentos. Intenta nuevamente en unos momentos.',
        code,
        status,
        details,
        requestId,
      });
    default:
      return new AppError({
        kind: 'server',
        message: GENERIC_MESSAGE,
        code,
        status,
        details,
        requestId,
      });
  }
}
