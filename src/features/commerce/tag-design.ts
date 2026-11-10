import { parseTagDesign } from '@/schemas/store';
import { palette } from '@/theme/tokens';

/** What `TagRender` draws — resolved once from an API `tag_design` (or its absence). */
export interface TagFace {
  /** Destination illustration for the front; `null` → black-and-gold front. */
  artUrl: string | null;
  /** Hex accent for glows/rules on the fallback front. */
  accent: string;
  /** Upper-cased name for the spaced-caps line ("VERACRUZ"). */
  nameLine: string;
  /** "TRIATLÓN 2026" — upper-cased, optional. */
  disciplineLine: string | null;
  /** Back phrase ("TU HISTORIA SIGUE VIVA"), upper-cased. */
  backLine: string;
  /** Remote official monogram; `null` → bundled fl-monograma.png. */
  monogramUrl: string | null;
}

export const DEFAULT_BACK_LINE = 'TU HISTORIA SIGUE VIVA';

const upper = (value: string) => value.toLocaleUpperCase('es-MX');

interface TagFaceFallback {
  /** Used for the name line when the product has no `tag_design` (product or collection name). */
  name?: string | null;
  discipline?: string | null;
}

/**
 * Maps a raw/parsed `tag_design` to the props TagRender needs. Without a
 * design (older backend) the tag still renders: black-and-gold front with
 * the product name, the deck's back phrase and the bundled monogram.
 */
export function tagFaceFrom(design: unknown, fallback: TagFaceFallback = {}): TagFace {
  // Parsing is idempotent, so an already-parsed design goes through the same path.
  const parsed = parseTagDesign(design);
  const name = parsed?.name_line ?? fallback.name?.trim() ?? '';
  const discipline = parsed ? parsed.discipline_line : (fallback.discipline?.trim() ?? null);
  return {
    artUrl: parsed?.front_art_url ?? null,
    accent: parsed?.accent ?? palette.gold,
    nameLine: upper(name || 'FINISHER LEGACY'),
    disciplineLine: discipline ? upper(discipline) : null,
    backLine: upper(parsed?.back_line ?? DEFAULT_BACK_LINE),
    monogramUrl: parsed?.monogram_url ?? null,
  };
}

/** A Finisher Legacy Tag product: typed `legacy_tag`, or anything the server gave a tag design. */
export function isTagProduct(product: { type?: string | null; tag_design?: unknown } | null | undefined): boolean {
  if (!product) return false;
  return product.type === 'legacy_tag' || parseTagDesign(product.tag_design) !== null;
}

/**
 * Splits the back phrase into two balanced lines ("TU HISTORIA" /
 * "SIGUE VIVA") the way the deck sets it.
 */
export function balanceLines(text: string): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length < 3) return [words.join(' ')];
  let best = 1;
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i += 1) {
    const diff = Math.abs(words.slice(0, i).join(' ').length - words.slice(i).join(' ').length);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  }
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
}

/** `#RGB`/`#RRGGBB` + alpha (0–1) → `#RRGGBBAA`; invalid input falls back to Oro Legacy. */
export function withAlpha(hex: string, alpha: number): string {
  let clean = hex.trim().replace('#', '');
  if (/^[0-9a-fA-F]{3}$/.test(clean)) clean = clean.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) clean = palette.gold.slice(1);
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `#${clean.toUpperCase()}${a.toUpperCase()}`;
}
