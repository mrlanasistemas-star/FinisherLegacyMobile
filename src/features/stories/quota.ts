/**
 * Pure rules of a story's media limits (unit tested in quota.test.ts): how
 * many files still fit per kind once the uploads already in the queue are
 * counted, how a 422 `MEDIA_LIMIT_REACHED` is read, the "X de Y" meter
 * copy, the term of a prepaid expansion ("Vence el…", expired → renew) and
 * the video / voice duration rule. Numbers always come from the backend
 * quota — nothing here hardcodes a limit.
 */

import { AppError } from '@/api/errors';
import { t, tc } from '@/i18n';
import {
  mediaLimitDetailsSchema,
  type BillingPeriod,
  type MediaLimitDetails,
  type MediaQuota,
  type MediaRole,
  type QuotaBucket,
  type QuotaKind,
} from '@/schemas/story';
import { dateFormatter } from '@/utils/dates';

export const MEDIA_LIMIT_CODE = 'MEDIA_LIMIT_REACHED';

export function kindForRole(role: MediaRole): QuotaKind {
  return role === 'photo' ? 'photos' : role === 'video' ? 'videos' : 'audio';
}

/** Places left for a kind, minus what is already waiting / uploading. */
export function slotsLeft(quota: MediaQuota | null | undefined, kind: QuotaKind, pending = 0): number {
  if (!quota) return 0;
  return Math.max(0, quota[kind].remaining - Math.max(0, pending));
}

export interface Admission {
  accepted: number;
  rejected: number;
}

/** How many of `requested` files can be queued right now. */
export function admit(quota: MediaQuota | null | undefined, kind: QuotaKind, requested: number, pending = 0): Admission {
  const accepted = Math.min(Math.max(0, requested), slotsLeft(quota, kind, pending));
  return { accepted, rejected: Math.max(0, requested) - accepted };
}

/** The limit details of a 422 `MEDIA_LIMIT_REACHED`, or null for any other error. */
export function limitFromError(error: unknown, fallbackKind?: QuotaKind): MediaLimitDetails | null {
  if (!(error instanceof AppError) || error.code !== MEDIA_LIMIT_CODE) return null;
  const parsed = mediaLimitDetailsSchema.safeParse(error.details);
  if (parsed.success) return parsed.data;
  // The code alone is enough to know the story is full; the numbers come from the next quota read.
  return fallbackKind ? { kind: fallbackKind, limit: 0, used: 0, can_expand: false } : null;
}

/** The quota as the server just described it in a limit error (remaining is 0 by definition). */
export function applyLimit(quota: MediaQuota, details: MediaLimitDetails): MediaQuota {
  const bucket = quota[details.kind];
  const known = details.limit > 0 || details.used > 0;
  return {
    ...quota,
    [details.kind]: {
      ...bucket,
      limit: known ? details.limit : bucket.limit,
      used: known ? details.used : bucket.used,
      remaining: 0,
      can_expand: details.can_expand,
    },
  };
}

export function isFull(bucket: QuotaBucket): boolean {
  return bucket.remaining <= 0;
}

export function meterRatio(bucket: QuotaBucket): number {
  if (bucket.limit <= 0) return bucket.used > 0 ? 1 : 0;
  return Math.min(1, bucket.used / bucket.limit);
}

/** "3 de 10" */
export function meterText(bucket: QuotaBucket): string {
  return t('{used} de {limit}', { used: bucket.used, limit: bucket.limit });
}

// Copy per kind is written as whole sentences (never "noun" pieces glued
// together), resolved when shown so it follows the app language.

export function kindLabel(kind: QuotaKind): string {
  if (kind === 'photos') return t('Fotos');
  if (kind === 'videos') return t('Videos');
  return t('Mensaje de voz');
}

/** "3 de 10 fotos" — the meter read aloud. */
export function meterAccessibilityLabel(kind: QuotaKind, bucket: QuotaBucket): string {
  const params = { used: bucket.used, limit: bucket.limit };
  if (kind === 'photos') return tc('{used} de {limit} foto|{used} de {limit} fotos', bucket.limit, params);
  if (kind === 'videos') return tc('{used} de {limit} video|{used} de {limit} videos', bucket.limit, params);
  return tc('{used} de {limit} mensaje de voz|{used} de {limit} mensajes de voz', bucket.limit, params);
}

/** "Ampliar fotos" / "Renovar plan de fotos" — the action next to a full meter. */
export function expandActionLabel(kind: QuotaKind, expired: boolean): string {
  if (kind === 'photos') return expired ? t('Renovar plan de fotos') : t('Ampliar fotos');
  if (kind === 'videos') return expired ? t('Renovar plan de videos') : t('Ampliar videos');
  return expired ? t('Renovar plan de mensaje de voz') : t('Ampliar mensaje de voz');
}

/** Message shown when a kind is full; the content already added always stays. */
export function limitMessage(kind: QuotaKind): string {
  if (kind === 'photos') return t('Llegaste al límite de fotos de este recuerdo. Lo que ya agregaste se queda.');
  if (kind === 'videos') return t('Llegaste al límite de videos de este recuerdo. Lo que ya agregaste se queda.');
  return t('Llegaste al límite de mensajes de voz de este recuerdo. Lo que ya agregaste se queda.');
}

/** "Te quedan 6 fotos." */
export function remainingMessage(kind: QuotaKind, remaining: number): string {
  if (kind === 'photos') return tc('Te queda {count} foto.|Te quedan {count} fotos.', remaining);
  if (kind === 'videos') return tc('Te queda {count} video.|Te quedan {count} videos.', remaining);
  return tc('Te queda {count} mensaje de voz.|Te quedan {count} mensajes de voz.', remaining);
}

/** "Quedan 6 fotos" — the short line of the add-media sheet. */
export function remainingShort(kind: QuotaKind, remaining: number): string {
  if (kind === 'photos') return tc('Queda {count} foto|Quedan {count} fotos', remaining);
  if (kind === 'videos') return tc('Queda {count} video|Quedan {count} videos', remaining);
  return tc('Queda {count} mensaje de voz|Quedan {count} mensajes de voz', remaining);
}

/** "Solo cabían 2 fotos. Las otras 3 no se agregaron." — the picker returned more than fits. */
export function partialFitMessage(kind: QuotaKind, accepted: number, rejected: number): string {
  const fit =
    kind === 'photos'
      ? tc('Solo cabía {count} foto.|Solo cabían {count} fotos.', accepted)
      : kind === 'videos'
        ? tc('Solo cabía {count} video.|Solo cabían {count} videos.', accepted)
        : tc('Solo cabía {count} mensaje de voz.|Solo cabían {count} mensajes de voz.', accepted);
  return `${fit} ${tc('La otra no se agregó.|Las otras {count} no se agregaron.', rejected)}`;
}

/** "Subiendo tu foto…" / "Subiendo 3 fotos…" */
export function uploadingMessage(kind: QuotaKind, count: number): string {
  if (kind === 'photos') return tc('Subiendo tu foto…|Subiendo {count} fotos…', count);
  if (kind === 'videos') return tc('Subiendo tu video…|Subiendo {count} videos…', count);
  return tc('Subiendo tu mensaje de voz…|Subiendo {count} mensajes de voz…', count);
}

/** "por 12 meses" / "por 6 meses" / "pago único" — shown next to the store price. */
export function billingPeriodLabel(period: BillingPeriod | null | undefined): string {
  if (period === 'annual') return t('por 12 meses');
  if (period === 'semiannual') return t('por 6 meses');
  return t('pago único');
}

const DATE: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };

/** Accepts `YYYY-MM-DD` (parsed as a local day) or a full ISO timestamp. */
export function formatPlanDate(value: string): string | null {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = dateOnly ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3])) : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  try {
    return dateFormatter('plan-date', DATE).format(date);
  } catch {
    return null;
  }
}

export type PlanState =
  /** No term: free tier or a one-time pack. */
  | { status: 'none' }
  | { status: 'active'; expiresLabel: string | null }
  | { status: 'expired'; renewable: boolean };

export function planState(bucket: QuotaBucket): PlanState {
  const plan = bucket.plan;
  if (!plan) return { status: 'none' };
  if (plan.expired) return { status: 'expired', renewable: plan.renewable };
  if (plan.expires_at && plan.billing_period !== 'one_time') {
    const label = formatPlanDate(plan.expires_at);
    return { status: 'active', expiresLabel: label ? t('Vence el {date}', { date: label }) : null };
  }
  return { status: 'none' };
}

/** Resolved when it is shown, so it follows the app language. */
export function planExpiredMessage(): string {
  return t('Tu plan venció — renuévalo para seguir agregando.');
}

/** The line under a meter. */
export function meterCaption(kind: QuotaKind, bucket: QuotaBucket): string {
  const plan = planState(bucket);
  if (plan.status === 'expired') return planExpiredMessage();
  const base = isFull(bucket) ? limitMessage(kind) : remainingMessage(kind, bucket.remaining);
  return plan.status === 'active' && plan.expiresLabel ? `${base} ${plan.expiresLabel}.` : base;
}

/** "1:05" / "12:40" / "1:02:03" */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** "45 segundos" / "2 minutos" / "1 min 30 s" */
export function humanDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  if (seconds < 60) return tc('{count} segundo|{count} segundos', seconds);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (s === 0) return tc('{count} minuto|{count} minutos', m);
  return t('{minutes} min {seconds} s', { minutes: m, seconds: s });
}

/**
 * Null when the clip fits (or its length / the limit is unknown — the
 * server still checks); otherwise the message to show instead of uploading.
 * `durationMs` is what the system picker reports.
 */
export function durationProblem(durationMs: number | null | undefined, maxSeconds: number | null | undefined, kind: 'videos' | 'audio' = 'videos'): string | null {
  if (!maxSeconds || !durationMs || durationMs <= 0) return null;
  // Half a second of grace: pickers round container durations differently.
  if (durationMs / 1000 <= maxSeconds + 0.5) return null;
  const params = { duration: humanDuration(durationMs / 1000), max: humanDuration(maxSeconds) };
  return kind === 'videos'
    ? t('Este video dura {duration} y el máximo es de {max}. Recórtalo en tu galería y vuelve a elegirlo.', params)
    : t('Este audio dura {duration} y el máximo es de {max}. Recórtalo en tu galería y vuelve a elegirlo.', params);
}
