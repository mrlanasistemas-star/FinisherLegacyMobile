import { notificationDestination } from './notification-href';

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
});
