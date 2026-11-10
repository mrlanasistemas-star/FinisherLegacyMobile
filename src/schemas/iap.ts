import { z } from 'zod';

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

export const iapOfferSchema = z.object({
  story: z.string(),
  platform: z.enum(['ios', 'android']),
  available: z.boolean(),
  reason: z.enum(['not_configured', 'no_product']).nullable(),
  product_id: z.string().nullable(),
  pack: z
    .object({
      id: z.number(),
      name: z.string(),
      description: z.string().nullable(),
      photos: z.number().int().positive(),
    })
    .nullable(),
  account_token: z.string().nullable(),
  quota: quotaSchema,
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
});

export type StorySummary = z.infer<typeof storySummarySchema>;

/** Story picked for a purchase, remembered until the store transaction is finished. */
export const pendingIapIntentSchema = z.object({
  productId: z.string(),
  storyPublicId: z.string(),
  createdAt: z.number(),
});

export type PendingIapIntent = z.infer<typeof pendingIapIntentSchema>;
