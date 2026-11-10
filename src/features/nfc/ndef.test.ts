import { decodeUriRecord, describeContent, encodeUriMessage, utf8Decode, type RawNdefRecord } from './ndef';

function recordFromMessage(bytes: number[]): RawNdefRecord {
  // Single short record: [header, typeLen, payloadLen, ...type, ...payload]
  const typeLen = bytes[1];
  const payloadLen = bytes[2];
  return { tnf: bytes[0] & 0x07, type: bytes.slice(3, 3 + typeLen), payload: bytes.slice(3 + typeLen, 3 + typeLen + payloadLen) };
}

describe('encodeUriMessage', () => {
  it('encodes a single short well-known URI record with the https:// prefix code', () => {
    const bytes = encodeUriMessage('https://finisherlegacy.com/t/ABCDEFGHJKMN');
    expect(bytes[0]).toBe(0xd1); // MB|ME|SR|TNF=1
    expect(bytes[1]).toBe(1);
    expect(bytes[3]).toBe(0x55); // 'U'
    expect(bytes[4]).toBe(0x04); // https://
    expect(bytes[2]).toBe(bytes.length - 4);
    // Fits comfortably in an NTAG213 (137 bytes user memory).
    expect(bytes.length).toBeLessThan(60);
  });

  it('round-trips through the decoder', () => {
    const url = 'https://finisherlegacy.com/t/ABCDEFGHJKMN';
    expect(decodeUriRecord(recordFromMessage(encodeUriMessage(url)))).toBe(url);
  });

  it('prefers the longest prefix', () => {
    expect(encodeUriMessage('https://www.example.com')[4]).toBe(0x02);
  });

  it('rejects non-ascii', () => {
    expect(() => encodeUriMessage('https://finisherlegacy.com/t/ÁBC')).toThrow();
  });
});

describe('decodeUriRecord', () => {
  it('accepts a type given as text or hex', () => {
    const payload = [0x04, ...Array.from('a.com').map((c) => c.charCodeAt(0))];
    expect(decodeUriRecord({ tnf: 1, type: 'U', payload })).toBe('https://a.com');
    expect(decodeUriRecord({ tnf: 1, type: '55', payload })).toBe('https://a.com');
  });
  it('reads absolute-URI records', () => {
    expect(decodeUriRecord({ tnf: 3, type: Array.from('https://x.io').map((c) => c.charCodeAt(0)), payload: [] })).toBe('https://x.io');
  });
  it('ignores non-URI records', () => {
    expect(decodeUriRecord({ tnf: 1, type: 'T', payload: [2, 101, 110, 104, 105] })).toBeNull();
  });
});

describe('describeContent', () => {
  const ours = (u: string) => u.startsWith('https://finisherlegacy.com/t/');
  const uri = (u: string): RawNdefRecord => recordFromMessage(encodeUriMessage(u));

  it('treats no records and empty records as blank', () => {
    expect(describeContent([], ours).blank).toBe(true);
    expect(describeContent(undefined, ours).blank).toBe(true);
    expect(describeContent([{ tnf: 0, type: [], payload: [] }], ours)).toMatchObject({ blank: true, foreignKind: null });
  });
  it('flags a foreign link with its host', () => {
    expect(describeContent([uri('https://example.com/x')], ours)).toMatchObject({ blank: false, foreignKind: 'link', foreignHost: 'example.com' });
  });
  it('flags text records', () => {
    expect(describeContent([{ tnf: 1, type: 'T', payload: [2, 101, 110, 104, 105] }], ours).foreignKind).toBe('text');
  });
  it('does not flag our own URL as foreign', () => {
    expect(describeContent([uri('https://finisherlegacy.com/t/ABCDEFGHJKMN')], ours)).toMatchObject({ blank: false, foreignKind: null, uris: ['https://finisherlegacy.com/t/ABCDEFGHJKMN'] });
  });
});

describe('utf8Decode', () => {
  it('decodes multibyte and tolerates truncation', () => {
    expect(utf8Decode([0xc3, 0xa1])).toBe('á');
    expect(utf8Decode([0x61, 0xe2, 0x82])).toBe('a�');
  });
});
