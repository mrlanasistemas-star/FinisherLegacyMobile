import { relativeTime, timeBucket } from './relative-time';

const now = new Date('2026-09-23T12:00:00');

describe('relativeTime', () => {
  it('reads naturally in Spanish', () => {
    expect(relativeTime('2026-09-23T11:59:40', now)).toBe('ahora');
    expect(relativeTime('2026-09-23T11:55:00', now)).toBe('hace 5 min');
    expect(relativeTime('2026-09-23T09:00:00', now)).toBe('hace 3 h');
    expect(relativeTime('2026-09-22T09:00:00', now)).toBe('ayer');
    expect(relativeTime('2026-09-19T09:00:00', now)).toBe('hace 4 d');
  });

  it('falls back to a date for older items', () => {
    expect(relativeTime('2026-08-01T09:00:00', now)).toMatch(/ago/);
  });
});

describe('timeBucket', () => {
  it('groups into Hoy / Esta semana / Antes', () => {
    expect(timeBucket('2026-09-23T08:00:00', now)).toBe('today');
    expect(timeBucket('2026-09-19T08:00:00', now)).toBe('week');
    expect(timeBucket('2026-09-01T08:00:00', now)).toBe('earlier');
  });
});
