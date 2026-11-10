/**
 * Maps any incoming link to an in-app path (pure, unit-tested):
 *
 *   finisherlegacy://athlete/ana           → /athlete/ana
 *   finisherlegacy://moments/<uuid>        → /moments/<uuid>
 *   finisherlegacy://nfc/<token>           → /nfc/<token>
 *   finisherlegacy://training              → /training      (Entrenamientos; push "nuevo mensaje de ánimo")
 *   finisherlegacy://stories/<publicId>    → /stories/<publicId> (a story; also …/edit and …/media)
 *   https://finisherlegacy.com/@ana        → /athlete/ana
 *   https://finisherlegacy.com/moments/<u> → /moments/<u>
 *   https://finisherlegacy.com/events/<s>  → /events/<s>
 *   https://finisherlegacy.com/n/<token>   → /nfc/<token>   (legacy plate NFC tap)
 *   https://finisherlegacy.com/t/<code>    → /nfc/t/<code>  (Finisher Legacy Tag NFC tap)
 *   https://finisherlegacy.com/reset-password/<token>?email=… → /reset-password?token=…&email=…
 *   finisherlegacy://checkout/return?order=<uuid> → /orders/<uuid> (OpenPay in-app checkout closed;
 *                                            +native-intent stays put instead while the checkout screen waits)
 *   …/stripe-redirect                      → null (old Stripe builds' 3-D Secure return; stay put)
 *
 * Push-campaign destinations (backend `CampaignDestination`: the push carries
 * the `finisherlegacy://…` deep link, the inbox row the same screen's web path):
 *
 *   finisherlegacy://home                | /                     → /        (Inicio tab)
 *   finisherlegacy://store               | /tienda, /colecciones → /store   (Colecciones tab)
 *   finisherlegacy://collections/<slug>  | /colecciones/<slug>   → /store/collection/<slug>
 *   finisherlegacy://products/<slug>     | /tienda/<slug>        → /store/<slug>
 *   finisherlegacy://events/<slug>       | /events/<slug>        → /events/<slug>
 *   finisherlegacy://my-legacy           | /mi-legacy            → /legacy  (Recuerdos tab)
 *   finisherlegacy://training            | /mi-entrenamiento     → /training
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

  // OpenPay in-app checkout return. Carries no payment result on purpose —
  // the order screen re-reads the real status from the API.
  const checkoutReturn = path.match(/^\/checkout\/return\/?(?:\?(.*))?$/);
  if (checkoutReturn) {
    const order = new URLSearchParams(checkoutReturn[1] ?? '').get('order');
    return order && /^[0-9a-f-]{36}$/i.test(order) ? `/orders/${order}` : '/orders';
  }

  const handle = path.match(/^\/@([A-Za-z0-9_.]+)\/?(\?.*)?$/);
  if (handle) return `/athlete/${handle[1]}`;

  // The reset email links to the web form `/reset-password/{token}?email=…`.
  const reset = path.match(/^\/reset-password\/([^/?]+)(?:\?(.*))?$/);
  if (reset) {
    const query = new URLSearchParams(reset[2] ?? '');
    query.set('token', reset[1]);
    return `/reset-password?${query.toString()}`;
  }

  // Finisher Legacy Tag URL written at activation: `/t/{code}` → `/nfc/t/{code}`.
  const tag = path.match(/^\/t\/([A-Za-z0-9-]{8,24})\/?(?:\?.*)?$/);
  if (tag) return `/nfc/t/${tag[1]}`;

  // NFC tag URL written on the product: `/n/{token}` (web) → `/nfc/{token}` (app).
  const nfc = path.match(/^\/(?:n|nfc)\/([A-Za-z0-9_-]+)\/?(?:\?.*)?$/);
  if (nfc) return `/nfc/${nfc[1]}`;

  const campaign = campaignPath(path);
  if (campaign) return campaign;

  if (/^\/(athlete|moments|events|store|orders|medals|legacy|gear|my-events|notifications|explore|search|training|stories)(\/|$|\?)/.test(path)) return path;

  return raw;
}

/** Push-campaign destinations → real routes (see the table above). */
function campaignPath(path: string): string | null {
  const clean = path.replace(/[?#].*$/, '').replace(/\/+$/, '');

  if (clean === '' || clean === '/home') return '/';
  if (clean === '/tienda' || clean === '/tienda/catalogo' || clean === '/colecciones' || clean === '/collections') return '/store';
  if (clean === '/my-legacy' || clean === '/mi-legacy') return '/legacy';
  if (clean === '/mi-entrenamiento') return '/training';

  const collection = clean.match(/^\/(?:collections|colecciones)\/([^/]+)$/);
  if (collection) return `/store/collection/${collection[1]}`;

  // `/tienda/catalogo` and `/tienda/categoria/…` are web-only listings, not products.
  const product = clean.match(/^\/products\/([^/]+)$/) ?? clean.match(/^\/tienda\/(?!catalogo$|categoria$)([^/]+)$/);
  if (product) return `/store/${product[1]}`;

  return null;
}
