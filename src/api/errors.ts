import { isAxiosError } from 'axios';

import type { ApiErrorBody, ValidationErrorBody } from '@/types/api';

export type AppErrorKind =
  | 'validation'
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
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
  readonly requestId?: string;

  constructor(params: {
    kind: AppErrorKind;
    message: string;
    code?: string;
    status?: number;
    fieldErrors?: Record<string, string[]>;
    requestId?: string;
  }) {
    super(params.message);
    this.kind = params.kind;
    this.code = params.code;
    this.status = params.status;
    this.fieldErrors = params.fieldErrors;
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

  if (status === 422) {
    const body = error.response.data as ValidationErrorBody;
    return new AppError({
      kind: 'validation',
      message: body?.message ?? 'Los datos proporcionados no son válidos.',
      status,
      fieldErrors: body?.errors ?? {},
    });
  }

  const body = error.response.data as (ApiErrorBody & { message?: string | null }) | undefined;
  const code = body?.error?.code;
  const requestId = body?.request_id;
  // A few endpoints (e.g. LegacyCodeController::claim) return their
  // 403/409 bodies through the plain success envelope {data:null, message}
  // instead of {error:{code,message}} — fall back to that top-level
  // `message` before the generic copy so those specific strings surface.
  const backendMessage = body?.error?.message ?? body?.message ?? undefined;

  switch (status) {
    case 401:
      return new AppError({
        kind: 'unauthenticated',
        message: 'Tu sesión expiró. Inicia sesión nuevamente.',
        code,
        status,
        requestId,
      });
    case 403:
      return new AppError({
        kind: 'forbidden',
        message: backendMessage ?? 'No tienes permiso para hacer esto.',
        code,
        status,
        requestId,
      });
    case 404:
      return new AppError({
        kind: 'not_found',
        message: 'No pudimos encontrar lo que buscas.',
        code,
        status,
        requestId,
      });
    case 409:
      return new AppError({
        kind: 'conflict',
        message: backendMessage ?? 'Ya se realizó esta acción o hay un conflicto.',
        code,
        status,
        requestId,
      });
    case 429:
      return new AppError({
        kind: 'rate_limited',
        message: 'Has realizado demasiados intentos. Intenta nuevamente en unos momentos.',
        code,
        status,
        requestId,
      });
    default:
      return new AppError({
        kind: 'server',
        message: GENERIC_MESSAGE,
        code,
        status,
        requestId,
      });
  }
}
