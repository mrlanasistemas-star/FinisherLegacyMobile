import type { ProductDetail, ProductSummary, ProductVariant } from '@/types/models';

/** App-side ceiling when the server doesn't send `max_quantity`. The server always revalidates. */
export const DEFAULT_MAX_QUANTITY = 20;

const SIZE_KEYS = ['size', 'talla', 'Size', 'Talla', 'TALLA'];
const COLOR_KEYS = ['color', 'Color', 'colour', 'COLOR'];
const COLOR_HEX_KEYS = ['color_hex', 'hex', 'colorHex'];
const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', 'XXXL', '3XL', 'U', 'UNI', 'UNITALLA'];

function readAttribute(variant: ProductVariant, keys: string[]): string | null {
  const attributes = variant.attributes ?? {};
  for (const key of keys) {
    const value = (attributes as Record<string, unknown>)[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return null;
}

export function variantSize(variant: ProductVariant): string | null {
  return variant.size?.trim() || readAttribute(variant, SIZE_KEYS);
}

export function variantColor(variant: ProductVariant): string | null {
  return variant.color?.trim() || readAttribute(variant, COLOR_KEYS);
}

export function variantColorHex(variant: ProductVariant): string | null {
  const hex = variant.color_hex ?? readAttribute(variant, COLOR_HEX_KEYS);
  return hex && /^#?[0-9a-f]{3,8}$/i.test(hex) ? (hex.startsWith('#') ? hex : `#${hex}`) : null;
}

/** A variant the athlete can actually buy right now. */
export function isVariantAvailable(variant: ProductVariant): boolean {
  return variant.active && variant.in_stock && variant.stock_status !== 'sold_out';
}

function sizeRank(size: string): number {
  const index = SIZE_ORDER.indexOf(size.toUpperCase());
  if (index >= 0) return index;
  const numeric = Number.parseFloat(size);
  return Number.isFinite(numeric) ? 100 + numeric : 1000;
}

export interface ColorOption {
  name: string;
  hex: string | null;
}

export interface VariantAxes {
  sizes: string[];
  colors: ColorOption[];
  /** True when every variant could be placed on the size/color axes. */
  structured: boolean;
}

export function buildAxes(variants: ProductVariant[]): VariantAxes {
  const sizes = new Set<string>();
  const colors = new Map<string, ColorOption>();
  let structured = variants.length > 0;

  for (const variant of variants) {
    const size = variantSize(variant);
    const color = variantColor(variant);
    if (!size && !color) structured = false;
    if (size) sizes.add(size);
    if (color && !colors.has(color)) colors.set(color, { name: color, hex: variantColorHex(variant) });
  }

  return {
    sizes: [...sizes].sort((a, b) => sizeRank(a) - sizeRank(b) || a.localeCompare(b)),
    colors: [...colors.values()],
    structured,
  };
}

/** The variant at (size, color); a missing axis matches anything. */
export function findVariant(variants: ProductVariant[], size: string | null, color: string | null): ProductVariant | null {
  return (
    variants.find((variant) => (size === null || variantSize(variant) === size) && (color === null || variantColor(variant) === color)) ?? null
  );
}

/** Is `size` buyable in `color` (or in any color when none is chosen)? */
export function isSizeAvailable(variants: ProductVariant[], size: string, color: string | null): boolean {
  return variants.some((variant) => variantSize(variant) === size && (color === null || variantColor(variant) === color) && isVariantAvailable(variant));
}

export function isColorAvailable(variants: ProductVariant[], color: string): boolean {
  return variants.some((variant) => variantColor(variant) === color && isVariantAvailable(variant));
}

/** The first buyable variant — what the detail page preselects. */
export function defaultVariant(variants: ProductVariant[]): ProductVariant | null {
  return variants.find(isVariantAvailable) ?? variants[0] ?? null;
}

/** Stock-limited stepper ceiling: server cap if present, else the app cap. */
export function maxQuantityFor(variant: Pick<ProductVariant, 'max_quantity'> | null | undefined, cap = DEFAULT_MAX_QUANTITY): number {
  const serverCap = variant?.max_quantity;
  if (typeof serverCap === 'number' && Number.isFinite(serverCap)) return Math.max(0, Math.min(Math.floor(serverCap), cap));
  return cap;
}

export type StockTone = 'available' | 'low' | 'sold_out';

export function stockState(variant: ProductVariant | null): { tone: StockTone; label: string } {
  if (!variant || !isVariantAvailable(variant)) return { tone: 'sold_out', label: 'Agotado' };
  const max = variant.max_quantity;
  if (variant.stock_status === 'low' || (typeof max === 'number' && max > 0 && max <= 3)) return { tone: 'low', label: 'Últimas piezas' };
  return { tone: 'available', label: 'Disponible' };
}

/** "Producto conectado": NFC flag when the server sends it, the historical capability flag otherwise. */
export function isConnectedProduct(product: Pick<ProductDetail, 'qr_capable' | 'nfc_enabled' | 'type'> | Pick<ProductSummary, 'nfc_enabled' | 'type'>): boolean {
  if (product.type === 'legacy_plate') return true;
  if (typeof product.nfc_enabled === 'boolean') return product.nfc_enabled;
  return 'qr_capable' in product ? !!product.qr_capable : false;
}
