/**
 * Payloads of the Portarretrato designer (`/me/stories/{id}/portrait`,
 * `/me/portrait-designs/{uuid}`). The physical product prints ONE photo of
 * the story with one of the print templates the server defines
 * (config/portrait.php); the app never draws the design itself — the
 * preview is a server render made by the same composer as the print file.
 */

import { z } from 'zod';

const text = z
  .union([z.string(), z.number()])
  .nullish()
  .transform((value) => (value === null || value === undefined || value === '' ? null : String(value)));

/** The words the template can print. Empty ones are simply not printed. */
export const PORTRAIT_FIELDS = ['name', 'event', 'details', 'time', 'distance', 'position', 'pace', 'bib', 'category', 'dedication'] as const;
export type PortraitField = (typeof PORTRAIT_FIELDS)[number];
export type PortraitFields = Record<PortraitField, string | null>;

/** Server limits (StoryPrintController::validatePortrait) — the inputs never accept more. */
export const PORTRAIT_FIELD_MAX: Record<PortraitField, number> = {
  name: 80,
  event: 160,
  details: 160,
  time: 20,
  distance: 40,
  position: 40,
  pace: 20,
  bib: 12,
  category: 40,
  dedication: 600,
};

export function emptyPortraitFields(): PortraitFields {
  return Object.fromEntries(PORTRAIT_FIELDS.map((key) => [key, null])) as PortraitFields;
}

const fieldsSchema = z
  .record(z.string(), z.unknown())
  .nullish()
  .catch(null)
  .transform((raw) => {
    const out = emptyPortraitFields();
    for (const key of PORTRAIT_FIELDS) {
      const parsed = text.safeParse(raw?.[key]);
      out[key] = parsed.success ? parsed.data : null;
    }
    return out;
  });

const cropSchema = z
  .object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() })
  .nullish()
  .catch(null)
  .transform((value) => value ?? null);

export const portraitDesignSchema = z.object({
  uuid: z.string().min(1),
  title: text,
  template: z.string().min(1),
  template_label: text,
  photo_uuid: text,
  photo_thumb_url: text,
  crop: cropSchema,
  fields: fieldsSchema,
  last_ordered_at: text,
  created_at: text,
  updated_at: text,
});

export type PortraitDesign = z.infer<typeof portraitDesignSchema>;

const photoSchema = z.object({
  uuid: z.string().min(1),
  thumb_url: text,
  url: text,
  width: z.number().nullish().transform((value) => value ?? null),
  height: z.number().nullish().transform((value) => value ?? null),
  is_cover: z.boolean().catch(false),
});

export type PortraitPhoto = z.infer<typeof photoSchema>;

const templateSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
  description: z.string().catch(''),
  background: z.string().catch('#FFFFFF'),
  /** Width / height of the photo box: informative only (the server crops). */
  aspect: z.number().positive().catch(0.8),
});

export type PortraitTemplate = z.infer<typeof templateSchema>;

const productSchema = z
  .object({
    name: z.string().min(1),
    variant_uuid: z.string().min(1),
    price_minor: z.number().int().nullish().transform((value) => value ?? null),
    currency: z.string().catch('MXN'),
    available: z.boolean().catch(false),
  })
  .nullish()
  .catch(null)
  .transform((value) => value ?? null);

export type PortraitProduct = NonNullable<z.infer<typeof productSchema>>;

/** Rows that do not match are dropped instead of hiding the whole designer. */
function lenientArray<T>(schema: z.ZodType<T>) {
  return z
    .array(z.unknown())
    .catch([])
    .transform((rows) =>
      rows.flatMap((row) => {
        const result = schema.safeParse(row);
        return result.success ? [result.data] : [];
      }),
    );
}

export const portraitBuilderSchema = z.object({
  story: z.object({
    public_id: z.string().min(1),
    title: text,
    kind: z.enum(['album', 'tag']).nullish().catch(null),
  }),
  photos: lenientArray(photoSchema),
  templates: lenientArray(templateSchema),
  default_template: z.string().nullish().transform((value) => value ?? null),
  defaults: fieldsSchema,
  product: productSchema,
  designs: lenientArray(portraitDesignSchema),
});

export type PortraitBuilder = z.infer<typeof portraitBuilderSchema>;

/** What the designer sends to preview / save. */
export interface PortraitDraft {
  title?: string | null;
  template: string;
  photo_uuid: string;
  fields: PortraitFields;
}
