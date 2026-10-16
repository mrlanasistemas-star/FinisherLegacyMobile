import type { NfcResolution } from '@/types/nfc';

import { nfcInAppHref } from './nfc-target';

type Overrides = Partial<Omit<NfcResolution, 'target'>> & { target?: Partial<NonNullable<NfcResolution['target']>> | null };

function resolution(overrides: Overrides): NfcResolution {
  const { target, ...rest } = overrides;
  return {
    status: 'claimed',
    owned_by_me: false,
    can_claim: false,
    target:
      target === null
        ? null
        : {
            type: 'legacy_plate',
            title: 'Medio Maratón CDMX',
            subtitle: null,
            image_url: null,
            web_url: 'https://finisherlegacy.com/@ana',
            profile_username: 'ana',
            event_slug: null,
            ...target,
          },
    ...rest,
  };
}

describe('nfcInAppHref', () => {
  it('opens the athlete legacy for a claimed Legacy Plate', () => {
    expect(nfcInAppHref(resolution({}), true)).toBe('/athlete/ana');
  });

  it('opens the event for an event tag', () => {
    expect(nfcInAppHref(resolution({ target: { type: 'event', event_slug: 'maraton-cdmx', profile_username: null } }), true)).toBe('/events/maraton-cdmx');
  });

  it('sends my own connected product to Mi equipo', () => {
    expect(nfcInAppHref(resolution({ owned_by_me: true, target: { type: 'product' } }), true)).toBe('/gear');
  });

  it('never navigates without a session, for unclaimed/disabled tags, or without a target', () => {
    expect(nfcInAppHref(resolution({}), false)).toBeNull();
    expect(nfcInAppHref(resolution({ status: 'unclaimed' }), true)).toBeNull();
    expect(nfcInAppHref(resolution({ status: 'disabled' }), true)).toBeNull();
    expect(nfcInAppHref(resolution({ target: null }), true)).toBeNull();
    expect(nfcInAppHref(resolution({ target: { type: 'product', profile_username: null } }), true)).toBeNull();
  });
});
