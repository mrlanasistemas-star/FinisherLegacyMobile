import { apiClient } from '@/api/client';
import { toAppError } from '@/api/errors';
import type { OnlinePaymentResult } from '@/types/models';

/**
 * `POST /orders/{uuid}/payments/online` — idempotent (send the same
 * `Idempotency-Key` as the checkout that created the order, or a fresh one
 * per payment attempt — never a bare retry without one). Returns 501
 * `INTERNAL_ERROR` if no gateway is configured in this environment (no real
 * Stripe/OpenPay keys today — see docs/MOBILE_BACKEND_REQUIREMENTS.md).
 * Never returns a secret key.
 */
export async function createOnlinePayment(orderUuid: string, idempotencyKey: string): Promise<OnlinePaymentResult> {
  try {
    const { data } = await apiClient.post<{ data: OnlinePaymentResult }>(
      `orders/${orderUuid}/payments/online`,
      {},
      { headers: { 'Idempotency-Key': idempotencyKey } },
    );
    return data.data;
  } catch (error) {
    throw toAppError(error);
  }
}
