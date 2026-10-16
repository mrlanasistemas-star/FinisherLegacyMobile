import { formatAgo, formatDistance, formatElapsed } from './format';

describe('tracking format', () => {
  it('formats distance', () => {
    expect(formatDistance(640.4)).toBe('640 m');
    expect(formatDistance(8421)).toBe('8.42 km');
    expect(formatDistance(-5)).toBe('0 m');
  });

  it('formats elapsed time', () => {
    const start = '2026-10-18T07:00:00.000Z';
    expect(formatElapsed(start, Date.parse(start) + 309_000)).toBe('05:09');
    expect(formatElapsed(start, Date.parse(start) + 3_909_000)).toBe('1:05:09');
  });

  it('formats the last sync', () => {
    const now = Date.parse('2026-10-18T07:10:00.000Z');
    expect(formatAgo(null, now)).toBe('aún no');
    expect(formatAgo('2026-10-18T07:09:48.000Z', now)).toBe('hace 12 s');
    expect(formatAgo('2026-10-18T07:07:00.000Z', now)).toBe('hace 3 min');
  });
});
