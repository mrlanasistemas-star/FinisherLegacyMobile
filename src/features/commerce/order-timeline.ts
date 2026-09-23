import type { Order, PaymentState } from '@/types/models';

export type StepState = 'done' | 'current' | 'upcoming' | 'failed';

export interface TimelineStep {
  key: string;
  label: string;
  state: StepState;
  at?: string | null;
}

/**
 * Only the steps that apply to this order: created → paid → preparing →
 * delivered, or a single "cancelled" ending. Production/shipping details
 * the backend doesn't track are never invented.
 */
export function orderTimeline(order: Pick<Order, 'status' | 'payment_state' | 'fulfillment_status' | 'created_at' | 'cancelled_at' | 'completed_at' | 'payment'>): TimelineStep[] {
  const steps: TimelineStep[] = [{ key: 'created', label: 'Pedido creado', state: 'done', at: order.created_at }];
  const paid = order.payment_state === 'paid' || order.payment_state === 'refunded';

  if (order.status === 'cancelled' && !paid) {
    steps.push({ key: 'cancelled', label: 'Pedido cancelado', state: 'failed', at: order.cancelled_at });
    return steps;
  }

  const paymentStep: Record<PaymentState, TimelineStep> = {
    paid: { key: 'paid', label: 'Pago confirmado', state: 'done', at: order.payment?.paid_at },
    refunded: { key: 'paid', label: 'Pago reembolsado', state: 'done', at: order.payment?.paid_at },
    processing: { key: 'paid', label: 'Pago en proceso', state: 'current' },
    pending: { key: 'paid', label: 'Pago pendiente', state: 'current' },
    failed: { key: 'paid', label: 'El pago no se completó', state: 'failed', at: order.payment?.failed_at },
    cancelled: { key: 'paid', label: 'Pago cancelado', state: 'failed' },
  };
  steps.push(paymentStep[order.payment_state]);

  if (order.fulfillment_status === 'fulfilled' || order.status === 'completed') {
    steps.push({ key: 'delivered', label: 'Entregado', state: 'done', at: order.completed_at });
  } else if (order.fulfillment_status === 'partially_fulfilled') {
    steps.push({ key: 'delivered', label: 'Entrega parcial', state: 'current' });
  } else {
    steps.push({ key: 'preparing', label: 'Preparando tu pedido', state: paid ? 'current' : 'upcoming' });
    steps.push({ key: 'delivered', label: 'Entregado', state: 'upcoming' });
  }

  return steps;
}

export const PAYMENT_STATE_LABEL: Record<PaymentState, { label: string; tone: 'gold' | 'success' | 'destructive' | 'muted' }> = {
  pending: { label: 'Pago pendiente', tone: 'gold' },
  processing: { label: 'Pago en proceso', tone: 'gold' },
  paid: { label: 'Pagado', tone: 'success' },
  failed: { label: 'Pago no completado', tone: 'destructive' },
  cancelled: { label: 'Cancelado', tone: 'muted' },
  refunded: { label: 'Reembolsado', tone: 'muted' },
};
