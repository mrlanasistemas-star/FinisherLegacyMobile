const SHORT = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' });
const SHORT_YEAR = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });

/** "ahora", "hace 5 min", "hace 3 h", "ayer", "hace 4 d", "12 sep", "12 sep 2025". */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000);

  if (Number.isNaN(seconds)) return '';
  if (seconds < 60) return 'ahora';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'ayer';
  if (days < 7) return `hace ${days} d`;
  return date.getFullYear() === now.getFullYear() ? SHORT.format(date) : SHORT_YEAR.format(date);
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

export const TIME_BUCKET_LABEL: Record<TimeBucket, string> = {
  today: 'Hoy',
  week: 'Esta semana',
  earlier: 'Antes',
};
