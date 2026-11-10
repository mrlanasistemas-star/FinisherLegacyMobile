import { z } from 'zod';

/**
 * Finisher Legacy Tag activation contract (`/tags/activation/*`) and the
 * public tag lookup (`GET /tags/{code}`). Responses are parsed, not cast:
 * the `write_url` decides what goes on a physical chip, so a malformed
 * body must fail loudly instead of reaching the writer.
 */

export const activationProductSchema = z.object({
  name: z.string(),
  variant: z.string().nullable().optional(),
  collection: z.string().nullable().optional(),
  image_url: z.string().nullable().optional(),
});

export const activationStorySchema = z.object({
  public_id: z.string(),
  url: z.string(),
});

export const activationStartSchema = z.object({
  // Nullable only so an `already_activated` body without an intent still parses; `ready_to_write` requires all three (checked by the session).
  intent_id: z.union([z.string().min(1), z.number()]).transform(String).nullish(),
  tag_code: z.string().min(8),
  write_url: z.string().min(1).nullish(),
  expires_at: z.string().nullish(),
  status: z.enum(['ready_to_write', 'already_activated']),
  product: activationProductSchema.nullable().optional(),
  story: activationStorySchema.nullable().optional(),
});

export const activationConfirmSchema = z.object({
  status: z.literal('activated'),
  tag_code: z.string(),
  story: z.object({
    public_id: z.string(),
    url: z.string(),
    edit_url: z.string().nullable().optional(),
  }),
});

/** 422 body: the contract's `{message, code}`, or the app-wide `{error:{code,message}}` ApiException shape. */
export const activationErrorBodySchema = z.union([
  z.object({ code: z.string(), message: z.string().optional() }),
  z.object({ error: z.object({ code: z.string(), message: z.string().optional() }) }),
]);

export const ACTIVATION_ERROR_CODES = ['ACTIVATION_CODE_INVALID', 'TAG_ALREADY_ACTIVATED', 'TAG_NOT_ACTIVATABLE', 'TAG_UID_MISMATCH'] as const;
export type ActivationErrorCode = (typeof ACTIVATION_ERROR_CODES)[number];

/** Pending intent kept on the device between write and confirm (crash recovery). */
export const pendingActivationSchema = z.object({
  version: z.literal(1),
  user_id: z.union([z.number(), z.string()]).nullable(),
  intent_id: z.string(),
  tag_code: z.string(),
  write_url: z.string(),
  expires_at: z.string(),
  nfc_uid: z.string().nullable(),
  /** `authorized` = start succeeded, nothing confirmed on the chip yet; `written` = write verified, confirm pending. */
  phase: z.enum(['authorized', 'written']),
  saved_at: z.string(),
});

export const tagLookupSchema = z.object({
  code: z.string(),
  display_code: z.string().nullable().optional(),
  status: z.string(),
  reason: z.string().nullable().optional(),
  message: z.string().nullable().optional(),
  can_activate: z.boolean(),
  owned_by_me: z.boolean(),
  tag: z
    .object({
      collection: z.string().nullable().optional(),
      design: z.object({
        product_name: z.string().nullable().optional(),
        variant_name: z.string().nullable().optional(),
        image_url: z.string().nullable().optional(),
      }),
    })
    .nullable()
    .optional(),
  story_url: z.string().nullable().optional(),
  story_public_id: z.string().nullable().optional(),
  activate_url: z.string().nullable().optional(),
});

export type ActivationStart = z.infer<typeof activationStartSchema>;
export type ActivationConfirm = z.infer<typeof activationConfirmSchema>;
export type ActivationProduct = z.infer<typeof activationProductSchema>;
export type PendingActivation = z.infer<typeof pendingActivationSchema>;
export type TagLookup = z.infer<typeof tagLookupSchema>;
