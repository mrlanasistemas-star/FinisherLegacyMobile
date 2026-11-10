/**
 * Minimal NDEF codec for the one thing Finisher Legacy writes — a single
 * well-known URI record — plus a decoder for whatever is already on a chip
 * (so we can tell "blank", "ours" and "someone else's data" apart).
 *
 * Kept independent from `react-native-nfc-manager` so it is pure and
 * testable; the bytes are the standard NFC Forum RTD-URI encoding, exactly
 * what `Ndef.encodeMessage([Ndef.uriRecord(url)])` produces.
 */

/** Records as the native layer hands them back (Android may stringify `type`). */
export interface RawNdefRecord {
  tnf: number;
  type: number[] | string;
  payload: number[];
  id?: number[] | string;
}

const TNF_EMPTY = 0x00;
const TNF_WELL_KNOWN = 0x01;
const TNF_ABSOLUTE_URI = 0x03;
const RTD_URI = 0x55; // 'U'

/** NFC Forum URI RTD identifier codes (index = code). */
const URI_PREFIXES = [
  '',
  'http://www.',
  'https://www.',
  'http://',
  'https://',
  'tel:',
  'mailto:',
  'ftp://anonymous:anonymous@',
  'ftp://ftp.',
  'ftps://',
  'sftp://',
  'smb://',
  'nfs://',
  'ftp://',
  'dav://',
  'news:',
  'telnet://',
  'imap:',
  'rtsp://',
  'urn:',
  'pop:',
  'sip:',
  'sips:',
  'tftp:',
  'btspp://',
  'btl2cap://',
  'btgoep://',
  'tcpobex://',
  'irdaobex://',
  'file://',
  'urn:epc:id:',
  'urn:epc:tag:',
  'urn:epc:pat:',
  'urn:epc:raw:',
  'urn:epc:',
  'urn:nfc:',
] as const;

function asciiBytes(text: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code > 0x7e || code < 0x20) throw new Error('NDEF_URI_NOT_ASCII');
    bytes.push(code);
  }
  return bytes;
}

/** Tolerant UTF-8 decode (foreign chips may carry anything). */
export function utf8Decode(bytes: number[]): string {
  let out = '';
  let i = 0;
  while (i < bytes.length) {
    const b0 = bytes[i] & 0xff;
    let code: number;
    let extra: number;
    if (b0 < 0x80) {
      code = b0;
      extra = 0;
    } else if (b0 >= 0xc0 && b0 < 0xe0) {
      code = b0 & 0x1f;
      extra = 1;
    } else if (b0 >= 0xe0 && b0 < 0xf0) {
      code = b0 & 0x0f;
      extra = 2;
    } else if (b0 >= 0xf0 && b0 < 0xf8) {
      code = b0 & 0x07;
      extra = 3;
    } else {
      out += '�';
      i += 1;
      continue;
    }
    if (i + extra > bytes.length - 1 && extra > 0) {
      // Truncated multi-byte sequence at the end.
      out += '�';
      break;
    }
    for (let k = 1; k <= extra; k++) code = (code << 6) | (bytes[i + k] & 0x3f);
    out += code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff) ? '�' : String.fromCodePoint(code);
    i += extra + 1;
  }
  return out;
}

/**
 * Encodes `url` as a complete NDEF message with one short URI record.
 * Throws for non-ASCII input (our URLs never are) or a payload ≥ 256 bytes.
 */
export function encodeUriMessage(url: string): number[] {
  let prefixCode = 0;
  let rest = url;
  // Longest matching prefix wins (`https://www.` before `https://`).
  for (let code = 1; code < URI_PREFIXES.length; code++) {
    const prefix = URI_PREFIXES[code];
    if (url.startsWith(prefix) && prefix.length > (URI_PREFIXES[prefixCode]?.length ?? 0)) {
      prefixCode = code;
    }
  }
  rest = url.slice(URI_PREFIXES[prefixCode].length);

  const payload = [prefixCode, ...asciiBytes(rest)];
  if (payload.length > 255) throw new Error('NDEF_URI_TOO_LONG');

  // MB | ME | SR, TNF well-known.
  const header = 0x80 | 0x40 | 0x10 | TNF_WELL_KNOWN;
  return [header, 1, payload.length, RTD_URI, ...payload];
}

function typeBytes(type: RawNdefRecord['type']): number[] {
  if (Array.isArray(type)) return type.map((b) => b & 0xff);
  if (typeof type !== 'string') return [];
  // Some bridges return the type as a hex string ("55"), others as text ("U").
  if (type.length > 0 && type.length % 2 === 0 && /^[0-9a-f]+$/i.test(type)) {
    const out: number[] = [];
    for (let i = 0; i < type.length; i += 2) out.push(parseInt(type.slice(i, i + 2), 16));
    return out;
  }
  return Array.from(type).map((c) => c.charCodeAt(0) & 0xff);
}

/** The URI a record carries, or null if it is not a URI record. */
export function decodeUriRecord(record: RawNdefRecord): string | null {
  const type = typeBytes(record.type);
  const payload = Array.isArray(record.payload) ? record.payload : [];

  if (record.tnf === TNF_WELL_KNOWN && type.length === 1 && type[0] === RTD_URI) {
    if (payload.length === 0) return null;
    const prefix = URI_PREFIXES[payload[0] & 0xff] ?? '';
    return prefix + utf8Decode(payload.slice(1));
  }
  if (record.tnf === TNF_ABSOLUTE_URI) {
    return utf8Decode(type);
  }
  return null;
}

export function isEmptyRecord(record: RawNdefRecord): boolean {
  return record.tnf === TNF_EMPTY && (record.payload?.length ?? 0) === 0;
}

export type ForeignContentKind = 'link' | 'text' | 'other';

export interface TagContent {
  /** No records, or only empty (TNF 0) records — a blank chip. */
  blank: boolean;
  uris: string[];
  /** Records that are neither empty nor URI records. */
  otherRecords: number;
  /** For the overwrite warning: what kind of data is there. */
  foreignKind: ForeignContentKind | null;
  /** Host of the first non-Finisher-Legacy link, if any (shown to the user). */
  foreignHost: string | null;
}

/** Summarizes records already on the chip. `isOurs` recognizes our URLs. */
export function describeContent(records: RawNdefRecord[] | null | undefined, isOurs: (uri: string) => boolean): TagContent {
  const list = (records ?? []).filter((r) => !isEmptyRecord(r));
  const uris: string[] = [];
  let otherRecords = 0;
  let hasText = false;

  for (const record of list) {
    const uri = decodeUriRecord(record);
    if (uri !== null) {
      uris.push(uri);
      continue;
    }
    otherRecords += 1;
    if (record.tnf === TNF_WELL_KNOWN && typeBytes(record.type)[0] === 0x54) hasText = true; // 'T'
  }

  const foreignUris = uris.filter((u) => !isOurs(u));
  const foreign = foreignUris.length > 0 || otherRecords > 0;
  const foreignHost = foreignUris.length > 0 ? (foreignUris[0].match(/^[a-z][a-z0-9+.-]*:\/\/([^/?#:@]+)/i)?.[1] ?? null) : null;

  return {
    blank: list.length === 0,
    uris,
    otherRecords,
    foreignKind: !foreign ? null : foreignUris.length > 0 ? 'link' : hasText ? 'text' : 'other',
    foreignHost,
  };
}
