const SHORT_DATE = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
const LONG_DATE = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });

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
    return SHORT_DATE.format(parseDateOnly(value));
  } catch {
    return value;
  }
}

export function formatLongDate(value: string): string {
  try {
    return LONG_DATE.format(parseDateOnly(value));
  } catch {
    return value;
  }
}
