import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';

import { checkout } from '@/api/checkout';
import { AppError } from '@/api/errors';
import { fetchOrder } from '@/api/orders';
import { createCheckoutSession } from '@/api/payments';
import { queryKeys } from '@/hooks/query-keys';
import { openOpenPayCheckout } from '@/payments/openpay-checkout';
import { CONFIRM_POLL_DELAYS_MS, phaseAfterPolling, phaseFromOrder, phaseFromSessionError, type BrowserOutcome, type PaymentPhase } from '@/payments/payment-flow';
import type { Order } from '@/types/models';
import { describeCommerceError } from '@/utils/commerce-errors';
import { haptics } from '@/utils/haptics';
import { ensureOnline } from '@/utils/network';
import { uuidv4 } from '@/utils/uuid';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Cart → Checkout → OpenPay (in-app browser) → Confirmation, end to end.
 *
 * Idempotency: the checkout key is created once per cart attempt and reused
 * until an order exists (a timeout/double tap never creates two orders).
 * Each "Pagar" mints a fresh one-time checkout URL for the SAME order; the
 * backend resumes a pending OpenPay charge (3-D Secure) instead of charging
 * twice.
 *
 * "Paid" is only ever set from the server (`GET /orders/{uuid}`, which
 * re-reads the charge from OpenPay) — never from the browser or its return
 * deep link.
 */
export function usePaymentFlow(initialOrder: Order | null = null) {
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<PaymentPhase>(initialOrder ? phaseFromOrder(initialOrder, null) : 'review');
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
    async (target: Order, outcome: BrowserOutcome): Promise<void> => {
      setPhase('confirming');
      let last: PaymentPhase = 'confirming';
      for (const delay of CONFIRM_POLL_DELAYS_MS) {
        try {
          const fresh = await fetchOrder(target.uuid);
          setOrder(fresh);
          refreshOrderCaches(fresh);
          last = phaseFromOrder(fresh, outcome);
          if (last !== 'confirming') {
            setPhase(last);
            if (last === 'paid') haptics.success();
            if (last === 'failed') haptics.error();
            return;
          }
        } catch {
          // Transient — keep polling; the webhook / next read settles it.
        }
        await wait(delay);
      }
      // Came back but no result yet: say so honestly ("aún no vemos tu pago").
      setPhase(phaseAfterPolling(last));
    },
    [refreshOrderCaches],
  );

  const pay = useCallback(
    async (target: Order): Promise<void> => {
      setMessage(null);
      setPhase('preparing');

      let session;
      try {
        await ensureOnline();
        session = await createCheckoutSession(target.uuid);
      } catch (error) {
        const appError = error instanceof AppError ? error : null;
        const next = phaseFromSessionError(appError);
        if (next === 'confirming') {
          await confirm(target, { type: 'returned' });
        } else if (next) {
          setPhase(next);
        } else {
          setMessage(appError ? describeCommerceError(appError) : 'No pudimos iniciar el pago. Intenta otra vez.');
          setPhase('failed');
        }
        return;
      }

      setPhase('in_browser');
      let outcome: BrowserOutcome;
      try {
        outcome = await openOpenPayCheckout(session);
      } catch {
        // The browser couldn't open — nothing was charged. Still ask the
        // server, in case a previous attempt settled meanwhile.
        outcome = { type: 'closed' };
        setMessage('No pudimos abrir la ventana de pago. Intenta otra vez.');
      }

      // Whatever the browser says, the server decides.
      await confirm(target, outcome);
    },
    [confirm],
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

  /** "Revisar de nuevo" from the pending state: one more server read. */
  const checkAgain = useCallback(async () => {
    if (busy.current || !order) return;
    busy.current = true;
    try {
      await confirm(order, { type: 'returned' });
    } finally {
      busy.current = false;
    }
  }, [confirm, order]);

  return { phase, order, message, checkoutAndPay, payExisting, checkAgain, setOrder };
}
