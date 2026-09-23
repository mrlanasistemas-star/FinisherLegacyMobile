import { apiClient } from '@/api/client';
import { toAppError } from '@/api/errors';
import type { Cart } from '@/types/models';

export async function fetchCart(): Promise<Cart> {
  try {
    const { data } = await apiClient.get<{ data: Cart }>('cart');
    return data.data;
  } catch (error) {
    throw toAppError(error);
  }
}

/** The variant is identified by its public `uuid` — the backend resolves the internal id. */
export interface AddCartItemPayload {
  product_variant_uuid: string;
  quantity: number;
  /** Required by the server when the variant's product type is `legacy_plate`. */
  event_edition_id?: number;
  legacy_plate_model_uuid?: string;
}

export async function addCartItem(payload: AddCartItemPayload): Promise<Cart> {
  try {
    const { data } = await apiClient.post<{ data: Cart }>('cart/items', payload);
    return data.data;
  } catch (error) {
    throw toAppError(error);
  }
}

/** `quantity: 0` removes the item — confirmed in UpdateCartItemRequest (min:0). */
export async function updateCartItem(itemId: number, quantity: number): Promise<Cart> {
  try {
    const { data } = await apiClient.patch<{ data: Cart }>(`cart/items/${itemId}`, { quantity });
    return data.data;
  } catch (error) {
    throw toAppError(error);
  }
}

export async function removeCartItem(itemId: number): Promise<Cart> {
  try {
    const { data } = await apiClient.delete<{ data: Cart }>(`cart/items/${itemId}`);
    return data.data;
  } catch (error) {
    throw toAppError(error);
  }
}

/**
 * On rejection: 422 `COUPON_NOT_APPLICABLE` with `details.reason` — the
 * screen should read `error.code`/the details on the underlying error, not
 * just the message. This is a UX-only preview; `/checkout` always
 * revalidates the coupon server-side.
 */
export async function applyCartCoupon(code: string): Promise<Cart> {
  try {
    const { data } = await apiClient.post<{ data: Cart }>('cart/coupon', { code });
    return data.data;
  } catch (error) {
    throw toAppError(error);
  }
}

export async function removeCartCoupon(): Promise<Cart> {
  try {
    const { data } = await apiClient.delete<{ data: Cart }>('cart/coupon');
    return data.data;
  } catch (error) {
    throw toAppError(error);
  }
}
