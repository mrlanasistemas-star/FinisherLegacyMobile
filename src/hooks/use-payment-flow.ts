import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';

import { checkout } from '@/api/checkout';
import { AppError } from '@/api/errors';
import { createOnlinePayment, syncOnlinePayment } from '@/api/payments';
import { queryKeys } from '@/hooks/query-keys';
import { CONFIRM_POLL_DELAYS_MS, phaseFromOrder, phaseFromSheet, type PaymentPhase } from '@/payments/payment-flow';
import { presentStripePaymentSheet } from '@/payments/stripe';
import { useAuthStore } from '@/stores/authStore';
import type { Order } from '@/types/models';
import { describeCommerceError } from '@/utils/commerce-errors';
import { haptics } from '@/utils/haptics';
import { ensureOnline } from '@/utils/network';
import { uuidv4 } from '@/utils/uuid';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Cart → Checkout → Payment → Confirmation, end to end.
 *
 * Idempotency: the checkout key is created once per cart attempt and reused
 * until an order exists (a timeout/double tap never creates two orders);
 * each payment attempt gets its own key, and the backend resumes the same
 * Stripe PaymentIntent, so a retry never charges twice.
 *
 * "Paid" is only ever set from the server (`/payments/sync` or a later
 * order refetch fed by the webhook) — never from the payment sheet.
 */
export function usePaymentFlow(initialOrder: Order | null = null) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [phase, setPhase] = useState<PaymentPhase>(initialOrder ? phaseFromOrder(initialOrder, false) : 'review');
  const [order, setOrder] = useState<Order | null>(initialOrder);
  const [message, setMessage] = useState<string | null>(null);
  const checkoutKey = useRef<string | null>(null);
  const busy = useRef(false);

  const refreshOrderCaches = useCallback(
    (updated: Order) => {
      queryClient.setQueryData(queryKeys.order(updated.uuid), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.orders, exact: true });
    },
    [queryClient],
  );

  const confirm = useCallback(
    async (target: Order): Promise<void> => {
      setPhase('confirming');
      for (const delay of CONFIRM_POLL_DELAYS_MS) {
        try {
          const synced = await syncOnlinePayment(target.uuid);
          setOrder(synced);
          refreshOrderCaches(synced);
          const next = phaseFromOrder(synced, true);
          if (next !== 'confirming') {
            setPhase(next);
            if (next === 'paid') haptics.success();
            return;
          }
        } catch {
          // Transient — keep polling; the webhook settles it regardless.
        }
        await wait(delay);
      }
      // Stripe accepted it but the final status hasn't reached us yet: be
      // honest ("en proceso"), the order screen will update by itself.
      setPhase('processing');
    },
    [refreshOrderCaches],
  );

  const pay = useCallback(
    async (target: Order): Promise<void> => {
      setMessage(null);
      setPhase('preparing');

      let payment;
      try {
        await ensureOnline();
        payment = await createOnlinePayment(target.uuid, uuidv4());
      } catch (error) {
        const appError = error instanceof AppError ? error : null;
        if (appError?.status === 501) {
          setPhase('unavailable');
        } else if (appError?.code === 'ORDER_EXPIRED' || appError?.code === 'ORDER_NOT_PAYABLE') {
          setPhase('expired');
        } else if (appError?.code === 'PAYMENT_ALREADY_RECORDED') {
          await confirm(target);
        } else {
          setMessage(appError ? describeCommerceError(appError) : 'No pudimos iniciar el pago. Intenta otra vez.');
          setPhase('failed');
        }
        return;
      }

      setPhase('in_sheet');
      let outcome;
      try {
        outcome = await presentStripePaymentSheet(payment, { name: user?.name, email: user?.email });
      } catch (error) {
        const appError = error instanceof AppError ? error : null;
        setPhase(appError?.status === 501 ? 'unavailable' : 'failed');
        if (appError?.status !== 501) setMessage('No pudimos abrir el pago. Intenta otra vez.');
        return;
      }

      const next = phaseFromSheet(outcome);
      if (next === 'confirming') {
        await confirm(target);
        return;
      }
      if (outcome.status === 'failed') {
        haptics.error();
        setMessage(outcome.message ?? null);
      }
      setPhase(next);
    },
    [confirm, user?.email, user?.name],
  );

  /** From the review step: create the order (once), then pay it. */
  const checkoutAndPay = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      let target = order;
      if (!target) {
        setMessage(null);
        setPhase('creating_order');
        try {
          await ensureOnline();
          checkoutKey.current ??= uuidv4();
          target = await checkout(checkoutKey.current);
          checkoutKey.current = null;
          setOrder(target);
          queryClient.invalidateQueries({ queryKey: queryKeys.cart });
          queryClient.invalidateQueries({ queryKey: queryKeys.orders, exact: true });
        } catch (error) {
          setMessage(error instanceof AppError ? describeCommerceError(error) : 'No pudimos crear tu pedido. Intenta otra vez.');
          setPhase('review');
          return;
        }
      }
      await pay(target);
    } finally {
      busy.current = false;
    }
  }, [order, pay, queryClient]);

  /** "Pagar ahora" for an existing unpaid order (order detail / retry). */
  const payExisting = useCallback(async () => {
    if (busy.current || !order) return;
    busy.current = true;
    try {
      await pay(order);
    } finally {
      busy.current = false;
    }
  }, [order, pay]);

  return { phase, order, message, checkoutAndPay, payExisting, setOrder };
}
