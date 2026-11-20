import { getLocale, t } from '@/i18n';

import { formatDurationShort, formatKm, formatPace, formatSpeedKmh } from './workout-math';

/**
 * Display strings for workouts, resolved in the active language. "—" (and
 * never a guessed number) whenever the data isn't there.
 */

export const NO_VALUE = '—';

/** `1 h 05 min`, `42 min`, `45 s`. */
export function durationLabel(seconds: number | null | undefined): string {
  if (typeof seconds !== 'number' || seconds <= 0) return NO_VALUE;
  const { h, m, s } = formatDurationShort(seconds);
  if (h > 0) return t('{h} h {m} min', { h, m: String(m).padStart(2, '0') });
  if (m > 0) return t('{m} min', { m });
  return t('{s} s', { s });
}

export function kmLabel(meters: number | null | undefined): string {
  if (typeof meters !== 'number' || meters <= 0) return NO_VALUE;
  return t('{value} km', { value: formatKm(meters, getLocale()) });
}

/** Pace (`5:21 /km`) or speed (`24.3 km/h`) by the sport's metric; null without enough data. */
export function rhythmLabel(metric: 'pace' | 'speed', paceSecondsPerKm: number | null | undefined, speedMps: number | null | undefined): string | null {
  if (metric === 'speed') {
    const speed = formatSpeedKmh(speedMps, getLocale());
    return speed ? t('{value} km/h', { value: speed }) : null;
  }
  const pace = formatPace(paceSecondsPerKm);
  return pace ? t('{value} /km', { value: pace }) : null;
}

/** `mié 12 nov · 7:05` */
export function workoutDateLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const locale = getLocale();
  const day = date.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '');
  const time = date.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
  return `${day} · ${time}`;
}
