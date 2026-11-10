/**
 * Pure rules of a story's media limits (unit tested in quota.test.ts): how
 * many files still fit per kind once the uploads already in the queue are
 * counted, how a 422 `MEDIA_LIMIT_REACHED` is read, the "X de Y" meter
 * copy, the term of a prepaid expansion ("Vence el…", expired → renew) and
 * the video / voice duration rule. Numbers always come from the backend
 * quota — nothing here hardcodes a limit.
 */

import { AppError } from '@/api/errors';
import {
  mediaLimitDetailsSchema,
  type BillingPeriod,
  type MediaLimitDetails,
  type MediaQuota,
  type MediaRole,
  type QuotaBucket,
  type QuotaKind,
} from '@/schemas/story';

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
  return `${bucket.used} de ${bucket.limit}`;
}

const KIND_NOUN: Record<QuotaKind, { one: string; many: string; label: string }> = {
  photos: { one: 'foto', many: 'fotos', label: 'Fotos' },
  videos: { one: 'video', many: 'videos', label: 'Videos' },
  audio: { one: 'mensaje de voz', many: 'mensajes de voz', label: 'Mensaje de voz' },
};

export function kindLabel(kind: QuotaKind): string {
  return KIND_NOUN[kind].label;
}

export function kindNoun(kind: QuotaKind, amount: number): string {
  return amount === 1 ? KIND_NOUN[kind].one : KIND_NOUN[kind].many;
}

/** Message shown when a kind is full; the content already added always stays. */
export function limitMessage(kind: QuotaKind): string {
  return `Llegaste al límite de ${KIND_NOUN[kind].many} de este recuerdo. Lo que ya agregaste se queda.`;
}

/** "por 12 meses" / "por 6 meses" / "pago único" — shown next to the store price. */
export function billingPeriodLabel(period: BillingPeriod | null | undefined): string {
  if (period === 'annual') return 'por 12 meses';
  if (period === 'semiannual') return 'por 6 meses';
  return 'pago único';
}

const DATE = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });

/** Accepts `YYYY-MM-DD` (parsed as a local day) or a full ISO timestamp. */
export function formatPlanDate(value: string): string | null {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = dateOnly ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3])) : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  try {
    return DATE.format(date);
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
    return { status: 'active', expiresLabel: label ? `Vence el ${label}` : null };
  }
  return { status: 'none' };
}

export const PLAN_EXPIRED_MESSAGE = 'Tu plan venció — renuévalo para seguir agregando.';

/** The line under a meter. */
export function meterCaption(kind: QuotaKind, bucket: QuotaBucket): string {
  const plan = planState(bucket);
  if (plan.status === 'expired') return PLAN_EXPIRED_MESSAGE;
  const base = isFull(bucket)
    ? limitMessage(kind)
    : `Te ${bucket.remaining === 1 ? 'queda' : 'quedan'} ${bucket.remaining} ${kindNoun(kind, bucket.remaining)}.`;
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
  if (seconds < 60) return `${seconds} ${seconds === 1 ? 'segundo' : 'segundos'}`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (s === 0) return `${m} ${m === 1 ? 'minuto' : 'minutos'}`;
  return `${m} min ${s} s`;
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
  const what = kind === 'videos' ? 'Este video' : 'Este audio';
  return `${what} dura ${humanDuration(durationMs / 1000)} y el máximo es de ${humanDuration(maxSeconds)}. Recórtalo en tu galería y vuelve a elegirlo.`;
}
