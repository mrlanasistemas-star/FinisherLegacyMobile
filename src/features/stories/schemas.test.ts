/**
 * Contract tests of the story editor payloads (src/schemas/story.ts and
 * the `kind` / billing-period additions to the IAP offer): what a current
 * backend sends, what an older one omits, and what must be rejected.
 */

import { iapOfferSchema } from '@/schemas/iap';
import { editableStorySchema, mediaLimitDetailsSchema, mediaQuotaSchema, purchasedPhotoSchema, storyMediaResponseSchema, storyMediaSchema } from '@/schemas/story';

const story = {
  public_id: 'abc123def456',
  title: 'Mi primer maratón',
  event_name: 'Maratón de Veracruz',
  distance: '42K',
  result_time: '3:58:12',
  result_position: 412,
  bib_number: '1234',
  athlete_display_name: 'Ana Pérez',
  pace: '5:38 /km',
  category: 'Libre femenil',
  category_position: 31,
  gender_position: 88,
  race_date: '2026-03-08',
  location: 'Veracruz, Ver.',
  dedication: null,
  body: '',
  visibility: 'unlisted',
  share_url: 'https://finisherlegacy.com/s/abc123def456',
  official: { result_time: true, result_position: true, pace: false },
};

const bucket = { limit: 10, used: 3, remaining: 7, can_expand: true };

describe('editableStorySchema', () => {
  it('parses the full story and normalizes numbers / empty strings', () => {
    const parsed = editableStorySchema.parse(story);
    expect(parsed.result_position).toBe('412');
    expect(parsed.category_position).toBe('31');
    expect(parsed.body).toBeNull();
    expect(parsed.dedication).toBeNull();
    expect(parsed.visibility).toBe('unlisted');
  });

  it('keeps only the fields flagged official', () => {
    expect(editableStorySchema.parse(story).official).toEqual({ result_time: true, result_position: true });
  });

  it('accepts an empty official map encoded as [] (PHP) or missing', () => {
    expect(editableStorySchema.parse({ ...story, official: [] }).official).toEqual({});
    const withoutOfficial: Record<string, unknown> = { ...story };
    delete withoutOfficial.official;
    expect(editableStorySchema.parse(withoutOfficial).official).toEqual({});
  });

  it('rejects an unknown visibility or a missing id', () => {
    expect(editableStorySchema.safeParse({ ...story, visibility: 'friends' }).success).toBe(false);
    expect(editableStorySchema.safeParse({ ...story, public_id: '' }).success).toBe(false);
  });
});

describe('storyMediaSchema', () => {
  const item = { uuid: 'u-1', role: 'video', url: 'https://x/v.mp4', thumb_url: null, poster_url: 'https://x/p.jpg', duration_seconds: 42, status: 'processing', sort_order: 2, source: 'upload' };

  it('parses a video item', () => {
    expect(storyMediaSchema.parse(item)).toMatchObject({ role: 'video', status: 'processing', duration_seconds: 42, poster_url: 'https://x/p.jpg' });
  });

  it('defaults optional fields and an unknown source', () => {
    const parsed = storyMediaSchema.parse({ uuid: 'u-2', role: 'photo', url: 'https://x/a.jpg', status: 'ready', source: 'gift' });
    expect(parsed).toMatchObject({ thumb_url: null, poster_url: null, duration_seconds: null, sort_order: 0, source: 'upload' });
  });

  it('rejects an unknown role or status', () => {
    expect(storyMediaSchema.safeParse({ ...item, role: 'document' }).success).toBe(false);
    expect(storyMediaSchema.safeParse({ ...item, status: 'queued' }).success).toBe(false);
  });
});

describe('media quota', () => {
  it('parses the three kinds, with max_seconds where given', () => {
    const quota = mediaQuotaSchema.parse({ photos: bucket, videos: { ...bucket, limit: 2, used: 2, remaining: 0, max_seconds: 60 }, audio: { ...bucket, limit: 1, used: 0, remaining: 1, max_seconds: 120 } });
    expect(quota.photos.max_seconds).toBeNull();
    expect(quota.videos.max_seconds).toBe(60);
    expect(quota.photos.plan).toBeNull();
  });

  it('reads the plan of a prepaid expansion and tolerates an unknown period', () => {
    const plan = { billing_period: 'annual', expires_at: '2027-03-08T00:00:00Z', expired: false, renewable: true };
    const quota = mediaQuotaSchema.parse({ photos: { ...bucket, plan }, videos: { ...bucket, plan: { ...plan, billing_period: 'weekly' } }, audio: { ...bucket, plan: null } });
    expect(quota.photos.plan).toEqual(plan);
    expect(quota.videos.plan?.billing_period).toBeNull();
    expect(quota.audio.plan).toBeNull();
  });

  it('requires meta.quota on the media list', () => {
    expect(storyMediaResponseSchema.safeParse({ data: [], meta: {} }).success).toBe(false);
    expect(storyMediaResponseSchema.safeParse({ data: [], meta: { quota: { photos: bucket, videos: bucket, audio: bucket } } }).success).toBe(true);
  });

  it('rejects negative counters', () => {
    expect(mediaQuotaSchema.safeParse({ photos: { ...bucket, remaining: -1 }, videos: bucket, audio: bucket }).success).toBe(false);
  });
});

describe('limit details and purchased photos', () => {
  it('parses MEDIA_LIMIT_REACHED details', () => {
    expect(mediaLimitDetailsSchema.parse({ kind: 'videos', limit: 2, used: 2, can_expand: true })).toEqual({ kind: 'videos', limit: 2, used: 2, can_expand: true });
    expect(mediaLimitDetailsSchema.safeParse({ kind: 'files', limit: 2, used: 2 }).success).toBe(false);
  });

  it('parses a purchased photo and stringifies the story ids', () => {
    const parsed = purchasedPhotoSchema.parse({ sale_id: 91, thumb_url: 'https://x/t.jpg', event_name: 'Maratón', purchased_at: '2026-03-09T10:00:00Z', already_in_story_ids: ['abc123def456', 7] });
    expect(parsed.already_in_story_ids).toEqual(['abc123def456', '7']);
    expect(purchasedPhotoSchema.parse({ sale_id: 'x9', thumb_url: null }).already_in_story_ids).toEqual([]);
  });
});

describe('iapOfferSchema with kind and billing period', () => {
  const offer = {
    story: 'abc123def456',
    platform: 'android',
    available: true,
    reason: null,
    product_id: 'fl.videos.5',
    pack: { id: 4, name: '5 videos más', description: null, videos: 5, billing_period: 'annual' },
    account_token: 'tok',
  };

  it('parses a video pack sold for 12 months', () => {
    const parsed = iapOfferSchema.parse({ ...offer, kind: 'videos' });
    expect(parsed.kind).toBe('videos');
    expect(parsed.pack?.videos).toBe(5);
    expect(parsed.pack?.billing_period).toBe('annual');
  });

  it('still parses the original photo-only offer (older backend)', () => {
    const parsed = iapOfferSchema.parse({ ...offer, pack: { id: 1, name: '20 fotos', description: 'Más espacio', photos: 20 }, quota: { limit: 10, used: 10, remaining: 0, can_expand: true } });
    expect(parsed.kind).toBeUndefined();
    expect(parsed.pack?.photos).toBe(20);
    expect(parsed.pack?.billing_period).toBeNull();
    expect(parsed.billing_period).toBeNull();
  });
});
