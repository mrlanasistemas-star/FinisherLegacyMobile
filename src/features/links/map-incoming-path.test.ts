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

  it('ignores stale Stripe 3-D Secure returns from old builds', () => {
    expect(mapIncomingPath('finisherlegacy://stripe-redirect?payment_intent=pi_1')).toBeNull();
  });

  it('sends the OpenPay checkout return to the order, never trusting it as a result', () => {
    const uuid = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
    expect(mapIncomingPath(`finisherlegacy://checkout/return?order=${uuid}`)).toBe(`/orders/${uuid}`);
    expect(mapIncomingPath(`finisherlegacy://checkout/return?order=${uuid}&status=paid`)).toBe(`/orders/${uuid}`);
    expect(mapIncomingPath('finisherlegacy://checkout/return?order=../../etc')).toBe('/orders');
    expect(mapIncomingPath('finisherlegacy://checkout/return')).toBe('/orders');
  });

  it('turns the reset email link into the in-app reset screen', () => {
    expect(mapIncomingPath('https://finisherlegacy.com/reset-password/abc123?email=ana%40mail.com')).toBe(
      '/reset-password?email=ana%40mail.com&token=abc123',
    );
  });

  it('routes NFC taps (universal link and app scheme) to the NFC screen', () => {
    expect(mapIncomingPath('https://finisherlegacy.com/n/Zx9_aB-12cd')).toBe('/nfc/Zx9_aB-12cd');
    expect(mapIncomingPath('https://staging.finisherlegacy.com/n/abc123/')).toBe('/nfc/abc123');
    expect(mapIncomingPath('finisherlegacy://nfc/abc123')).toBe('/nfc/abc123');
    expect(mapIncomingPath('/n/abc123?utm=tag')).toBe('/nfc/abc123');
  });

  it('passes unknown paths through untouched', () => {
    expect(mapIncomingPath('/legacy/ABC123')).toBe('/legacy/ABC123');
    expect(mapIncomingPath('/something-else')).toBe('/something-else');
  });
});
