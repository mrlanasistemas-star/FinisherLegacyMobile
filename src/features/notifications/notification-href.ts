import { mapIncomingPath } from '@/features/links/map-incoming-path';
import type { NotificationTarget } from '@/types/models';

export type NotificationDestination = { kind: 'app'; href: string } | { kind: 'external'; url: string } | null;

export interface NotificationRoutingInput {
  /** `campaign` (push) / `broadcast` route through `deep_link` first. */
  type?: string | null;
  /** Push campaigns: `data.campaign_id` (the campaign uuid). */
  campaign_id?: string | null;
  target?: NotificationTarget | null;
  action_url?: string | null;
  url?: string | null;
  /** Campaign pushes carry `deep_link`; `training_cheer` pushes carry `metadata.deep_link` (finisherlegacy://training). */
  deep_link?: string | null;
  metadata?: { deep_link?: string | null; campaign_uuid?: string | null } | null;
}

/** Admin push campaigns: the push is `campaign`; the web/legacy name is `broadcast`. */
const CAMPAIGN_TYPES = new Set(['campaign', 'broadcast']);
/** Inbox rows a campaign may have written (`custom` is what the backend stores today). */
const CAMPAIGN_INBOX_TYPES = new Set(['campaign', 'broadcast', 'custom']);

/**
 * The only web pages the app ever opens in the in-app browser: https on
 * finisherlegacy.com or a subdomain (same rule as the backend
 * `CampaignDestination::isAllowedUrl`). Userinfo tricks
 * (`https://finisherlegacy.com@evil.test`) do not match.
 */
export function isFinisherLegacyWebUrl(url: string): boolean {
  const host = url.match(/^https:\/\/([a-z0-9.-]+)(?::\d+)?(?:[/?#]|$)/i)?.[1]?.toLowerCase();
  return host !== undefined && (host === 'finisherlegacy.com' || host.endsWith('.finisherlegacy.com'));
}

/**
 * Where tapping a notification goes — same rule for the in-app list and a
 * push tap (pure, unit-tested). Structured `target` first, then
 * `action_url` mapped to an in-app path, then the web as a last resort.
 *
 * Push campaigns (`type: campaign | broadcast`, or any payload with a
 * `campaign_id`) resolve through `deep_link` first — `finisherlegacy://…`
 * or an `https://finisherlegacy.com/…` URL — and fall back to the rule above.
 *
 * `target` comes in two shapes and both are accepted:
 *  - canonical (push `data.target` and the API): `{type, id?, uuid?, slug?, event_slug?}`;
 *  - legacy (older API rows): `{kind, username?, moment_uuid?, order_uuid?, event_slug?}`.
 *
 * Web pages the app cannot map open in the in-app browser, and only on
 * finisherlegacy.com: a link to any other host is never opened.
 *
 * Types without an app screen (support replies, broadcasts without a link)
 * resolve to null → the caller opens the notification center.
 */
export function notificationDestination(input: NotificationRoutingInput): NotificationDestination {
  const campaign = isCampaign(input);

  if (campaign) {
    const deepLink = input.deep_link ?? input.metadata?.deep_link ?? null;
    const fromDeepLink = deepLink ? urlDestination(deepLink, true) : null;
    if (fromDeepLink) return fromDeepLink;
  }

  const fromTarget = targetHref(input.target);
  if (fromTarget) return { kind: 'app', href: fromTarget };

  const url = input.action_url ?? input.url ?? input.deep_link ?? input.metadata?.deep_link ?? null;
  return url ? urlDestination(url, campaign) : null;
}

/**
 * The id to report with `POST /notifications/{id}/opened` when this push or
 * inbox row is tapped, or null when it is not a campaign: the campaign uuid
 * when the payload carries one, else the notification-center id of a
 * broadcast row (the backend resolves the campaign from it and answers
 * `recorded: false` for anything else).
 */
export function campaignOpenId(input: {
  id?: string | null;
  notification_id?: string | null;
  type?: string | null;
  campaign_id?: string | null;
  metadata?: { campaign_uuid?: string | null } | null;
}): string | null {
  const campaignId = input.campaign_id ?? input.metadata?.campaign_uuid;
  if (campaignId) return String(campaignId);
  if (!CAMPAIGN_INBOX_TYPES.has(input.type ?? '')) return null;
  return input.id ?? input.notification_id ?? null;
}

function isCampaign(input: NotificationRoutingInput): boolean {
  return CAMPAIGN_TYPES.has(input.type ?? '') || Boolean(input.campaign_id);
}

/**
 * `strictHost` (campaigns): an absolute URL on a foreign host is dropped
 * outright instead of being matched by path. Other notifications keep
 * matching by path on any host, because their `action_url` carries whichever
 * APP_URL the backend runs on (staging, local) — but still never open it.
 */
function urlDestination(url: string, strictHost: boolean): NotificationDestination {
  const absolute = /^[a-z][a-z0-9+.-]*:\/\//i.test(url) && !/^finisherlegacy:\/\//i.test(url);
  if (absolute && strictHost && !isFinisherLegacyWebUrl(url)) return null;

  // Web order page (`/mis-pedidos/{uuid}`, order_* notifications) → native order screen.
  const webPath = url.replace(/^https?:\/\/[^/?#]+/i, '');
  const order = webPath.match(/^\/(?:mis-pedidos|store\/orders)\/([0-9a-f-]{36})\/?(?:[?#].*)?$/i);
  if (order) return { kind: 'app', href: `/orders/${order[1]}` };
  if (/^\/(?:mis-pedidos|store\/orders)\/?(?:[?#].*)?$/i.test(webPath)) return { kind: 'app', href: '/orders' };

  const mapped = mapIncomingPath(url);
  if (mapped && mapped.startsWith('/') && !mapped.startsWith('//')) return { kind: 'app', href: mapped };
  if (isFinisherLegacyWebUrl(url)) return { kind: 'external', url };
  return null;
}

function targetHref(target: NotificationTarget | null | undefined): string | null {
  if (!target) return null;
  const type = target.type ?? target.kind;

  switch (type) {
    case 'athlete': {
      const username = target.slug ?? target.username;
      return username ? `/athlete/${username}` : null;
    }
    case 'moment': {
      const uuid = target.uuid ?? target.moment_uuid;
      return uuid ? `/moments/${uuid}` : null;
    }
    case 'order': {
      const uuid = target.uuid ?? target.order_uuid;
      return uuid ? `/orders/${uuid}` : '/orders';
    }
    case 'event': {
      const slug = target.event_slug ?? target.slug;
      return slug ? `/events/${slug}` : null;
    }
    case 'product':
      return target.slug ? `/store/${target.slug}` : null;
    case 'training':
      return '/training';
    default:
      // support, legacy_plate, participant, tracking: no stable native
      // screen keyed by these ids → fall back to action_url.
      return null;
  }
}
