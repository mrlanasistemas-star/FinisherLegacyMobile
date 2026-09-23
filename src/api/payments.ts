import { apiClient } from '@/api/client';
import { toAppError } from '@/api/errors';
import type { OnlinePaymentResult, Order } from '@/types/models';

/**
 * `POST /orders/{uuid}/payments/online` with the Stripe gateway. Idempotent
 * twice over: the Idempotency-Key replays the same response for a retried
 * request, and the backend resumes an in-progress PaymentIntent instead of
 * creating a second one. Never returns a secret key.
 */
export async function createOnlinePayment(orderUuid: string, idempotencyKey: string): Promise<OnlinePaymentResult> {
  try {
    const { data } = await apiClient.post<{ data: OnlinePaymentResult }>(
      `orders/${orderUuid}/payments/online`,
      { provider: 'stripe' },
      { headers: { 'Idempotency-Key': idempotencyKey } },
    );
    return data.data;
  } catch (error) {
    throw toAppError(error);
  }
}

/**
 * `POST /orders/{uuid}/payments/sync` — the backend asks Stripe (server to
 * server) for the real status and applies it. The only way the app ever
 * learns "paid"; the payment sheet's own result is never trusted for that.
 */
export async function syncOnlinePayment(orderUuid: string): Promise<Order> {
  try {
    const { data } = await apiClient.post<{ data: Order }>(`orders/${orderUuid}/payments/sync`);
    return data.data;
  } catch (error) {
    throw toAppError(error);
  }
}
