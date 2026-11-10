/**
 * What may be written to (and recognized on) a Finisher Legacy Tag — pure,
 * unit-tested, no React Native imports.
 *
 * The chip only ever carries `https://<web host>/t/{code}` (the backend's
 * `route('tag.open', $code)`). The app never builds that URL itself: it
 * writes exactly the `write_url` returned by `POST /tags/activation/start`,
 * and only after `isAllowedWriteUrl` accepts it. There is deliberately no
 * code path that writes any other URL.
 *
 * Parsing is done by hand on purpose — React Native's `URL` polyfill does
 * not implement `host`/`pathname` reliably, and a strict regex is easier to
 * reason about for a security check anyway.
 */

/** Same alphabet as the backend `TagCode::ALPHABET` (no 0/O/1/I/L). */
const TAG_CODE_ALPHABET = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]+$/;
/** Backend route constraint `[A-Za-z0-9-]{8,24}`. */
const TAG_PATH = /^\/t\/([A-Za-z0-9-]{8,24})\/?$/;

export const DEFAULT_WEB_ORIGIN = 'https://finisherlegacy.com';

export interface ParsedUrl {
  scheme: 'http' | 'https';
  /** Lower-cased host, including `:port` when present. */
  host: string;
  path: string;
  query: string;
  hash: string;
}

/**
 * Strict absolute http(s) URL parser. Rejects userinfo (`user@host`),
 * whitespace, backslashes and anything that is not plain ASCII — the
 * classic tricks for making a URL *look* like one host while opening
 * another.
 */
export function parseHttpUrl(raw: string): ParsedUrl | null {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 512) return null;
  if (/[^\x21-\x7e]/.test(raw) || raw.includes('\\')) return null;

  const match = raw.match(/^(https?):\/\/([^/?#]+)(\/[^?#]*)?(\?[^#]*)?(#.*)?$/i);
  if (!match) return null;

  const host = match[2].toLowerCase();
  if (host.includes('@')) return null;
  if (!/^[a-z0-9.-]+(:\d{1,5})?$/.test(host)) return null;

  return {
    scheme: match[1].toLowerCase() as 'http' | 'https',
    host,
    path: match[3] ?? '/',
    query: match[4] ?? '',
    hash: match[5] ?? '',
  };
}

export interface WebOrigin {
  scheme: 'http' | 'https';
  host: string;
}

/** `EXPO_PUBLIC_WEB_URL` (or the production default) as scheme + host. */
export function resolveWebOrigin(raw: string | undefined | null): WebOrigin {
  const parsed = parseHttpUrl((raw || DEFAULT_WEB_ORIGIN).replace(/\/+$/, ''));
  if (!parsed) {
    const fallback = parseHttpUrl(DEFAULT_WEB_ORIGIN)!;
    return { scheme: fallback.scheme, host: fallback.host };
  }
  return { scheme: parsed.scheme, host: parsed.host };
}

/** Canonical tag code: upper-case, dashes/spaces removed (mirrors `TagCode::normalize`, minus the URL/FL-prefix forgiveness). */
export function normalizeTagCode(code: string): string {
  return code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

/**
 * The single gate before any NFC write. True only when `url`:
 *  - parses as an absolute URL with the web origin's exact scheme and host
 *    (and port), no userinfo, no query, no fragment;
 *  - has the path `/t/{code}` and that code equals the `tag_code` the
 *    backend returned in the same `start` response.
 */
export function isAllowedWriteUrl(url: string, tagCode: string, origin: WebOrigin): boolean {
  const parsed = parseHttpUrl(url);
  if (!parsed) return false;
  if (parsed.scheme !== origin.scheme || parsed.host !== origin.host) return false;
  if (parsed.query !== '' || parsed.hash !== '') return false;

  const path = parsed.path.match(TAG_PATH);
  if (!path) return false;

  const inUrl = normalizeTagCode(path[1]);
  const expected = normalizeTagCode(tagCode);
  return inUrl.length >= 8 && inUrl === expected && TAG_CODE_ALPHABET.test(inUrl);
}

/**
 * Recognizes a URL already on a chip as one of ours and returns its tag
 * code. More lenient than the write gate: accepts `www.` and an old
 * `?src=qr` query, because this only decides where to *navigate*, never
 * what to write.
 */
export function extractFlTagCode(url: string, origin: WebOrigin): string | null {
  const parsed = parseHttpUrl(url.trim());
  if (!parsed) return null;
  const host = parsed.host.replace(/^www\./, '');
  if (host !== origin.host.replace(/^www\./, '')) return null;
  const path = parsed.path.match(TAG_PATH);
  if (!path) return null;
  const code = normalizeTagCode(path[1]);
  return code.length >= 8 && TAG_CODE_ALPHABET.test(code) ? code : null;
}

/** Same comparison the verifier uses: exact string match after trimming. */
export function sameUrl(a: string, b: string): boolean {
  return a.trim() === b.trim();
}

/**
 * Other Finisher Legacy URLs a chip may carry from earlier generations —
 * used by the read-only scanner to route to the existing screens.
 */
export type FlLink =
  | { kind: 'tag'; code: string }
  | { kind: 'nfc_token'; token: string }
  | { kind: 'legacy_code'; code: string };

export function classifyFlUrl(url: string, origin: WebOrigin): FlLink | null {
  const tag = extractFlTagCode(url, origin);
  if (tag) return { kind: 'tag', code: tag };

  const parsed = parseHttpUrl(url.trim());
  if (!parsed || parsed.host.replace(/^www\./, '') !== origin.host.replace(/^www\./, '')) return null;

  const nfc = parsed.path.match(/^\/(?:n|nfc)\/([A-Za-z0-9_-]{4,64})\/?$/);
  if (nfc) return { kind: 'nfc_token', token: nfc[1] };

  const legacy = parsed.path.match(/^\/l\/([A-Za-z0-9]{4,16})\/?$/);
  if (legacy) return { kind: 'legacy_code', code: legacy[1].toUpperCase() };

  return null;
}

// ── Activation code (printed on the card inside the packaging) ──────────────

export const ACTIVATION_CODE_LENGTH = 12;

/** Keeps only code characters, upper-cased, capped at 12. */
export function normalizeActivationCode(input: string): string {
  return input
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase()
    .slice(0, ACTIVATION_CODE_LENGTH);
}

/** Input mask `XXXX-XXXX-XXXX` (partial input renders partially: `AB`, `ABCD-E`). */
export function formatActivationCode(input: string): string {
  const raw = normalizeActivationCode(input);
  return (raw.match(/.{1,4}/g) ?? []).join('-');
}

export function isCompleteActivationCode(input: string): boolean {
  return normalizeActivationCode(input).length === ACTIVATION_CODE_LENGTH;
}
