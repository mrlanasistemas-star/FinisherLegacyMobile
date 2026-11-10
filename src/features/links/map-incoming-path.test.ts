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

  it('maps push-campaign deep links to real routes', () => {
    expect(mapIncomingPath('finisherlegacy://home')).toBe('/');
    expect(mapIncomingPath('finisherlegacy://store')).toBe('/store');
    expect(mapIncomingPath('finisherlegacy://collections/edicion-maraton')).toBe('/store/collection/edicion-maraton');
    expect(mapIncomingPath('finisherlegacy://products/tag-negro')).toBe('/store/tag-negro');
    expect(mapIncomingPath('finisherlegacy://events/cdmx-2026')).toBe('/events/cdmx-2026');
    expect(mapIncomingPath('finisherlegacy://training')).toBe('/training');
    expect(mapIncomingPath('finisherlegacy://my-legacy')).toBe('/legacy');
  });

  it('maps the same campaign screens from their web paths (inbox action_url, https links)', () => {
    expect(mapIncomingPath('/')).toBe('/');
    expect(mapIncomingPath('https://finisherlegacy.com')).toBe('/');
    expect(mapIncomingPath('https://finisherlegacy.com/?utm_source=push')).toBe('/');
    expect(mapIncomingPath('/tienda')).toBe('/store');
    expect(mapIncomingPath('https://finisherlegacy.com/tienda/catalogo')).toBe('/store');
    expect(mapIncomingPath('/colecciones')).toBe('/store');
    expect(mapIncomingPath('/colecciones/edicion-maraton')).toBe('/store/collection/edicion-maraton');
    expect(mapIncomingPath('https://finisherlegacy.com/tienda/tag-negro?utm=push')).toBe('/store/tag-negro');
    expect(mapIncomingPath('https://finisherlegacy.com/products/tag-negro/')).toBe('/store/tag-negro');
    expect(mapIncomingPath('/mi-legacy')).toBe('/legacy');
    expect(mapIncomingPath('/mi-entrenamiento')).toBe('/training');
  });

  it('leaves web-only store listings and deeper web pages unmapped', () => {
    expect(mapIncomingPath('https://finisherlegacy.com/tienda/categoria/tags')).toBe('https://finisherlegacy.com/tienda/categoria/tags');
    expect(mapIncomingPath('https://finisherlegacy.com/mi-legacy/abc/ampliar-fotos')).toBe('https://finisherlegacy.com/mi-legacy/abc/ampliar-fotos');
    expect(mapIncomingPath('finisherlegacy://collections/a/b')).toBe('finisherlegacy://collections/a/b');
  });

  it('passes unknown paths through untouched', () => {
    expect(mapIncomingPath('/legacy/ABC123')).toBe('/legacy/ABC123');
    expect(mapIncomingPath('/something-else')).toBe('/something-else');
  });
});
