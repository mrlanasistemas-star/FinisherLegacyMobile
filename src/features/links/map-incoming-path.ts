/**
 * Maps any incoming link to an in-app path (pure, unit-tested):
 *
 *   finisherlegacy://athlete/ana           → /athlete/ana
 *   finisherlegacy://moments/<uuid>        → /moments/<uuid>
 *   https://finisherlegacy.com/@ana        → /athlete/ana
 *   https://finisherlegacy.com/moments/<u> → /moments/<u>
 *   https://finisherlegacy.com/events/<s>  → /events/<s>
 *   https://finisherlegacy.com/reset-password/<token>?email=… → /reset-password?token=…&email=…
 *   …/stripe-redirect                      → null (Stripe handles it; stay put)
 *
 * Anything unknown passes through unchanged so Expo Router can resolve it.
 */
export function mapIncomingPath(raw: string): string | null {
  if (/stripe-redirect/i.test(raw)) return null;

  let path = raw;
  const withoutScheme = raw.replace(/^finisherlegacy:\/\/\/?/i, '/').replace(/^https?:\/\/(www\.)?finisherlegacy\.com/i, '');
  path = withoutScheme.startsWith('/') ? withoutScheme : `/${withoutScheme}`;

  const handle = path.match(/^\/@([A-Za-z0-9_.]+)\/?(\?.*)?$/);
  if (handle) return `/athlete/${handle[1]}`;

  // The reset email links to the web form `/reset-password/{token}?email=…`.
  const reset = path.match(/^\/reset-password\/([^/?]+)(?:\?(.*))?$/);
  if (reset) {
    const query = new URLSearchParams(reset[2] ?? '');
    query.set('token', reset[1]);
    return `/reset-password?${query.toString()}`;
  }

  if (/^\/(athlete|moments|events|store|orders|medals|legacy|gear|my-events|notifications)(\/|$|\?)/.test(path)) return path;

  return raw;
}
