import type { Order, PaymentState } from '@/types/models';

/**
 * The checkout → OpenPay in-app browser → confirmation state machine, kept
 * pure so it can be tested without a browser. The rules it encodes:
 *
 *  - The app only ever shows "Pago confirmado" when the SERVER says the
 *    order is paid (`GET /orders/{uuid}`, which re-reads the charge from
 *    OpenPay). Coming back from the browser only means "confirming…".
 *  - The return deep link carries no result and is never trusted.
 *  - Closing the browser is not a failure: the order is kept and can be
 *    paid again (the backend resumes a pending 3-D Secure charge instead of
 *    charging twice).
 */
export type PaymentPhase =
  | 'review' // summary / unpaid order, nothing in flight
  | 'creating_order' // POST /checkout in flight
  | 'preparing' // POST /orders/{uuid}/checkout-session in flight
  | 'in_browser' // OpenPay web checkout open in the in-app browser
  | 'confirming' // browser closed, asking the server
  | 'paid'
  | 'processing' // bank still processing — final state arrives later
  | 'pending' // came back but the server hasn't seen a result yet — check again / retry
  | 'failed' // declined / error — can retry the same order
  | 'cancelled' // athlete closed the browser before paying — can retry
  | 'expired' // order no longer payable — start over from the cart
  | 'not_app_payable' // digital goods: never paid in the app (store policies)
  | 'unavailable'; // OpenPay not configured in this environment

/** The in-app browser's verdict — never "paid", only how it closed. */
export type BrowserOutcome = { type: 'returned' } | { type: 'closed' };

/** Must match `finisher.payments.app_checkout.return_url` on the backend. */
export const CHECKOUT_RETURN_URL = 'finisherlegacy://checkout/return';

/** expo-web-browser's `openAuthSessionAsync` result → BrowserOutcome. */
export function browserOutcome(result: { type: string; url?: string }): BrowserOutcome {
  return result.type === 'success' && typeof result.url === 'string' && result.url.startsWith(CHECKOUT_RETURN_URL)
    ? { type: 'returned' }
    : { type: 'closed' };
}

/**
 * Where the flow lands once the server has spoken about an order.
 * `outcome` is null when no browser was opened in this flow (an order loaded
 * from "Mis pedidos").
 */
export function phaseFromOrder(order: Pick<Order, 'payment_state' | 'payable' | 'app_payable'>, outcome: BrowserOutcome | null): PaymentPhase {
  const map: Record<Exclude<PaymentState, 'pending'>, PaymentPhase> = {
    paid: 'paid',
    processing: 'processing',
    failed: 'failed',
    cancelled: 'expired',
    refunded: 'expired',
  };

  if (order.payment_state !== 'pending') {
    const phase = map[order.payment_state];
    // A failed attempt on an order that can no longer be paid is a dead end.
    return phase === 'failed' && !order.payable ? 'expired' : phase;
  }

  if (!order.payable) return 'expired';
  if (order.app_payable === false) return 'not_app_payable';
  if (outcome === null) return 'review';
  // Came back: keep confirming (poll) — never claim success early.
  return outcome.type === 'returned' ? 'confirming' : 'cancelled';
}

/** After the confirm polls run out, a still-"confirming" order becomes honest "pending". */
export function phaseAfterPolling(phase: PaymentPhase): PaymentPhase {
  return phase === 'confirming' ? 'pending' : phase;
}

/** Error code from `POST /checkout-session` → phase (null = generic failure). */
export function phaseFromSessionError(error: { status?: number; code?: string } | null): PaymentPhase | null {
  if (!error) return null;
  if (error.status === 501) return 'unavailable';
  if (error.code === 'ORDER_EXPIRED' || error.code === 'ORDER_NOT_PAYABLE') return 'expired';
  if (error.code === 'ORDER_NOT_APP_PAYABLE') return 'not_app_payable';
  if (error.code === 'PAYMENT_ALREADY_RECORDED') return 'confirming';
  return null;
}

/** Only these phases let the athlete tap "Pagar" (again). */
export function canStartPayment(phase: PaymentPhase): boolean {
  return phase === 'review' || phase === 'failed' || phase === 'cancelled' || phase === 'pending';
}

export function isTerminalSuccess(phase: PaymentPhase): boolean {
  return phase === 'paid' || phase === 'processing';
}

/** Backoff for polling the server after the browser closes: ~1s, 2s, 3s, 5s, 8s. */
export const CONFIRM_POLL_DELAYS_MS = [1000, 2000, 3000, 5000, 8000] as const;

export const PAYMENT_PHASE_COPY: Record<PaymentPhase, { title: string; message: string }> = {
  review: { title: 'Confirma tu pedido', message: '' },
  creating_order: { title: 'Creando tu pedido…', message: 'Estamos apartando tus productos.' },
  preparing: { title: 'Preparando el pago…', message: 'Un momento.' },
  in_browser: { title: 'Completa tu pago', message: 'Termina el pago en la ventana segura de OpenPay.' },
  confirming: { title: 'Confirmando tu pago…', message: 'Esto toma solo unos segundos.' },
  paid: { title: 'Pago confirmado', message: 'Listo. Tu pedido ya es parte de tu Legacy.' },
  processing: { title: 'Pago en proceso', message: 'Tu banco lo está procesando. Te avisaremos cuando se confirme.' },
  pending: { title: 'Aún no vemos tu pago', message: 'Si ya pagaste, en unos momentos se confirmará aquí. Si no, puedes intentarlo otra vez: no se cobra dos veces.' },
  failed: { title: 'El pago no se completó', message: 'Tu tarjeta no fue cargada. Puedes intentarlo otra vez o usar otra tarjeta.' },
  cancelled: { title: 'Pago sin terminar', message: 'Tu pedido sigue apartado por un rato. Puedes pagarlo cuando quieras.' },
  expired: { title: 'Este pedido ya no se puede pagar', message: 'El tiempo para pagarlo terminó. Vuelve a tu carrito para crear uno nuevo.' },
  not_app_payable: { title: 'Este pedido no se paga en la app', message: 'Este tipo de producto no está disponible para pago en la app.' },
  unavailable: { title: 'Pago en línea no disponible', message: 'El pago con tarjeta todavía no está activo. Tu pedido quedó guardado en Mis pedidos.' },
};

/**
 * After the in-flow polls, a "processing" order keeps being polled
 * (GET /orders/{uuid}) until it settles: every 4s for the first minute, then
 * every 10s, giving up after ~4 minutes (the order screen and push
 * notification take over from there).
 */
export function settlementPollInterval(elapsedMs: number): number | false {
  if (elapsedMs >= 4 * 60_000) return false;
  return elapsedMs < 60_000 ? 4000 : 10_000;
}

/** Whether an order still needs watching for the server-side payment outcome. */
export function isAwaitingSettlement(order: Pick<Order, 'payment_state'>): boolean {
  return order.payment_state === 'processing';
}
