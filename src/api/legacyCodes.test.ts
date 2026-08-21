import { extractLegacyCode, normalizeManualCode } from './legacyCodes';

describe('extractLegacyCode', () => {
  it('extracts the code from the real physical QR URL format', () => {
    expect(extractLegacyCode('https://finisherlegacy.com/l/q8k2mx7p')).toBe('Q8K2MX7P');
  });

  it('extracts the code from the URL with a trailing slash', () => {
    expect(extractLegacyCode('https://finisherlegacy.com/l/Q8K2MX7P/')).toBe('Q8K2MX7P');
  });

  it('accepts a raw alphanumeric code', () => {
    expect(extractLegacyCode('q8k2mx7p')).toBe('Q8K2MX7P');
  });

  it('trims surrounding whitespace before matching', () => {
    expect(extractLegacyCode('  Q8K2MX7P  ')).toBe('Q8K2MX7P');
  });

  it('rejects an unrelated URL', () => {
    expect(extractLegacyCode('https://finisherlegacy.com/events/some-race')).toBeNull();
  });

  it('rejects a code that is too short', () => {
    expect(extractLegacyCode('AB')).toBeNull();
  });

  it('rejects garbage input', () => {
    expect(extractLegacyCode('not a legacy code!!')).toBeNull();
  });
});

describe('normalizeManualCode', () => {
  it('trims and uppercases', () => {
    expect(normalizeManualCode('  q8k2mx7p  ')).toBe('Q8K2MX7P');
  });
});
