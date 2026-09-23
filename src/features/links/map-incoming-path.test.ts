import { mapIncomingPath } from './map-incoming-path';

describe('mapIncomingPath', () => {
  it('maps web profile handles to the athlete screen', () => {
    expect(mapIncomingPath('https://finisherlegacy.com/@ana.run')).toBe('/athlete/ana.run');
    expect(mapIncomingPath('/@ana')).toBe('/athlete/ana');
  });

  it('keeps app deep links routable', () => {
    expect(mapIncomingPath('finisherlegacy://athlete/ana')).toBe('/athlete/ana');
    expect(mapIncomingPath('finisherlegacy://moments/9b1d')).toBe('/moments/9b1d');
    expect(mapIncomingPath('https://finisherlegacy.com/events/medio-maraton')).toBe('/events/medio-maraton');
  });

  it('leaves Stripe returns alone (the SDK consumes them)', () => {
    expect(mapIncomingPath('finisherlegacy://stripe-redirect?payment_intent=pi_1')).toBeNull();
  });

  it('turns the reset email link into the in-app reset screen', () => {
    expect(mapIncomingPath('https://finisherlegacy.com/reset-password/abc123?email=ana%40mail.com')).toBe(
      '/reset-password?email=ana%40mail.com&token=abc123',
    );
  });

  it('passes unknown paths through untouched', () => {
    expect(mapIncomingPath('/legacy/ABC123')).toBe('/legacy/ABC123');
    expect(mapIncomingPath('/something-else')).toBe('/something-else');
  });
});
