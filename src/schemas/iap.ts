import { z } from 'zod';

import { billingPeriodSchema } from '@/schemas/story';

/**
 * Payloads of the in-app purchase flow and the Legacy story photo quota
 * (backend docs/renovacion/compras-dentro-de-app.md). Parsed, not cast:
 * the store flow decides whether to finish a paid transaction from these,
 * so a malformed body must fail loudly instead of looking like a grant.
 */

export const quotaSchema = z.object({
  story: z.string().optional(),
  limit: z.number().int().nonnegative(),
  used: z.number().int().nonnegative(),
  remaining: z.number().int().nonnegative(),
  can_expand: z.boolean(),
});

export type StoryQuota = z.infer<typeof quotaSchema>;

/** Extra units a pack adds; which key is filled depends on the kind it expands. */
const packAmount = z.number().int().nonnegative().nullish();

export const iapOfferSchema = z.object({
  story: z.string(),
  platform: z.enum(['ios', 'android']),
  /** What the pack expands. Missing on an older backend = photos. */
  kind: z.enum(['photos', 'videos', 'audio']).optional().catch(undefined),
  available: z.boolean(),
  reason: z.enum(['not_configured', 'no_product']).nullable().catch(null),
  product_id: z.string().nullable(),
  pack: z
    .object({
      id: z.number(),
      name: z.string(),
      description: z.string().nullable(),
      /** Units of the pack's own kind (current backend). */
      units: packAmount,
      photos: packAmount,
      videos: packAmount,
      audio: packAmount,
      quantity: packAmount,
      /** One-time, or prepaid for 6 / 12 months (renewed by paying again). */
      billing_period: billingPeriodSchema,
    })
    .nullable(),
  /** Some backends put the period next to the pack instead of inside it. */
  billing_period: billingPeriodSchema,
  account_token: z.string().nullable(),
  /** Informative only (the screens read the quota from its own endpoint). */
  quota: quotaSchema.nullish().catch(null),
});

export type IapOffer = z.infer<typeof iapOfferSchema>;

export const iapPurchaseResultSchema = z.object({
  purchase: z.object({
    id: z.string(),
    platform: z.enum(['ios', 'android']),
    product_id: z.string(),
    status: z.enum(['granted', 'revoked']),
    story: z.string().nullable(),
    photos: z.number().int().nullable(),
    order_number: z.string().nullable(),
  }),
  replayed: z.boolean(),
  quota: quotaSchema.nullable(),
});

export type IapPurchaseResult = z.infer<typeof iapPurchaseResultSchema>;

/** Only what the photo-space screens need from `/me/stories` (stable additive contract). */
export const storySummarySchema = z.object({
  public_id: z.string(),
  title: z.string().nullable(),
  is_owner: z.boolean(),
  event: z
    .object({
      name: z.string().nullable(),
      date: z.string().nullable(),
    })
    .partial()
    .nullable()
    .optional(),
  cover_url: z.string().nullable(),
  photos: z
    .array(
      z.object({
        id: z.union([z.number(), z.string()]),
        url: z.string().nullable(),
        thumb_url: z.string().nullable(),
      }),
    )
    .default([]),
  year: z.union([z.number(), z.string()]).nullable().optional(),
  web_url: z.string().nullable().optional(),
  dedication: z.string().nullable().optional(),
  body: z.string().nullable().optional(),
  audio_url: z.string().nullable().optional(),
});

export type StorySummary = z.infer<typeof storySummarySchema>;

/** Story picked for a purchase, remembered until the store transaction is finished. */
export const pendingIapIntentSchema = z.object({
  productId: z.string(),
  storyPublicId: z.string(),
  createdAt: z.number(),
});

export type PendingIapIntent = z.infer<typeof pendingIapIntentSchema>;
