import type { Order, PaymentState } from '@/types/models';

/**
 * The checkout → payment → confirmation state machine, kept pure so it can
 * be tested without Stripe. The rule it encodes: the app only ever shows
 * "Pago confirmado" when the SERVER says the order is paid. The payment
 * sheet closing successfully only means "confirming…".
 */
export type PaymentPhase =
  | 'review' // cart summary, nothing created yet
  | 'creating_order' // POST /checkout in flight
  | 'preparing' // POST /payments/online in flight
  | 'in_sheet' // Stripe PaymentSheet is on screen
  | 'confirming' // sheet closed OK, asking the server
  | 'paid'
  | 'processing' // bank still processing — final state arrives later
  | 'failed' // declined / error — can retry the same order
  | 'cancelled' // athlete closed the sheet — can retry
  | 'expired' // order no longer payable — start over from the cart
  | 'unavailable'; // gateway not configured in this environment

export type SheetOutcome = { status: 'completed' } | { status: 'canceled' } | { status: 'failed'; message?: string };

/** Where the flow lands once the server has spoken about an order. */
export function phaseFromOrder(order: Pick<Order, 'payment_state' | 'payable'>, sheetCompleted: boolean): PaymentPhase {
  const map: Record<PaymentState, PaymentPhase> = {
    paid: 'paid',
    processing: 'processing',
    failed: 'failed',
    cancelled: 'expired',
    refunded: 'expired',
    // Sheet said OK but the server hasn't seen the charge yet → keep
    // confirming (poll), never claim success early.
    pending: sheetCompleted ? 'confirming' : 'failed',
  };

  const phase = map[order.payment_state];
  if ((phase === 'failed' || phase === 'confirming') && !order.payable && order.payment_state !== 'paid') {
    return order.payment_state === 'pending' && sheetCompleted ? 'confirming' : 'expired';
  }
  return phase;
}

export function phaseFromSheet(outcome: SheetOutcome): PaymentPhase {
  switch (outcome.status) {
    case 'completed':
      return 'confirming';
    case 'canceled':
      return 'cancelled';
    default:
      return 'failed';
  }
}

/** Only these phases let the athlete tap "Pagar" (again). */
export function canStartPayment(phase: PaymentPhase): boolean {
  return phase === 'review' || phase === 'failed' || phase === 'cancelled';
}

export function isTerminalSuccess(phase: PaymentPhase): boolean {
  return phase === 'paid' || phase === 'processing';
}

/** Backoff for polling the server after the sheet closes: ~1s, 2s, 3s, 5s, 8s. */
export const CONFIRM_POLL_DELAYS_MS = [1000, 2000, 3000, 5000, 8000] as const;

export const PAYMENT_PHASE_COPY: Record<PaymentPhase, { title: string; message: string }> = {
  review: { title: 'Confirma tu pedido', message: '' },
  creating_order: { title: 'Creando tu pedido…', message: 'Estamos apartando tus productos.' },
  preparing: { title: 'Preparando el pago…', message: 'Un momento.' },
  in_sheet: { title: 'Completa tu pago', message: '' },
  confirming: { title: 'Confirmando tu pago…', message: 'Esto toma solo unos segundos.' },
  paid: { title: 'Pago confirmado', message: 'Listo. Tu pedido ya es parte de tu Legacy.' },
  processing: { title: 'Pago en proceso', message: 'Tu banco lo está procesando. Te avisaremos cuando se confirme.' },
  failed: { title: 'El pago no se completó', message: 'Tu tarjeta no fue cargada. Puedes intentarlo otra vez o usar otro método.' },
  cancelled: { title: 'Pago cancelado', message: 'Tu pedido sigue apartado por un rato. Puedes pagarlo cuando quieras.' },
  expired: { title: 'Este pedido ya no se puede pagar', message: 'El tiempo para pagarlo terminó. Vuelve a tu carrito para crear uno nuevo.' },
  unavailable: { title: 'Pago en línea no disponible', message: 'El pago con tarjeta todavía no está activo. Tu pedido quedó guardado en Mis pedidos.' },
};
