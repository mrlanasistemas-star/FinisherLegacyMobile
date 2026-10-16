import { CONSENT_TTL_MS, createConsent, isConsentValid } from './consent';

describe('tracking consent', () => {
  const now = new Date('2026-10-18T07:00:00Z');

  it('is only valid for the same participation and for a short time', () => {
    const consent = createConsent(42, now);
    expect(isConsentValid(consent, 42, now.getTime())).toBe(true);
    expect(isConsentValid(consent, 43, now.getTime())).toBe(false);
    expect(isConsentValid(consent, 42, now.getTime() + CONSENT_TTL_MS + 1)).toBe(false);
  });

  it('never accepts a missing or future-dated consent', () => {
    expect(isConsentValid(null, 42)).toBe(false);
    expect(isConsentValid(undefined, 42)).toBe(false);
    expect(isConsentValid(createConsent(42, new Date(now.getTime() + 60_000)), 42, now.getTime())).toBe(false);
  });
});
