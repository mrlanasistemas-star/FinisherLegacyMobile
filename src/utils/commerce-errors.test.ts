import { AppError, toAppError } from '@/api/errors';
import { cartItemCount } from '@/hooks/use-cart';
import type { Cart } from '@/types/models';

import { describeCommerceError } from './commerce-errors';

jest.mock('@/api/client', () => ({ apiClient: {} }));

describe('describeCommerceError', () => {
  it('turns coupon rejection reasons into human copy', () => {
    const error = new AppError({ kind: 'business_rule', code: 'COUPON_NOT_APPLICABLE', message: 'x', details: { reason: 'expired' } });
    expect(describeCommerceError(error)).toBe('Este cupón ya venció.');
  });

  it('maps stock/order codes and never shows a raw code', () => {
    expect(describeCommerceError(new AppError({ kind: 'business_rule', code: 'PRODUCT_OUT_OF_STOCK', message: 'x' }))).toBe('Este producto ya no tiene existencias.');
    expect(describeCommerceError(new AppError({ kind: 'business_rule', code: 'ORDER_EXPIRED', message: 'x' }))).toMatch(/expiró/);
  });

  it('falls back to the backend message for unknown codes', () => {
    expect(describeCommerceError(new AppError({ kind: 'server', message: 'Algo salió mal.' }))).toBe('Algo salió mal.');
  });
});

describe('social / domain error parsing', () => {
  it('keeps the human backend message and code for a 422 domain error', () => {
    const error = toAppError({
      isAxiosError: true,
      response: {
        status: 422,
        data: { error: { code: 'SOCIAL_ACTION_NOT_ALLOWED', message: 'No puedes seguirte a ti mismo.', details: {} } },
      },
    });
    expect(error.kind).toBe('business_rule');
    expect(error.code).toBe('SOCIAL_ACTION_NOT_ALLOWED');
    expect(error.message).toBe('No puedes seguirte a ti mismo.');
  });

  it('treats a hidden/private moment (404) as not found, without leaking details', () => {
    const error = toAppError({ isAxiosError: true, response: { status: 404, data: { error: { code: 'NOT_FOUND', message: 'Recurso no encontrado.' } } } });
    expect(error.kind).toBe('not_found');
    expect(error.message).not.toMatch(/Recurso|NOT_FOUND/);
  });
});

describe('cartItemCount', () => {
  it('sums quantities for the tab badge', () => {
    const cart = { items: [{ quantity: 2 }, { quantity: 1 }] } as unknown as Cart;
    expect(cartItemCount(cart)).toBe(3);
    expect(cartItemCount(undefined)).toBe(0);
  });
});
