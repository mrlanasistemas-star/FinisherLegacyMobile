import { canOfferLiveTracking } from './eligibility';

describe('canOfferLiveTracking', () => {
  const now = new Date('2026-10-18T09:00:00');

  it('offers tracking for upcoming and same-day races, or unknown dates', () => {
    expect(canOfferLiveTracking('2026-10-25', now)).toBe(true);
    expect(canOfferLiveTracking('2026-10-18', now)).toBe(true);
    expect(canOfferLiveTracking('2026-10-17', now)).toBe(true);
    expect(canOfferLiveTracking(null, now)).toBe(true);
  });

  it('hides it for past races', () => {
    expect(canOfferLiveTracking('2026-10-10', now)).toBe(false);
  });
});
