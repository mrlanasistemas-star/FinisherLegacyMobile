/**
 * Payloads of the story ("recuerdo") editor: the editable story
 * (`/me/stories/{id}`), its media + per-kind quota
 * (`/me/stories/{id}/media`), the photos bought from event photographers
 * (`/me/purchased-photos`) and the details of a 422 `MEDIA_LIMIT_REACHED`.
 * Parsed, never cast: a malformed body becomes an honest error state
 * instead of an editor showing invented data.
 */

import { z } from 'zod';

/** Text the backend may send as a string, a number (positions) or nothing. */
const text = z
  .union([z.string(), z.number()])
  .nullish()
  .transform((value) => (value === null || value === undefined || value === '' ? null : String(value)));

const count = z.number().int().nonnegative();

export const STORY_VISIBILITIES = ['private', 'unlisted', 'public'] as const;
export type StoryVisibility = (typeof STORY_VISIBILITIES)[number];

/** Every field the athlete can edit (when it is not marked official). */
export const STORY_TEXT_FIELDS = [
  'title',
  'event_name',
  'distance',
  'result_time',
  'result_position',
  'bib_number',
  'athlete_display_name',
  'pace',
  'category',
  'category_position',
  'gender_position',
  'race_date',
  'location',
  'dedication',
  'body',
] as const;

export type StoryTextField = (typeof STORY_TEXT_FIELDS)[number];

/** `official: {result_time: true}` — PHP may encode an empty map as `[]`. */
const officialFlags = z
  .union([z.record(z.string(), z.unknown()), z.array(z.unknown())])
  .nullish()
  .transform((value) => {
    const flags: Record<string, boolean> = {};
    if (value && !Array.isArray(value)) {
      for (const [key, flag] of Object.entries(value)) {
        if (flag === true) flags[key] = true;
      }
    }
    return flags;
  });

export const editableStorySchema = z.object({
  public_id: z.string().min(1),
  title: text,
  event_name: text,
  distance: text,
  result_time: text,
  result_position: text,
  bib_number: text,
  athlete_display_name: text,
  pace: text,
  category: text,
  category_position: text,
  gender_position: text,
  race_date: text,
  location: text,
  dedication: text,
  body: text,
  visibility: z.enum(STORY_VISIBILITIES),
  share_url: text,
  /** Thumbnail of the first ready photo (optional: not every backend sends it). */
  cover_url: text,
  official: officialFlags,
});

export type EditableStory = z.infer<typeof editableStorySchema>;

export const MEDIA_ROLES = ['photo', 'video', 'audio'] as const;
export type MediaRole = (typeof MEDIA_ROLES)[number];

export const storyMediaSchema = z.object({
  uuid: z.string().min(1),
  role: z.enum(MEDIA_ROLES),
  url: text,
  thumb_url: text,
  poster_url: text,
  duration_seconds: z.number().nonnegative().nullish().transform((value) => value ?? null),
  status: z.enum(['processing', 'ready', 'failed']),
  sort_order: z.number().nullish().transform((value) => value ?? 0),
  source: z.enum(['upload', 'purchased']).catch('upload'),
});

export type StoryMedia = z.infer<typeof storyMediaSchema>;

export const BILLING_PERIODS = ['one_time', 'semiannual', 'annual'] as const;
export type BillingPeriod = (typeof BILLING_PERIODS)[number];

/** Unknown / missing period (older backend) reads as "no term". */
export const billingPeriodSchema = z
  .enum(BILLING_PERIODS)
  .nullish()
  .catch(null)
  .transform((value) => value ?? null);

/**
 * Term of the expansion that feeds a kind: packs are one-time or prepaid
 * for 6 / 12 months (renewed by paying again). Optional — an older backend
 * sends no `plan` at all.
 */
const planSchema = z
  .object({
    billing_period: billingPeriodSchema,
    expires_at: text,
    expired: z.boolean().catch(false),
    renewable: z.boolean().catch(false),
  })
  .nullish()
  .catch(null)
  .transform((value) => value ?? null);

export type QuotaPlan = NonNullable<z.infer<typeof planSchema>>;

const bucketSchema = z.object({
  limit: count,
  used: count,
  remaining: count,
  can_expand: z.boolean(),
  max_seconds: z.number().positive().nullish().transform((value) => value ?? null),
  plan: planSchema,
});

export type QuotaBucket = z.infer<typeof bucketSchema>;

export const mediaQuotaSchema = z.object({
  photos: bucketSchema,
  videos: bucketSchema,
  audio: bucketSchema,
});

export type MediaQuota = z.infer<typeof mediaQuotaSchema>;

export const QUOTA_KINDS = ['photos', 'videos', 'audio'] as const;
export type QuotaKind = (typeof QUOTA_KINDS)[number];

export const storyMediaResponseSchema = z.object({
  data: z.array(z.unknown()),
  meta: z.object({ quota: mediaQuotaSchema }),
});

export interface StoryMediaPayload {
  items: StoryMedia[];
  quota: MediaQuota;
}

/** `error.details` of a 422 `MEDIA_LIMIT_REACHED`. */
export const mediaLimitDetailsSchema = z.object({
  kind: z.enum(QUOTA_KINDS),
  limit: count,
  used: count,
  can_expand: z.boolean().catch(false),
});

export type MediaLimitDetails = z.infer<typeof mediaLimitDetailsSchema>;

export const purchasedPhotoSchema = z.object({
  sale_id: z.union([z.number(), z.string()]),
  thumb_url: text,
  event_name: text,
  purchased_at: text,
  already_in_story_ids: z
    .array(z.union([z.string(), z.number()]))
    .nullish()
    .transform((ids) => (ids ?? []).map(String)),
});

export type PurchasedPhoto = z.infer<typeof purchasedPhotoSchema>;

export interface PurchasedPhotosPage {
  items: PurchasedPhoto[];
  page: number;
  hasMore: boolean;
}
