import { t } from '@/i18n';
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
  const steps: TimelineStep[] = [{ key: 'created', label: t('Pedido creado'), state: 'done', at: order.created_at }];
  const paid = order.payment_state === 'paid' || order.payment_state === 'refunded';

  if (order.status === 'cancelled' && !paid) {
    steps.push({ key: 'cancelled', label: t('Pedido cancelado'), state: 'failed', at: order.cancelled_at });
    return steps;
  }

  const paymentStep: Record<PaymentState, TimelineStep> = {
    paid: { key: 'paid', label: t('Pago confirmado'), state: 'done', at: order.payment?.paid_at },
    refunded: { key: 'paid', label: t('Pago reembolsado'), state: 'done', at: order.payment?.paid_at },
    processing: { key: 'paid', label: t('Pago en proceso'), state: 'current' },
    pending: { key: 'paid', label: t('Pago pendiente'), state: 'current' },
    failed: { key: 'paid', label: t('El pago no se completó'), state: 'failed', at: order.payment?.failed_at },
    cancelled: { key: 'paid', label: t('Pago cancelado'), state: 'failed' },
  };
  steps.push(paymentStep[order.payment_state]);

  if (order.fulfillment_status === 'fulfilled' || order.status === 'completed') {
    steps.push({ key: 'delivered', label: t('Entregado'), state: 'done', at: order.completed_at });
  } else if (order.fulfillment_status === 'partially_fulfilled') {
    steps.push({ key: 'delivered', label: t('Entrega parcial'), state: 'current' });
  } else {
    steps.push({ key: 'preparing', label: t('Preparando tu pedido'), state: paid ? 'current' : 'upcoming' });
    steps.push({ key: 'delivered', label: t('Entregado'), state: 'upcoming' });
  }

  return steps;
}

/** A function, not a table: the label is resolved in the language active when it is shown. */
export function paymentStateLabel(state: PaymentState): { label: string; tone: 'gold' | 'success' | 'destructive' | 'muted' } {
  switch (state) {
    case 'pending':
      return { label: t('Pago pendiente'), tone: 'gold' };
    case 'processing':
      return { label: t('Pago en proceso'), tone: 'gold' };
    case 'paid':
      return { label: t('Pagado'), tone: 'success' };
    case 'failed':
      return { label: t('Pago no completado'), tone: 'destructive' };
    case 'cancelled':
      return { label: t('Cancelado'), tone: 'muted' };
    case 'refunded':
      return { label: t('Reembolsado'), tone: 'muted' };
  }
}
