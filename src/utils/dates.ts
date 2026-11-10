import { getRegionalLocale } from '@/i18n';

const SHORT_DATE: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
const LONG_DATE: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };

const formatters = new Map<string, Intl.DateTimeFormat>();

/**
 * A date formatter in the app's active language ("es-MX", "en-US"…), built
 * once per language + shape. Never create `Intl.DateTimeFormat` at module
 * scope: it would freeze the language the app started in.
 */
export function dateFormatter(name: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${getRegionalLocale()}|${name}`;
  let formatter = formatters.get(key);

  if (!formatter) {
    formatter = new Intl.DateTimeFormat(getRegionalLocale(), options);
    formatters.set(key, formatter);
  }

  return formatter;
}

/**
 * Backend dates without a time component (event_date, "YYYY-MM-DD") must
 * never be parsed as UTC — `new Date('2026-03-05')` shifts a day back in
 * most western timezones. Parse the parts directly instead (AGENTS.md §82).
 */
function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

/** Whether a date-only string (event_date) is strictly before today, local time. */
export function isPastDate(value: string): boolean {
  const date = parseDateOnly(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date.getTime() < today.getTime();
}

export function formatShortDate(value: string): string {
  try {
    return dateFormatter('short-date', SHORT_DATE).format(parseDateOnly(value));
  } catch {
    return value;
  }
}

export function formatLongDate(value: string): string {
  try {
    return dateFormatter('long-date', LONG_DATE).format(parseDateOnly(value));
  } catch {
    return value;
  }
}

const DATE_TIME: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
};

/**
 * Full ISO8601 timestamps (`created_at`, `read_at`, notification/support
 * message times) — unlike `event_date` these DO carry real time/timezone
 * info, so `new Date(value)` is the correct parse here (the opposite of
 * `parseDateOnly` above, which exists specifically to avoid that for
 * date-only strings).
 */
export function formatDateTime(value: string): string {
  try {
    return dateFormatter('date-time', DATE_TIME).format(new Date(value));
  } catch {
    return value;
  }
}
