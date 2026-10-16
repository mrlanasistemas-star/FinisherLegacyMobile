import { mapIncomingPath } from '@/features/links/map-incoming-path';
import type { NotificationTarget } from '@/types/models';

export type NotificationDestination = { kind: 'app'; href: string } | { kind: 'external'; url: string } | null;

/**
 * Where tapping a notification goes — same rule for the in-app list and a
 * push tap (pure, unit-tested). Structured `target` first, then
 * `action_url` mapped to an in-app path, then the web as a last resort.
 *
 * Push payloads are expected as Expo `data: {notification_id?, type?,
 * target?, action_url?}` — the backend's Expo provider sends the same
 * fields the `/me/notifications` resource exposes.
 */
export function notificationDestination(input: { target?: NotificationTarget | null; action_url?: string | null; url?: string | null }): NotificationDestination {
  const target = input.target;
  if (target?.kind === 'athlete' && target.username) return { kind: 'app', href: `/athlete/${target.username}` };
  if (target?.kind === 'moment' && target.moment_uuid) return { kind: 'app', href: `/moments/${target.moment_uuid}` };
  if (target?.kind === 'order' && target.order_uuid) return { kind: 'app', href: `/orders/${target.order_uuid}` };
  if (target?.kind === 'event' && target.event_slug) return { kind: 'app', href: `/events/${target.event_slug}` };

  const url = input.action_url ?? input.url ?? null;
  if (!url) return null;

  const mapped = mapIncomingPath(url);
  if (mapped && mapped.startsWith('/')) return { kind: 'app', href: mapped };
  if (/^https?:\/\//i.test(url)) return { kind: 'external', url };
  return null;
}
