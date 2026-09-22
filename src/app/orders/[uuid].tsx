import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { ErrorState } from '@/components/error-state';
import { FulfillmentStatusBadge, OrderStatusBadge, PaymentStatusBadge } from '@/components/order-status-badge';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { AppError } from '@/api/errors';
import { useOrder } from '@/hooks/use-orders';
import { useCreateOnlinePayment } from '@/hooks/use-payments';
import { isGatewayUnconfiguredError } from '@/payments/gateway-adapter';
import { colors, spacing } from '@/theme/tokens';
import { formatLongDate } from '@/utils/dates';
import { formatMoney } from '@/utils/money';

export default function OrderDetailScreen() {
  const { uuid } = useLocalSearchParams<{ uuid: string }>();
  const { data: order, isPending, isError, refetch } = useOrder(uuid);
  const payment = useCreateOnlinePayment(uuid);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);

  async function handlePayNow() {
    setPaymentMessage(null);
    try {
      await payment.mutateAsync();
      setPaymentMessage('Iniciamos tu pago. Actualiza esta pantalla en unos momentos.');
    } catch (error) {
      if (error instanceof AppError && isGatewayUnconfiguredError(error.status)) {
        setPaymentMessage('El pago en línea todavía no está disponible en esta cuenta.');
      } else {
        setPaymentMessage(error instanceof AppError ? error.message : 'No pudimos iniciar tu pago.');
      }
    }
  }

  if (isPending) {
    return (
      <Screen edges={['top', 'left', 'right']}>
        <ScreenHeader title="Pedido" />
        <Skeleton height={200} />
      </Screen>
    );
  }

  if (isError || !order) {
    return (
      <Screen edges={['top', 'left', 'right']}>
        <ScreenHeader title="Pedido" />
        <ErrorState message="No pudimos cargar este pedido." onRetry={refetch} />
      </Screen>
    );
  }

  const canPayNow = order.payment_status === 'pending' || order.payment_status === 'failed';

  return (
    <Screen scroll edges={['top', 'left', 'right']}>
      <ScreenHeader title={`Pedido #${order.order_number}`} />

      <View style={{ gap: spacing.lg, paddingBottom: spacing.xl }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          <OrderStatusBadge status={order.status} />
          <PaymentStatusBadge status={order.payment_status} />
          <FulfillmentStatusBadge status={order.fulfillment_status} />
        </View>

        <AppText variant="caption" tone="muted">
          {formatLongDate(order.created_at.slice(0, 10))}
        </AppText>

        <View>
          <AppText variant="label" tone="muted" style={{ marginBottom: spacing.xs }}>
            PRODUCTOS
          </AppText>
          <View style={{ gap: spacing.sm }}>
            {order.items.map((item) => (
              <View key={item.uuid} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, marginRight: spacing.sm }}>
                  <AppText variant="body" numberOfLines={2}>
                    {item.quantity}× {item.name}
                  </AppText>
                  <AppText variant="caption" tone="muted">
                    {item.sku}
                  </AppText>
                </View>
                <AppText variant="body">{formatMoney(item.line_total_minor, item.currency)}</AppText>
              </View>
            ))}
          </View>
        </View>

        <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, gap: spacing.xxs }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText variant="body" tone="muted">
              Subtotal
            </AppText>
            <AppText variant="body">{formatMoney(order.subtotal_minor, order.currency)}</AppText>
          </View>
          {order.discount_minor > 0 ? (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <AppText variant="body" tone="muted">
                Descuento
              </AppText>
              <AppText variant="body" tone="gold">
                -{formatMoney(order.discount_minor, order.currency)}
              </AppText>
            </View>
          ) : null}
          {order.tax_minor > 0 ? (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <AppText variant="body" tone="muted">
                Impuestos
              </AppText>
              <AppText variant="body">{formatMoney(order.tax_minor, order.currency)}</AppText>
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xxs }}>
            <AppText variant="subtitle">Total</AppText>
            <AppText variant="subtitle" tone="gold">
              {formatMoney(order.total_minor, order.currency)}
            </AppText>
          </View>
        </View>

        {canPayNow ? (
          <View style={{ gap: spacing.xs }}>
            {paymentMessage ? (
              <AppText variant="caption" tone="muted">
                {paymentMessage}
              </AppText>
            ) : null}
            <AppButton label="Pagar ahora" onPress={handlePayNow} loading={payment.isPending} />
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
