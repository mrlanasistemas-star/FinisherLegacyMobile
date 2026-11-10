/**
 * Tests for the Entrenamientos zod contract: valid payloads, tolerant
 * fallbacks (unknown icon, missing sender) and rejected envelopes.
 */
import {
  createTrainingLinkSchema,
  isLinkActive,
  isProcessing,
  parseTrainingLink,
  parseTrainingLinks,
  parseTrainingMessagesPage,
} from '@/schemas/training';

const message = {
  uuid: 'm-1',
  sender_name: 'Mamá',
  relationship: 'Mamá',
  body: '¡Tú puedes, hija!',
  icon: 'heart',
  audio_url: 'http://localhost:8000/storage/a.m4a?signature=x',
  duration_seconds: 12,
  listened_at: null,
  favorite: false,
  created_at: '2026-11-01T09:00:00Z',
  link: { uuid: 'l-1', title: 'Maratón CDMX' },
};

const meta = { current_page: 1, last_page: 2, total: 21, unheard_count: 4 };

describe('parseTrainingMessagesPage', () => {
  it('parses a valid page', () => {
    const page = parseTrainingMessagesPage({ data: [message], meta });
    expect(page.meta).toEqual(meta);
    expect(page.data[0]).toMatchObject({ uuid: 'm-1', icon: 'heart', duration_seconds: 12, link: { uuid: 'l-1' } });
  });

  it('falls back on unknown icon, blank text and missing optional fields', () => {
    const page = parseTrainingMessagesPage({
      data: [{ ...message, icon: 'unicorn', body: '   ', audio_url: null, relationship: undefined, link: undefined, duration_seconds: '7' }],
      meta,
    });
    expect(page.data[0]).toMatchObject({ icon: 'heart', body: null, audio_url: null, relationship: null, link: null, duration_seconds: 7 });
  });

  it('drops malformed rows but keeps the rest', () => {
    const page = parseTrainingMessagesPage({ data: [message, { uuid: 'broken' }, 'nope'], meta });
    expect(page.data.map((m) => m.uuid)).toEqual(['m-1']);
  });

  it('defaults unheard_count and rejects a bad envelope', () => {
    const page = parseTrainingMessagesPage({ data: [], meta: { current_page: 1, last_page: 1, total: 0 } });
    expect(page.meta.unheard_count).toBe(0);
    expect(() => parseTrainingMessagesPage({ data: [] })).toThrow();
    expect(() => parseTrainingMessagesPage({ data: {}, meta })).toThrow();
  });
});

describe('links', () => {
  const link = {
    uuid: 'l-1',
    title: 'Maratón CDMX',
    url: 'http://localhost:8000/animo/abc',
    expires_at: null,
    revoked_at: null,
    messages_count: 3,
  };

  it('parses the list and the single envelope', () => {
    expect(parseTrainingLinks({ data: [link, { uuid: 'x' }] })).toHaveLength(1);
    expect(parseTrainingLink({ data: link }).messages_count).toBe(3);
    expect(() => parseTrainingLink({ data: { ...link, url: 'not a url' } })).toThrow();
  });

  it('knows when a link is active', () => {
    const now = Date.parse('2026-11-10T00:00:00Z');
    expect(isLinkActive(link, now)).toBe(true);
    expect(isLinkActive({ ...link, revoked_at: '2026-11-09T00:00:00Z' }, now)).toBe(false);
    expect(isLinkActive({ ...link, expires_at: '2026-11-09T00:00:00Z' }, now)).toBe(false);
    expect(isLinkActive({ ...link, expires_at: '2026-12-01T00:00:00Z' }, now)).toBe(true);
  });

  it('validates the create form', () => {
    expect(createTrainingLinkSchema.safeParse({ title: 'Ironman', expires_in_days: 30 }).success).toBe(true);
    expect(createTrainingLinkSchema.safeParse({ title: 'Ironman', expires_in_days: null }).success).toBe(true);
    expect(createTrainingLinkSchema.safeParse({ title: 'I', expires_in_days: 7 }).success).toBe(false);
    expect(createTrainingLinkSchema.safeParse({ title: 'Ironman', expires_in_days: 5 }).success).toBe(false);
  });
});

describe('isProcessing', () => {
  it('is a voice note without audio yet, not a text-only message', () => {
    expect(isProcessing({ audio_url: null, duration_seconds: 9 })).toBe(true);
    expect(isProcessing({ audio_url: null, duration_seconds: 0 })).toBe(false);
    expect(isProcessing({ audio_url: 'http://x/a.m4a', duration_seconds: 9 })).toBe(false);
  });
});
