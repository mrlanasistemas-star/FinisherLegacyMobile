import { campaignOpenId, isFinisherLegacyWebUrl, notificationDestination } from './notification-href';

describe('notificationDestination', () => {
  it('prefers the structured target', () => {
    expect(notificationDestination({ target: { kind: 'athlete', username: 'ana' }, action_url: 'https://x.test/y' })).toEqual({ kind: 'app', href: '/athlete/ana' });
    expect(notificationDestination({ target: { kind: 'moment', moment_uuid: 'm1' } })).toEqual({ kind: 'app', href: '/moments/m1' });
    expect(notificationDestination({ target: { kind: 'order', order_uuid: 'o1' } })).toEqual({ kind: 'app', href: '/orders/o1' });
    expect(notificationDestination({ target: { kind: 'event', event_slug: 'cdmx' } })).toEqual({ kind: 'app', href: '/events/cdmx' });
    expect(notificationDestination({ target: { kind: 'training' } })).toEqual({ kind: 'app', href: '/training' });
    expect(notificationDestination({ target: { type: 'training', uuid: 'm-1' } })).toEqual({ kind: 'app', href: '/training' });
    expect(notificationDestination({ metadata: { deep_link: 'finisherlegacy://training' } })).toEqual({ kind: 'app', href: '/training' });
    expect(notificationDestination({ action_url: 'finisherlegacy://training' })).toEqual({ kind: 'app', href: '/training' });
  });

  it('maps web URLs the app knows to native screens', () => {
    expect(notificationDestination({ action_url: 'https://finisherlegacy.com/@ana' })).toEqual({ kind: 'app', href: '/athlete/ana' });
    expect(notificationDestination({ url: 'https://finisherlegacy.com/n/tok123' })).toEqual({ kind: 'app', href: '/nfc/tok123' });
  });

  it('falls back to the browser for unknown web pages and ignores empty payloads', () => {
    expect(notificationDestination({ action_url: 'https://finisherlegacy.com/ayuda/pagos' })).toEqual({ kind: 'external', url: 'https://finisherlegacy.com/ayuda/pagos' });
    expect(notificationDestination({})).toBeNull();
  });

  it('routes the canonical push target shape {type, slug|uuid}', () => {
    expect(notificationDestination({ target: { type: 'athlete', slug: 'ana' } })).toEqual({ kind: 'app', href: '/athlete/ana' });
    expect(notificationDestination({ target: { type: 'moment', uuid: 'm1' } })).toEqual({ kind: 'app', href: '/moments/m1' });
    expect(notificationDestination({ target: { type: 'order', uuid: 'o1' } })).toEqual({ kind: 'app', href: '/orders/o1' });
    expect(notificationDestination({ target: { type: 'event', slug: 'cdmx', event_slug: 'cdmx' } })).toEqual({ kind: 'app', href: '/events/cdmx' });
    expect(notificationDestination({ target: { type: 'product', slug: 'tag-negro' } })).toEqual({ kind: 'app', href: '/store/tag-negro' });
  });

  const ORDER = '5b0e4c1e-2f7a-4d3b-9c55-0e6a2f1d7a10';

  it.each([
    ['order_paid', { target: { type: 'order', uuid: ORDER, kind: 'order', order_uuid: ORDER }, action_url: `/mis-pedidos/${ORDER}` }, `/orders/${ORDER}`],
    ['order_shipped (action_url only)', { action_url: `/mis-pedidos/${ORDER}` }, `/orders/${ORDER}`],
    ['order_delivered (absolute url)', { action_url: `https://finisherlegacy.com/mis-pedidos/${ORDER}` }, `/orders/${ORDER}`],
    ['order_refunded', { target: { kind: 'order', order_uuid: ORDER } }, `/orders/${ORDER}`],
    ['tag_activated', { action_url: '/t/ABCD1234EF' }, '/nfc/t/ABCD1234EF'],
    ['training_cheer', { target: { type: 'training', uuid: 'c1' }, action_url: 'https://finisherlegacy.com/entrenamientos' }, '/training'],
    ['new_follower', { target: { type: 'athlete', slug: 'ana', kind: 'athlete', username: 'ana' } }, '/athlete/ana'],
    ['moment_reaction', { target: { type: 'moment', uuid: 'm1' } }, '/moments/m1'],
    ['moment_comment', { target: { kind: 'moment', moment_uuid: 'm2' } }, '/moments/m2'],
    ['broadcast with app link', { action_url: '/store' }, '/store'],
  ] as const)('%s', (_type, input, href) => {
    expect(notificationDestination(input)).toEqual({ kind: 'app', href });
  });

  it.each([
    ['home', 'finisherlegacy://home', '/'],
    ['store', 'finisherlegacy://store', '/store'],
    ['collection', 'finisherlegacy://collections/edicion-maraton', '/store/collection/edicion-maraton'],
    ['product', 'finisherlegacy://products/tag-negro', '/store/tag-negro'],
    ['event', 'finisherlegacy://events/cdmx-2026', '/events/cdmx-2026'],
    ['training', 'finisherlegacy://training', '/training'],
    ['memories', 'finisherlegacy://my-legacy', '/legacy'],
    ['mappable https url', 'https://finisherlegacy.com/tienda/tag-negro', '/store/tag-negro'],
  ] as const)('campaign push → %s', (_name, deepLink, href) => {
    expect(notificationDestination({ type: 'campaign', campaign_id: 'c-1', deep_link: deepLink })).toEqual({ kind: 'app', href });
    expect(notificationDestination({ type: 'broadcast', deep_link: deepLink })).toEqual({ kind: 'app', href });
    // The backend also mirrors the deep link into `action_url`.
    expect(notificationDestination({ type: 'campaign', action_url: deepLink })).toEqual({ kind: 'app', href });
  });

  it('campaign deep_link wins over the web action_url and the target', () => {
    expect(
      notificationDestination({
        type: 'campaign',
        campaign_id: 'c-1',
        deep_link: 'finisherlegacy://collections/edicion-maraton',
        action_url: 'https://finisherlegacy.com/ayuda',
        target: { type: 'product', slug: 'tag-negro' },
      }),
    ).toEqual({ kind: 'app', href: '/store/collection/edicion-maraton' });
    expect(notificationDestination({ campaign_id: 'c-1', metadata: { deep_link: 'finisherlegacy://my-legacy' } })).toEqual({ kind: 'app', href: '/legacy' });
  });

  it('campaign inbox rows route by their web action_url', () => {
    expect(notificationDestination({ type: 'custom', action_url: '/colecciones/edicion-maraton' })).toEqual({ kind: 'app', href: '/store/collection/edicion-maraton' });
    expect(notificationDestination({ type: 'custom', action_url: '/tienda' })).toEqual({ kind: 'app', href: '/store' });
    expect(notificationDestination({ type: 'custom', action_url: '/mi-legacy' })).toEqual({ kind: 'app', href: '/legacy' });
    expect(notificationDestination({ type: 'custom', action_url: '/mi-entrenamiento' })).toEqual({ kind: 'app', href: '/training' });
    expect(notificationDestination({ type: 'custom', action_url: '/' })).toEqual({ kind: 'app', href: '/' });
  });

  it('opens unmapped finisherlegacy.com pages in the in-app browser', () => {
    const url = 'https://finisherlegacy.com/blog/maraton-cdmx';
    expect(notificationDestination({ type: 'campaign', campaign_id: 'c-1', deep_link: url })).toEqual({ kind: 'external', url });
    expect(notificationDestination({ type: 'campaign', deep_link: 'https://www.finisherlegacy.com/blog' })).toEqual({ kind: 'external', url: 'https://www.finisherlegacy.com/blog' });
  });

  it.each([
    'https://evil.test/store',
    'https://evil.test/blog',
    'http://finisherlegacy.com/blog',
    'https://finisherlegacy.com.evil.test/blog',
    'https://finisherlegacy.com@evil.test/blog',
    'https://finisherlegacy.com:443@evil.test/blog',
    'https://notfinisherlegacy.com/blog',
    'javascript:alert(1)',
    'otherapp://store',
  ])('never opens another host or scheme from a campaign: %s', (url) => {
    expect(notificationDestination({ type: 'campaign', campaign_id: 'c-1', deep_link: url })).toBeNull();
    expect(notificationDestination({ type: 'campaign', action_url: url })).toBeNull();
  });

  it('never opens a foreign host in the browser for any notification', () => {
    expect(notificationDestination({ action_url: 'https://evil.test/ayuda' })).toBeNull();
    expect(notificationDestination({ action_url: 'https://finisherlegacy.com@evil.test/ayuda' })).toBeNull();
    expect(isFinisherLegacyWebUrl('https://staging.finisherlegacy.com/x')).toBe(true);
    expect(isFinisherLegacyWebUrl('https://finisherlegacy.com')).toBe(true);
    expect(isFinisherLegacyWebUrl('http://finisherlegacy.com/x')).toBe(false);
  });

  it('falls back to target / action_url when a campaign deep_link is unusable', () => {
    expect(notificationDestination({ type: 'campaign', deep_link: 'https://evil.test/x', target: { type: 'event', slug: 'cdmx' } })).toEqual({ kind: 'app', href: '/events/cdmx' });
    expect(notificationDestination({ type: 'campaign', campaign_id: 'c-1' })).toBeNull();
  });

  describe('campaignOpenId', () => {
    it('reports the campaign id from a push', () => {
      expect(campaignOpenId({ type: 'campaign', campaign_id: 'c-uuid', notification_id: undefined })).toBe('c-uuid');
      expect(campaignOpenId({ campaign_id: 'c-uuid', notification_id: 'n-1' })).toBe('c-uuid');
      expect(campaignOpenId({ metadata: { campaign_uuid: 'c-uuid' }, id: 'n-1' })).toBe('c-uuid');
    });

    it('reports the notification id for broadcast inbox rows', () => {
      expect(campaignOpenId({ id: 'n-1', type: 'broadcast' })).toBe('n-1');
      expect(campaignOpenId({ id: 'n-2', type: 'custom' })).toBe('n-2');
      expect(campaignOpenId({ notification_id: 'n-3', type: 'broadcast' })).toBe('n-3');
    });

    it('reports nothing for ordinary notifications', () => {
      expect(campaignOpenId({ id: 'n-1', type: 'order_paid' })).toBeNull();
      expect(campaignOpenId({ id: 'n-1', type: null })).toBeNull();
      expect(campaignOpenId({ type: 'campaign' })).toBeNull();
    });
  });

  it('support replies and link-less broadcasts open the notification center (null)', () => {
    expect(notificationDestination({ target: { type: 'support', uuid: 's1' }, action_url: null })).toBeNull();
    expect(notificationDestination({ action_url: null })).toBeNull();
  });
});
