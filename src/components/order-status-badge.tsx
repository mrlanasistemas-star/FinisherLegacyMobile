import { Badge } from '@/components/ui/badge';
import type { FulfillmentStatus, OrderStatus, PaymentStatus } from '@/types/models';

type BadgeVariant = 'neutral' | 'gold' | 'success' | 'warning' | 'destructive';

const ORDER_STATUS_COPY: Record<OrderStatus, { label: string; variant: BadgeVariant }> = {
  pending: { label: 'Pendiente', variant: 'neutral' },
  confirmed: { label: 'Confirmado', variant: 'gold' },
  completed: { label: 'Completado', variant: 'success' },
  cancelled: { label: 'Cancelado', variant: 'destructive' },
};

const PAYMENT_STATUS_COPY: Record<PaymentStatus, { label: string; variant: BadgeVariant }> = {
  pending: { label: 'Pago pendiente', variant: 'neutral' },
  authorized: { label: 'Pago autorizado', variant: 'gold' },
  paid: { label: 'Pagado', variant: 'success' },
  failed: { label: 'Pago fallido', variant: 'destructive' },
  refunded: { label: 'Reembolsado', variant: 'warning' },
  partially_refunded: { label: 'Reembolso parcial', variant: 'warning' },
  cancelled: { label: 'Pago cancelado', variant: 'destructive' },
};

const FULFILLMENT_STATUS_COPY: Record<FulfillmentStatus, { label: string; variant: BadgeVariant }> = {
  unfulfilled: { label: 'Sin enviar', variant: 'neutral' },
  partially_fulfilled: { label: 'Envío parcial', variant: 'gold' },
  fulfilled: { label: 'Enviado', variant: 'success' },
  cancelled: { label: 'Envío cancelado', variant: 'destructive' },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const copy = ORDER_STATUS_COPY[status] ?? { label: status, variant: 'neutral' as const };
  return <Badge label={copy.label} variant={copy.variant} />;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const copy = PAYMENT_STATUS_COPY[status] ?? { label: status, variant: 'neutral' as const };
  return <Badge label={copy.label} variant={copy.variant} />;
}

export function FulfillmentStatusBadge({ status }: { status: FulfillmentStatus }) {
  const copy = FULFILLMENT_STATUS_COPY[status] ?? { label: status, variant: 'neutral' as const };
  return <Badge label={copy.label} variant={copy.variant} />;
}
