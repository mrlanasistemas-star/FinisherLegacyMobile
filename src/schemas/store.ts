import { z } from 'zod';

/**
 * Store payloads that drive drawn artwork (`/store/products*`,
 * `/store/collections`). Parsed, not cast: `tag_design` is additive (older
 * servers omit it) and a malformed one must degrade to the black-and-gold
 * fallback tag instead of crashing a grid card.
 */

/** `#RGB` / `#RRGGBB` only — anything else falls back to Oro Legacy. */
const HEX = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

const nullableString = z
  .string()
  .nullish()
  .transform((value) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  });

export const tagDesignSchema = z.object({
  front_art_url: nullableString,
  accent: z
    .string()
    .nullish()
    .transform((value) => (value && HEX.test(value.trim()) ? value.trim() : null)),
  name_line: z.string().trim().min(1),
  discipline_line: nullableString,
  back_line: z.string().trim().min(1),
  monogram_url: nullableString,
});

export type TagDesign = z.infer<typeof tagDesignSchema>;

/** Optional `tag_design` → a valid design or `null` (never throws). */
export function parseTagDesign(raw: unknown): TagDesign | null {
  if (raw === null || raw === undefined) return null;
  const result = tagDesignSchema.safeParse(raw);
  return result.success ? result.data : null;
}

/** One named design of a collection (`tag_designs[]`, primary first). */
export interface NamedTagDesign {
  slug: string;
  name: string;
  design: TagDesign;
}

function parseNamedDesigns(raw: unknown): NamedTagDesign[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((row) => {
    if (typeof row !== 'object' || row === null) return [];
    const { slug, name } = row as { slug?: unknown; name?: unknown };
    const design = parseTagDesign(row);
    if (typeof slug !== 'string' || !slug || typeof name !== 'string' || !design) return [];
    return [{ slug, name, design }];
  });
}

/**
 * `GET /store/collections` (+ `/{slug}`): CollectionResource. `products`
 * only comes on the detail endpoint and is kept raw here — the API layer
 * normalizes each row like any product summary.
 */
export const storeCollectionSchema = z.object({
  uuid: z.string().nullish(),
  name: z.string().min(1),
  slug: z.string().min(1),
  tagline: nullableString,
  description: nullableString,
  discipline: nullableString,
  destination: nullableString,
  year: z.number().int().nullish(),
  accent_color: z.string().nullish(),
  cover_url: nullableString,
  products_count: z.number().int().nonnegative().nullish(),
  tag_design: z.unknown().optional().transform(parseTagDesign),
  tag_designs: z.unknown().optional().transform(parseNamedDesigns),
  products: z.array(z.unknown()).nullish(),
});

export type StoreCollection = z.infer<typeof storeCollectionSchema>;

/** A single collection body → parsed collection or `null`. */
export function parseCollection(raw: unknown): StoreCollection | null {
  const result = storeCollectionSchema.safeParse(raw);
  return result.success ? result.data : null;
}

/** A collections list: invalid rows are dropped, never fabricated. */
export function parseCollections(raw: unknown): StoreCollection[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((row) => {
    const result = storeCollectionSchema.safeParse(row);
    return result.success ? [result.data] : [];
  });
}
