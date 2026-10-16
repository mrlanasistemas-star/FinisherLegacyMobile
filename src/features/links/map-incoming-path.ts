/**
 * Maps any incoming link to an in-app path (pure, unit-tested):
 *
 *   finisherlegacy://athlete/ana           → /athlete/ana
 *   finisherlegacy://moments/<uuid>        → /moments/<uuid>
 *   finisherlegacy://nfc/<token>           → /nfc/<token>
 *   https://finisherlegacy.com/@ana        → /athlete/ana
 *   https://finisherlegacy.com/moments/<u> → /moments/<u>
 *   https://finisherlegacy.com/events/<s>  → /events/<s>
 *   https://finisherlegacy.com/n/<token>   → /nfc/<token>   (NFC tag tap — universal/app link)
 *   https://finisherlegacy.com/reset-password/<token>?email=… → /reset-password?token=…&email=…
 *   …/stripe-redirect                      → null (Stripe handles it; stay put)
 *
 * Anything unknown passes through unchanged so Expo Router can resolve it.
 */
export function mapIncomingPath(raw: string): string | null {
  if (/stripe-redirect/i.test(raw)) return null;

  // Any https host: the OS only hands the app links for its verified
  // associated domains (production, staging…), so the host needs no second
  // check here — and notification `action_url`s carry whichever APP_URL the
  // backend runs on.
  const withoutScheme = raw.replace(/^finisherlegacy:\/\/\/?/i, '/').replace(/^https?:\/\/[^/?#]+/i, '');
  const path = withoutScheme.startsWith('/') ? withoutScheme : `/${withoutScheme}`;

  const handle = path.match(/^\/@([A-Za-z0-9_.]+)\/?(\?.*)?$/);
  if (handle) return `/athlete/${handle[1]}`;

  // The reset email links to the web form `/reset-password/{token}?email=…`.
  const reset = path.match(/^\/reset-password\/([^/?]+)(?:\?(.*))?$/);
  if (reset) {
    const query = new URLSearchParams(reset[2] ?? '');
    query.set('token', reset[1]);
    return `/reset-password?${query.toString()}`;
  }

  // NFC tag URL written on the product: `/n/{token}` (web) → `/nfc/{token}` (app).
  const nfc = path.match(/^\/(?:n|nfc)\/([A-Za-z0-9_-]+)\/?(?:\?.*)?$/);
  if (nfc) return `/nfc/${nfc[1]}`;

  if (/^\/(athlete|moments|events|store|orders|medals|legacy|gear|my-events|notifications|explore|search)(\/|$|\?)/.test(path)) return path;

  return raw;
}
