import { useLocalSearchParams } from 'expo-router';
import { Check, Lock, X } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandRefreshControl } from '@/components/motion/brand-refresh-control';
import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { AppError } from '@/api/errors';
import { cancelOrder } from '@/api/orders';
import { queryKeys } from '@/hooks/query-keys';
import { describeCommerceError } from '@/utils/commerce-errors';
import { haptics } from '@/utils/haptics';
import { ErrorState } from '@/components/error-state';
import { Skeleton } from '@/components/skeleton';
import { InlineError } from '@/components/ui/inline-error';
import { StickyFooter } from '@/components/ui/sticky-footer';
import { TopBar } from '@/components/ui/top-bar';
import { orderTimeline, paymentStateLabel, type StepState } from '@/features/commerce/order-timeline';
import { useOrder } from '@/hooks/use-orders';
import { usePaymentFlow } from '@/hooks/use-payment-flow';
import { useI18n } from '@/i18n';
import { paymentPhaseCopy } from '@/payments/payment-flow';
import { colors, fontFamily, radius, spacing } from '@/theme/tokens';
import type { Order } from '@/types/models';
import { formatDateTime } from '@/utils/dates';
import { formatMoney } from '@/utils/money';

export default function OrderDetailScreen() {
  const { t } = useI18n();
  const { uuid } = useLocalSearchParams<{ uuid: string }>();
  const { data: order, isPending, isError, error, refetch, isRefetching } = useOrder(uuid, { watchSettlement: true });

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <TopBar title={order ? t('Pedido #{number}', { number: order.order_number }) : t('Pedido')} />
      </View>
      {isPending ? (
        <View style={{ padding: spacing.lg, gap: spacing.md }}>
          <Skeleton height={34} width="60%" />
          <Skeleton height={160} radius={18} />
          <Skeleton height={120} radius={18} />
        </View>
      ) : isError || !order ? (
        <ErrorState error={error} message={t('No pudimos cargar este pedido.')} onRetry={refetch} />
      ) : (
        <OrderDetail order={order} refreshing={isRefetching} onRefresh={refetch} />
      )}
    </SafeAreaView>
  );
}

function OrderDetail({ order, refreshing, onRefresh }: { order: Order; refreshing: boolean; onRefresh: () => void }) {
  const { t } = useI18n();
  const flow = usePaymentFlow(order);
  const current = flow.order ?? order;
  const steps = orderTimeline(current);
  const state = paymentStateLabel(current.payment_state);
  const busy = ['preparing', 'in_browser', 'confirming'].includes(flow.phase);
  const queryClient = useQueryClient();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // "Cancelar pedido": the server re-checks (unpaid, no card attempt in
  // progress) under a lock and releases the reserved stock and coupon.
  async function cancel() {
    setCancelling(true);
    setCancelError(null);
    try {
      const updated = await cancelOrder(current.uuid);
      flow.setOrder(updated);
      queryClient.setQueryData(queryKeys.order(updated.uuid), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.orders, exact: true });
      haptics.success();
      setConfirmCancel(false);
    } catch (error) {
      setCancelError(error instanceof AppError ? describeCommerceError(error) : t('No pudimos cancelar el pedido. Intenta otra vez.'));
      setConfirmCancel(false);
      onRefresh();
    } finally {
      setCancelling(false);
    }
  }

  // Keep the flow's copy of the order in sync with refetches (webhook updates).
  useEffect(() => {
    flow.setOrder(order);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setOrder is stable; only react to new server data
  }, [order]);

  const statusTitle =
    current.status === 'cancelled' && current.payment_state !== 'paid'
      ? t('Pedido cancelado')
      : current.fulfillment_status === 'fulfilled'
        ? t('Entregado')
        : current.payment_state === 'paid'
          ? t('Pagado · en preparación')
          : state.label;

  return (
    <>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.lg }}
        refreshControl={<BrandRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={{ gap: 4 }}>
          <AppText variant="title" style={{ fontSize: 24 }} accessibilityRole="header">
            {statusTitle}
          </AppText>
          <AppText variant="caption" tone="muted">
            {formatDateTime(current.created_at)}
          </AppText>
          {current.payment_state === 'processing' ? (
            <AppText variant="caption" tone="gold" accessibilityLiveRegion="polite">
              {t('Tu banco está confirmando el pago. Esta pantalla se actualiza sola.')}
            </AppText>
          ) : null}
          {current.payable && current.expires_at && current.payment_state !== 'processing' ? (
            <AppText variant="caption" tone="gold">
              {t('Apartado hasta {date}', { date: formatDateTime(current.expires_at) })}
            </AppText>
          ) : null}
        </View>

        <View accessibilityRole="list" style={{ padding: spacing.md, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.hairline }}>
          {steps.map((step, index) => (
            <TimelineRow key={step.key} label={step.label} state={step.state} at={step.at} last={index === steps.length - 1} />
          ))}
        </View>

        <View style={{ gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.hairline }}>
          <AppText variant="eyebrow" tone="subtle">{t('Productos')}</AppText>
          {(current.items ?? []).map((item) => (
            <View key={item.uuid} style={{ flexDirection: 'row', gap: spacing.sm }}>
              <AppText variant="body" tone="muted" style={{ width: 28 }}>
                {item.quantity}×
              </AppText>
              <View style={{ flex: 1 }}>
                <AppText variant="body" numberOfLines={2}>
                  {item.name}
                </AppText>
                {item.variant_name ? (
                  <AppText variant="caption" tone="muted">
                    {item.variant_name}
                  </AppText>
                ) : null}
                {item.fulfilled ? (
                  <AppText variant="caption" style={{ color: colors.success }}>
                    {t('Entregado')}
                  </AppText>
                ) : null}
              </View>
              <AppText variant="body">{formatMoney(item.line_total_minor, item.currency)}</AppText>
            </View>
          ))}
        </View>

        <DeliveryCard order={current} />

        <View style={{ gap: spacing.xs, paddingHorizontal: spacing.md }}>
          <Row label={t('Subtotal')} value={formatMoney(current.subtotal_minor, current.currency)} />
          {current.discount_minor > 0 ? <Row label={current.coupon_code ? t('Descuento ({code})', { code: current.coupon_code }) : t('Descuento')} value={`−${formatMoney(current.discount_minor, current.currency)}`} /> : null}
          {current.tax_minor > 0 ? <Row label={t('Impuestos')} value={formatMoney(current.tax_minor, current.currency)} /> : null}
          {current.delivery?.method === 'shipping' ? <Row label={t('Envío')} value={(current.shipping_minor ?? 0) > 0 ? formatMoney(current.shipping_minor ?? 0, current.currency) : t('Sin costo')} /> : null}
          <Row label={t('Total')} value={formatMoney(current.total_minor, current.currency)} strong />
        </View>
      </ScrollView>

      {/* Digital goods are never paid in the app (store policies): no button. */}
      {current.payable && current.app_payable !== false && current.payment_state !== 'processing' ? (
        <StickyFooter>
          {flow.phase === 'failed' ? <InlineError message={flow.message ?? paymentPhaseCopy('failed').message} /> : null}
          {flow.phase === 'unavailable' ? <InlineError message={paymentPhaseCopy('unavailable').message} /> : null}
          {flow.phase === 'pending' || flow.phase === 'cancelled' ? (
            <AppText variant="caption" tone="muted" align="center" accessibilityLiveRegion="polite">
              {paymentPhaseCopy(flow.phase).message}
            </AppText>
          ) : null}
          <AppButton
            label={busy ? paymentPhaseCopy(flow.phase).title : t('Pagar {total}', { total: formatMoney(current.total_minor, current.currency) })}
            icon={Lock}
            loading={busy}
            onPress={flow.payExisting}
          />
          {current.cancellable && !busy ? <AppButton label={t('Cancelar pedido')} variant="ghost" onPress={() => setConfirmCancel(true)} /> : null}
          <InlineError message={cancelError} />
        </StickyFooter>
      ) : current.cancellable ? (
        // Unpaid but not payable here (e.g. digital goods): it can still be cancelled.
        <StickyFooter>
          <InlineError message={cancelError} />
          <AppButton label={t('Cancelar pedido')} variant="ghost" onPress={() => setConfirmCancel(true)} />
        </StickyFooter>
      ) : null}

      <ConfirmDialog
        visible={confirmCancel}
        title={t('¿Cancelar este pedido?')}
        description={t('Liberamos las piezas apartadas y no se te cobrará nada. Si quieres comprar después, haces un pedido nuevo.')}
        confirmLabel={t('Cancelar pedido')}
        loading={cancelling}
        onConfirm={cancel}
        onCancel={() => setConfirmCancel(false)}
      />
    </>
  );
}

/** How and where it is delivered, plus carrier/tracking once shipped. */
function DeliveryCard({ order }: { order: Order }) {
  const { t } = useI18n();
  const delivery = order.delivery;
  if (!delivery) return null;
  const address = delivery.address;
  const lines = address
    ? [address.line, address.neighborhood, [address.postal_code, address.city].filter(Boolean).join(' '), address.state].filter((part): part is string => !!part && part.trim() !== '')
    : [];
  const shipment = order.shipment;

  return (
    <View style={{ gap: spacing.xs, padding: spacing.md, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.hairline }}>
      <AppText variant="eyebrow" tone="subtle">{t('Entrega')}</AppText>
      <AppText variant="body">{delivery.method === 'shipping' ? t('Envío a domicilio') : delivery.method === 'in_person' ? t('Entrega inmediata') : t('Recoger en evento o punto de entrega')}</AppText>
      {lines.map((line) => (
        <AppText key={line} variant="caption" tone="muted">
          {line}
        </AppText>
      ))}
      {shipment?.tracking_number ? (
        <AppText variant="caption" selectable>
          {shipment.carrier ? t('{carrier} · guía {number}', { carrier: shipment.carrier, number: shipment.tracking_number }) : t('Guía {number}', { number: shipment.tracking_number })}
        </AppText>
      ) : null}
      {shipment?.shipped_at ? (
        <AppText variant="caption" tone="muted">
          {t('Enviado el {date}', { date: formatDateTime(shipment.shipped_at) })}
        </AppText>
      ) : null}
    </View>
  );
}

function TimelineRow({ label, state, at, last }: { label: string; state: StepState; at?: string | null; last: boolean }) {
  const { t } = useI18n();
  const dotColor = state === 'done' ? colors.gold : state === 'current' ? colors.gold : state === 'failed' ? colors.destructive : colors.surfaceMuted;
  return (
    <View style={{ flexDirection: 'row', gap: spacing.md }} accessibilityLabel={state === 'done' ? t('{label}, completado', { label }) : state === 'current' ? t('{label}, en curso', { label }) : label}>
      <View style={{ alignItems: 'center', width: 22 }}>
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: state === 'done' || state === 'failed' ? dotColor : 'transparent',
            borderWidth: state === 'done' || state === 'failed' ? 0 : 2,
            borderColor: dotColor,
          }}>
          {state === 'done' ? <Check size={13} color={colors.black} strokeWidth={3} /> : state === 'failed' ? <X size={13} color={colors.white} strokeWidth={3} /> : null}
        </View>
        {!last ? <View style={{ width: 2, flex: 1, minHeight: 20, backgroundColor: state === 'done' ? colors.goldDim : colors.surfaceMuted }} /> : null}
      </View>
      <View style={{ flex: 1, paddingBottom: last ? 0 : spacing.md }}>
        <AppText style={{ fontFamily: state === 'upcoming' ? fontFamily.regular : fontFamily.semibold, fontSize: 15, color: state === 'upcoming' ? colors.subtle : colors.foreground }}>{label}</AppText>
        {at ? (
          <AppText variant="caption" tone="muted">
            {formatDateTime(at)}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <AppText style={{ fontFamily: strong ? fontFamily.semibold : fontFamily.regular, fontSize: strong ? 17 : 15, color: strong ? colors.foreground : colors.muted }}>{label}</AppText>
      <AppText style={{ fontFamily: strong ? fontFamily.heading : fontFamily.medium, fontSize: strong ? 18 : 15, color: colors.foreground }}>{value}</AppText>
    </View>
  );
}
