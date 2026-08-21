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
