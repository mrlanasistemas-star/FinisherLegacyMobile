import { useLocalSearchParams } from 'expo-router';
import { Check, Lock, X } from 'lucide-react-native';
import { useEffect } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { ErrorState } from '@/components/error-state';
import { Skeleton } from '@/components/skeleton';
import { InlineError } from '@/components/ui/inline-error';
import { StickyFooter } from '@/components/ui/sticky-footer';
import { TopBar } from '@/components/ui/top-bar';
import { orderTimeline, PAYMENT_STATE_LABEL, type StepState } from '@/features/commerce/order-timeline';
import { useOrder } from '@/hooks/use-orders';
import { usePaymentFlow } from '@/hooks/use-payment-flow';
import { PAYMENT_PHASE_COPY } from '@/payments/payment-flow';
import { colors, fontFamily, spacing } from '@/theme/tokens';
import type { Order } from '@/types/models';
import { formatDateTime } from '@/utils/dates';
import { formatMoney } from '@/utils/money';

export default function OrderDetailScreen() {
  const { uuid } = useLocalSearchParams<{ uuid: string }>();
  const { data: order, isPending, isError, error, refetch, isRefetching } = useOrder(uuid);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.black }}>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <TopBar title={order ? `Pedido #${order.order_number}` : 'Pedido'} />
      </View>
      {isPending ? (
        <View style={{ padding: spacing.lg, gap: spacing.md }}>
          <Skeleton height={80} />
          <Skeleton height={160} />
        </View>
      ) : isError || !order ? (
        <ErrorState error={error} message="No pudimos cargar este pedido." onRetry={refetch} />
      ) : (
        <OrderDetail order={order} refreshing={isRefetching} onRefresh={refetch} />
      )}
    </SafeAreaView>
  );
}

function OrderDetail({ order, refreshing, onRefresh }: { order: Order; refreshing: boolean; onRefresh: () => void }) {
  const flow = usePaymentFlow(order);
  const current = flow.order ?? order;
  const steps = orderTimeline(current);
  const state = PAYMENT_STATE_LABEL[current.payment_state];
  const busy = ['preparing', 'in_sheet', 'confirming'].includes(flow.phase);

  // Keep the flow's copy of the order in sync with refetches (webhook updates).
  useEffect(() => {
    flow.setOrder(order);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setOrder is stable; only react to new server data
  }, [order]);

  const statusTitle =
    current.status === 'cancelled' && current.payment_state !== 'paid'
      ? 'Pedido cancelado'
      : current.fulfillment_status === 'fulfilled'
        ? 'Entregado'
        : current.payment_state === 'paid'
          ? 'Pagado · en preparación'
          : state.label;

  return (
    <>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.lg }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}>
        <View style={{ gap: 4 }}>
          <AppText variant="title" style={{ fontSize: 24 }} accessibilityRole="header">
            {statusTitle}
          </AppText>
          <AppText variant="caption" tone="muted">
            {formatDateTime(current.created_at)}
          </AppText>
          {current.payable && current.expires_at && current.payment_state !== 'processing' ? (
            <AppText variant="caption" tone="gold">
              Apartado hasta {formatDateTime(current.expires_at)}
            </AppText>
          ) : null}
        </View>

        <View accessibilityRole="list">
          {steps.map((step, index) => (
            <TimelineRow key={step.key} label={step.label} state={step.state} at={step.at} last={index === steps.length - 1} />
          ))}
        </View>

        <View style={{ gap: spacing.sm }}>
          <AppText variant="label" tone="muted">
            PRODUCTOS
          </AppText>
          {(current.items ?? []).map((item) => (
            <View key={item.uuid} style={{ flexDirection: 'row', gap: spacing.sm }}>
              <AppText variant="body" tone="muted" style={{ width: 28 }}>
                {item.quantity}×
              </AppText>
              <View style={{ flex: 1 }}>
                <AppText variant="body" numberOfLines={2}>
                  {item.name}
                </AppText>
                {item.fulfilled ? (
                  <AppText variant="caption" style={{ color: colors.success }}>
                    Entregado
                  </AppText>
                ) : null}
              </View>
              <AppText variant="body">{formatMoney(item.line_total_minor, item.currency)}</AppText>
            </View>
          ))}
        </View>

        <View style={{ gap: spacing.xs, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.hairline }}>
          <Row label="Subtotal" value={formatMoney(current.subtotal_minor, current.currency)} />
          {current.discount_minor > 0 ? <Row label={`Descuento${current.coupon_code ? ` (${current.coupon_code})` : ''}`} value={`−${formatMoney(current.discount_minor, current.currency)}`} /> : null}
          {current.tax_minor > 0 ? <Row label="Impuestos" value={formatMoney(current.tax_minor, current.currency)} /> : null}
          <Row label="Total" value={formatMoney(current.total_minor, current.currency)} strong />
        </View>
      </ScrollView>

      {current.payable && current.payment_state !== 'processing' ? (
        <StickyFooter>
          {flow.phase === 'failed' ? <InlineError message={flow.message ?? PAYMENT_PHASE_COPY.failed.message} /> : null}
          {flow.phase === 'unavailable' ? <InlineError message={PAYMENT_PHASE_COPY.unavailable.message} /> : null}
          <AppButton
            label={busy ? PAYMENT_PHASE_COPY[flow.phase].title : `Pagar ${formatMoney(current.total_minor, current.currency)}`}
            icon={Lock}
            loading={busy}
            onPress={flow.payExisting}
          />
        </StickyFooter>
      ) : null}
    </>
  );
}

function TimelineRow({ label, state, at, last }: { label: string; state: StepState; at?: string | null; last: boolean }) {
  const dotColor = state === 'done' ? colors.gold : state === 'current' ? colors.goldSoft : state === 'failed' ? colors.destructive : colors.graphiteLight;
  return (
    <View style={{ flexDirection: 'row', gap: spacing.md }} accessibilityLabel={`${label}${state === 'done' ? ', completado' : state === 'current' ? ', en curso' : ''}`}>
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
        {!last ? <View style={{ width: 2, flex: 1, minHeight: 20, backgroundColor: state === 'done' ? colors.goldDim : colors.graphiteLight }} /> : null}
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
      <AppText style={{ fontFamily: strong ? fontFamily.bold : fontFamily.medium, fontSize: strong ? 18 : 15, color: colors.foreground }}>{value}</AppText>
    </View>
  );
}
