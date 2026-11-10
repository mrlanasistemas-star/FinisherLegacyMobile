import { t } from '@/i18n';

import { dateFormatter } from './dates';

const SHORT: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
const SHORT_YEAR: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };

/** "ahora", "hace 5 min", "hace 3 h", "ayer", "hace 4 d", "12 sep", "12 sep 2025". */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000);

  if (Number.isNaN(seconds)) return '';
  if (seconds < 60) return t('ahora');
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t('hace {minutes} min', { minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('hace {hours} h', { hours });
  const days = Math.floor(hours / 24);
  if (days === 1) return t('ayer');
  if (days < 7) return t('hace {days} d', { days });
  return date.getFullYear() === now.getFullYear() ? dateFormatter('short', SHORT).format(date) : dateFormatter('short-year', SHORT_YEAR).format(date);
}

export type TimeBucket = 'today' | 'week' | 'earlier';

/** Notification grouping: Hoy / Esta semana / Antes. */
export function timeBucket(iso: string, now: Date = new Date()): TimeBucket {
  const date = new Date(iso);
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  if (date >= startOfToday) return 'today';
  const weekAgo = new Date(startOfToday);
  weekAgo.setDate(weekAgo.getDate() - 6);
  return date >= weekAgo ? 'week' : 'earlier';
}

/** Resolved when it is shown, so it follows the app language. */
export function timeBucketLabel(bucket: TimeBucket): string {
  switch (bucket) {
    case 'today':
      return t('Hoy');
    case 'week':
      return t('Esta semana');
    default:
      return t('Antes');
  }
}
