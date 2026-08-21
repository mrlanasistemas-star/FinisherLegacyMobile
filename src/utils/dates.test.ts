import { formatLongDate, formatShortDate } from './dates';

describe('date-only formatting (AGENTS.md §82 — never shift a day via UTC parsing)', () => {
  it('formats a date-only string without shifting to the previous day', () => {
    // A naive `new Date('2026-03-05')` parses as UTC midnight, which
    // renders as March 4th in any timezone behind UTC — this must not
    // happen for event_date / preregistration dates.
    const formatted = formatShortDate('2026-03-05');
    expect(formatted).toContain('5');
    expect(formatted).not.toContain('4 ');
  });

  it('formats a long date in Spanish', () => {
    const formatted = formatLongDate('2026-01-01');
    expect(formatted.toLowerCase()).toContain('enero');
  });

  it('falls back to the raw string on invalid input instead of throwing', () => {
    expect(formatShortDate('not-a-date')).toBe('not-a-date');
  });
});
