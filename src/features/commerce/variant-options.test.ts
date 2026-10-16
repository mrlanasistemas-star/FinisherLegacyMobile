import type { ProductVariant } from '@/types/models';

import {
  buildAxes,
  defaultVariant,
  findVariant,
  isColorAvailable,
  isConnectedProduct,
  isSizeAvailable,
  maxQuantityFor,
  stockState,
  variantColorHex,
} from './variant-options';

function variant(overrides: Partial<ProductVariant>): ProductVariant {
  return {
    uuid: Math.random().toString(36).slice(2),
    sku: 'SKU',
    name: 'Var',
    attributes: {},
    base_price_minor: 100000,
    currency: 'MXN',
    active: true,
    in_stock: true,
    ...overrides,
  };
}

const trisuit = [
  variant({ attributes: { color: 'Negro', talla: 'M' } }),
  variant({ attributes: { color: 'Negro', talla: 'XS' } }),
  variant({ attributes: { color: 'Negro', talla: 'XL' }, in_stock: false }),
  variant({ attributes: { color: 'Blanco', talla: 'M' }, stock_status: 'sold_out' }),
  variant({ size: 'S', color: 'Blanco', color_hex: 'ffffff' }),
];

describe('variant axes', () => {
  it('reads size/color from attributes or explicit fields and orders sizes', () => {
    const axes = buildAxes(trisuit);
    expect(axes.sizes).toEqual(['XS', 'S', 'M', 'XL']);
    expect(axes.colors.map((c) => c.name)).toEqual(['Negro', 'Blanco']);
    expect(axes.structured).toBe(true);
  });

  it('is unstructured when a variant has neither axis', () => {
    expect(buildAxes([variant({ name: 'Única' })]).structured).toBe(false);
  });

  it('finds variants and availability per axis', () => {
    expect(findVariant(trisuit, 'M', 'Blanco')?.stock_status).toBe('sold_out');
    expect(isSizeAvailable(trisuit, 'M', 'Blanco')).toBe(false);
    expect(isSizeAvailable(trisuit, 'M', 'Negro')).toBe(true);
    expect(isSizeAvailable(trisuit, 'XL', null)).toBe(false);
    expect(isColorAvailable(trisuit, 'Blanco')).toBe(true);
  });

  it('preselects the first buyable variant', () => {
    const list = [variant({ in_stock: false, name: 'A' }), variant({ name: 'B' })];
    expect(defaultVariant(list)?.name).toBe('B');
  });

  it('normalizes color hex', () => {
    expect(variantColorHex(trisuit[4])).toBe('#ffffff');
    expect(variantColorHex(variant({ attributes: { hex: 'not a color' } }))).toBeNull();
  });
});

describe('quantity and stock', () => {
  it('caps the stepper by the server limit when present', () => {
    expect(maxQuantityFor(variant({ max_quantity: 3 }))).toBe(3);
    expect(maxQuantityFor(variant({ max_quantity: 500 }))).toBe(20);
    expect(maxQuantityFor(variant({}))).toBe(20);
    expect(maxQuantityFor(null)).toBe(20);
  });

  it('labels stock without exposing counts', () => {
    expect(stockState(variant({})).label).toBe('Disponible');
    expect(stockState(variant({ stock_status: 'low' })).tone).toBe('low');
    expect(stockState(variant({ max_quantity: 2 })).tone).toBe('low');
    expect(stockState(variant({ in_stock: false })).tone).toBe('sold_out');
    expect(stockState(null).tone).toBe('sold_out');
  });
});

describe('connected products', () => {
  it('prefers the NFC flag and falls back to the historical capability', () => {
    expect(isConnectedProduct({ type: 'apparel', qr_capable: true })).toBe(true);
    expect(isConnectedProduct({ type: 'apparel', qr_capable: true, nfc_enabled: false })).toBe(false);
    expect(isConnectedProduct({ type: 'legacy_plate', nfc_enabled: false })).toBe(true);
    expect(isConnectedProduct({ type: 'apparel' })).toBe(false);
  });
});
