/**
 * Quota handling: places left with uploads in flight, admission of a
 * multi-selection, reading a MEDIA_LIMIT_REACHED error, meter copy, plan
 * terms (expiry / expired) and the duration rule.
 */

import { AppError } from '@/api/errors';
import type { MediaQuota, QuotaBucket } from '@/schemas/story';

import {
  admit,
  applyLimit,
  billingPeriodLabel,
  durationProblem,
  formatDuration,
  formatPlanDate,
  humanDuration,
  isFull,
  kindForRole,
  limitFromError,
  limitMessage,
  meterCaption,
  meterRatio,
  meterText,
  PLAN_EXPIRED_MESSAGE,
  planState,
  slotsLeft,
} from './quota';

const bucket = (over: Partial<QuotaBucket> = {}): QuotaBucket => ({ limit: 10, used: 4, remaining: 6, can_expand: true, max_seconds: null, plan: null, ...over });

const quota: MediaQuota = {
  photos: bucket(),
  videos: bucket({ limit: 2, used: 2, remaining: 0, max_seconds: 60 }),
  audio: bucket({ limit: 1, used: 0, remaining: 1, can_expand: false, max_seconds: 120 }),
};

function limitError(details?: Record<string, unknown>) {
  return new AppError({ kind: 'business_rule', status: 422, code: 'MEDIA_LIMIT_REACHED', message: 'Límite alcanzado', details });
}

describe('places left', () => {
  it('maps a media role to its quota kind', () => {
    expect([kindForRole('photo'), kindForRole('video'), kindForRole('audio')]).toEqual(['photos', 'videos', 'audio']);
  });

  it('subtracts uploads already in the queue and never goes below zero', () => {
    expect(slotsLeft(quota, 'photos')).toBe(6);
    expect(slotsLeft(quota, 'photos', 4)).toBe(2);
    expect(slotsLeft(quota, 'photos', 9)).toBe(0);
    expect(slotsLeft(quota, 'videos')).toBe(0);
    expect(slotsLeft(null, 'photos')).toBe(0);
  });

  it('admits only what fits from a multi-selection', () => {
    expect(admit(quota, 'photos', 4)).toEqual({ accepted: 4, rejected: 0 });
    expect(admit(quota, 'photos', 9)).toEqual({ accepted: 6, rejected: 3 });
    expect(admit(quota, 'photos', 5, 3)).toEqual({ accepted: 3, rejected: 2 });
    expect(admit(quota, 'videos', 1)).toEqual({ accepted: 0, rejected: 1 });
    expect(admit(undefined, 'photos', 2)).toEqual({ accepted: 0, rejected: 2 });
  });
});

describe('MEDIA_LIMIT_REACHED', () => {
  it('reads the details of the error', () => {
    expect(limitFromError(limitError({ kind: 'videos', limit: 2, used: 2, can_expand: true }))).toEqual({ kind: 'videos', limit: 2, used: 2, can_expand: true });
  });

  it('falls back to the kind being uploaded when details are missing or malformed', () => {
    expect(limitFromError(limitError(), 'photos')).toEqual({ kind: 'photos', limit: 0, used: 0, can_expand: false });
    expect(limitFromError(limitError({ kind: 'files' }), 'audio')?.kind).toBe('audio');
    expect(limitFromError(limitError())).toBeNull();
  });

  it('ignores every other error', () => {
    expect(limitFromError(new AppError({ kind: 'business_rule', status: 422, code: 'MEDIA_TOO_LARGE', message: 'x' }), 'photos')).toBeNull();
    expect(limitFromError(new AppError({ kind: 'network', message: 'x' }), 'photos')).toBeNull();
    expect(limitFromError(new Error('boom'), 'photos')).toBeNull();
  });

  it('marks the kind as full with the numbers the server reported, leaving the others alone', () => {
    const next = applyLimit(quota, { kind: 'photos', limit: 12, used: 12, can_expand: false });
    expect(next.photos).toMatchObject({ limit: 12, used: 12, remaining: 0, can_expand: false });
    expect(next.videos).toBe(quota.videos);
    expect(isFull(next.photos)).toBe(true);
  });

  it('keeps the known numbers when the error carried none', () => {
    expect(applyLimit(quota, { kind: 'photos', limit: 0, used: 0, can_expand: true }).photos).toMatchObject({ limit: 10, used: 4, remaining: 0 });
  });
});

describe('meters', () => {
  it('writes "X de Y" and a ratio capped at 1', () => {
    expect(meterText(quota.photos)).toBe('4 de 10');
    expect(meterRatio(quota.photos)).toBeCloseTo(0.4);
    expect(meterRatio(bucket({ limit: 2, used: 5, remaining: 0 }))).toBe(1);
    expect(meterRatio(bucket({ limit: 0, used: 0, remaining: 0 }))).toBe(0);
  });

  it('says what is left, or that the limit was reached while content stays', () => {
    expect(meterCaption('photos', quota.photos)).toBe('Te quedan 6 fotos.');
    expect(meterCaption('audio', quota.audio)).toBe('Te queda 1 mensaje de voz.');
    expect(meterCaption('videos', quota.videos)).toBe(limitMessage('videos'));
    expect(limitMessage('videos')).toContain('Lo que ya agregaste se queda');
  });
});

describe('plans', () => {
  it('has no term for the free tier or a one-time pack', () => {
    expect(planState(bucket())).toEqual({ status: 'none' });
    expect(planState(bucket({ plan: { billing_period: 'one_time', expires_at: null, expired: false, renewable: false } }))).toEqual({ status: 'none' });
  });

  it('shows when a prepaid plan ends', () => {
    const annual = bucket({ plan: { billing_period: 'annual', expires_at: '2027-03-08', expired: false, renewable: true } });
    expect(planState(annual)).toEqual({ status: 'active', expiresLabel: 'Vence el 8 de marzo de 2027' });
    expect(meterCaption('photos', annual)).toBe('Te quedan 6 fotos. Vence el 8 de marzo de 2027.');
  });

  it('asks calmly to renew an expired plan', () => {
    const expired = bucket({ remaining: 0, plan: { billing_period: 'semiannual', expires_at: '2026-01-01', expired: true, renewable: true } });
    expect(planState(expired)).toEqual({ status: 'expired', renewable: true });
    expect(meterCaption('photos', expired)).toBe(PLAN_EXPIRED_MESSAGE);
  });

  it('labels the billing period shown next to the store price', () => {
    expect(billingPeriodLabel('annual')).toBe('por 12 meses');
    expect(billingPeriodLabel('semiannual')).toBe('por 6 meses');
    expect(billingPeriodLabel('one_time')).toBe('pago único');
    expect(billingPeriodLabel(null)).toBe('pago único');
  });

  it('formats date-only and ISO expiry dates, and rejects garbage', () => {
    expect(formatPlanDate('2027-12-01')).toBe('1 de diciembre de 2027');
    expect(formatPlanDate('2027-06-15T12:00:00Z')).toContain('2027');
    expect(formatPlanDate('pronto')).toBeNull();
  });
});

describe('durations', () => {
  it('formats clock and human durations', () => {
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(3723)).toBe('1:02:03');
    expect(formatDuration(0)).toBe('0:00');
    expect(humanDuration(45)).toBe('45 segundos');
    expect(humanDuration(120)).toBe('2 minutos');
    expect(humanDuration(90)).toBe('1 min 30 s');
  });

  it('accepts a clip within the limit (with half a second of grace)', () => {
    expect(durationProblem(59_000, 60)).toBeNull();
    expect(durationProblem(60_400, 60)).toBeNull();
  });

  it('refuses a clip that is too long with a clear message', () => {
    const message = durationProblem(95_000, 60);
    expect(message).toContain('1 min 35 s');
    expect(message).toContain('1 minuto');
    expect(durationProblem(200_000, 120, 'audio')).toContain('Este audio');
  });

  it('lets the server decide when the length or the limit is unknown', () => {
    expect(durationProblem(null, 60)).toBeNull();
    expect(durationProblem(0, 60)).toBeNull();
    expect(durationProblem(95_000, null)).toBeNull();
  });
});
