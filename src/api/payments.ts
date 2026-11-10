import { apiClient } from '@/api/client';
import { toAppError } from '@/api/errors';
import type { CheckoutSession } from '@/types/models';

/**
 * `POST /orders/{uuid}/checkout-session` → a one-time, short-lived URL to the
 * OpenPay web checkout of this order (card tokenized by Openpay.js in the
 * browser, 3-D Secure included). Card data never touches the app or our
 * servers. Errors the flow branches on: 501 (OpenPay not configured),
 * ORDER_EXPIRED / ORDER_NOT_PAYABLE, PAYMENT_ALREADY_RECORDED and
 * ORDER_NOT_APP_PAYABLE (digital goods are never sold in the app).
 */
export async function createCheckoutSession(orderUuid: string): Promise<CheckoutSession> {
  try {
    const { data } = await apiClient.post<{ data: CheckoutSession }>(`orders/${orderUuid}/checkout-session`);
    return data.data;
  } catch (error) {
    throw toAppError(error);
  }
}
