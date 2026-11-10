import {
  classifyFlUrl,
  extractFlTagCode,
  formatActivationCode,
  isAllowedWriteUrl,
  isCompleteActivationCode,
  normalizeActivationCode,
  parseHttpUrl,
  resolveWebOrigin,
} from './url-policy';

const origin = resolveWebOrigin('https://finisherlegacy.com');
const CODE = 'ABCDEFGHJKMN';

describe('resolveWebOrigin', () => {
  it('defaults to production', () => {
    expect(resolveWebOrigin(undefined)).toEqual({ scheme: 'https', host: 'finisherlegacy.com' });
  });
  it('keeps staging host and port', () => {
    expect(resolveWebOrigin('http://192.168.1.10:8000/')).toEqual({ scheme: 'http', host: '192.168.1.10:8000' });
  });
  it('falls back on garbage', () => {
    expect(resolveWebOrigin('not a url')).toEqual({ scheme: 'https', host: 'finisherlegacy.com' });
  });
});

describe('isAllowedWriteUrl', () => {
  it('accepts exactly https://<web host>/t/{code}', () => {
    expect(isAllowedWriteUrl(`https://finisherlegacy.com/t/${CODE}`, CODE, origin)).toBe(true);
    expect(isAllowedWriteUrl(`https://finisherlegacy.com/t/${CODE}/`, CODE, origin)).toBe(true);
  });

  it.each([
    ['other host', `https://evil.com/t/${CODE}`],
    ['lookalike subdomain', `https://finisherlegacy.com.evil.com/t/${CODE}`],
    ['userinfo trick', `https://finisherlegacy.com@evil.com/t/${CODE}`],
    ['http downgrade', `http://finisherlegacy.com/t/${CODE}`],
    ['www host (not the configured one)', `https://www.finisherlegacy.com/t/${CODE}`],
    ['other port', `https://finisherlegacy.com:8443/t/${CODE}`],
    ['query', `https://finisherlegacy.com/t/${CODE}?next=https://evil.com`],
    ['fragment', `https://finisherlegacy.com/t/${CODE}#x`],
    ['other path', `https://finisherlegacy.com/n/${CODE}`],
    ['nested path', `https://finisherlegacy.com/t/${CODE}/edit`],
    ['code mismatch', 'https://finisherlegacy.com/t/ZZZZZZZZZZZZ'],
    ['ambiguous glyphs (even if the backend echoed them)', 'https://finisherlegacy.com/t/ABCDEFGH0OIL', 'ABCDEFGH0OIL'],
    ['whitespace', ` https://finisherlegacy.com/t/${CODE}`],
    ['backslash', `https://finisherlegacy.com\\@evil.com/t/${CODE}`],
    ['javascript scheme', 'javascript:alert(1)'],
    ['empty', ''],
  ] as [string, string, string?][])('rejects %s', (_label, url, tagCode = CODE) => {
    expect(isAllowedWriteUrl(url, tagCode, origin)).toBe(false);
  });

  it('compares the code ignoring dashes and case', () => {
    expect(isAllowedWriteUrl(`https://finisherlegacy.com/t/${CODE}`, 'abcd-efgh-jkmn', origin)).toBe(true);
  });

  it('respects a staging origin', () => {
    const staging = resolveWebOrigin('https://staging.finisherlegacy.com');
    expect(isAllowedWriteUrl(`https://staging.finisherlegacy.com/t/${CODE}`, CODE, staging)).toBe(true);
    expect(isAllowedWriteUrl(`https://finisherlegacy.com/t/${CODE}`, CODE, staging)).toBe(false);
  });
});

describe('extractFlTagCode / classifyFlUrl', () => {
  it('recognizes our tag URL, also with www and ?src=qr', () => {
    expect(extractFlTagCode(`https://finisherlegacy.com/t/${CODE}`, origin)).toBe(CODE);
    expect(extractFlTagCode(`https://www.finisherlegacy.com/t/${CODE}?src=qr`, origin)).toBe(CODE);
    expect(extractFlTagCode(`https://evil.com/t/${CODE}`, origin)).toBeNull();
  });

  it('routes older Finisher Legacy links', () => {
    expect(classifyFlUrl('https://finisherlegacy.com/n/tok_123', origin)).toEqual({ kind: 'nfc_token', token: 'tok_123' });
    expect(classifyFlUrl('https://finisherlegacy.com/l/q8k2mx7p', origin)).toEqual({ kind: 'legacy_code', code: 'Q8K2MX7P' });
    expect(classifyFlUrl('https://example.com/n/tok', origin)).toBeNull();
  });
});

describe('parseHttpUrl', () => {
  it('rejects non-ascii hosts (homograph)', () => {
    expect(parseHttpUrl('https://finisherlеgacy.com/t/ABCDEFGHJKMN')).toBeNull(); // Cyrillic "е"
  });
});

describe('activation code mask', () => {
  it('formats progressively as XXXX-XXXX-XXXX', () => {
    expect(formatActivationCode('ab')).toBe('AB');
    expect(formatActivationCode('abcde')).toBe('ABCD-E');
    expect(formatActivationCode('abcd efgh-jkmn')).toBe('ABCD-EFGH-JKMN');
    expect(formatActivationCode('ABCDEFGHJKMNPQ')).toBe('ABCD-EFGH-JKMN');
  });
  it('normalizes and checks completeness', () => {
    expect(normalizeActivationCode('abcd-efgh-jkmn')).toBe('ABCDEFGHJKMN');
    expect(isCompleteActivationCode('ABCD-EFGH-JKM')).toBe(false);
    expect(isCompleteActivationCode('ABCD-EFGH-JKMN')).toBe(true);
  });
});
