import { router } from 'expo-router';
import { CircleAlert, Clock, Lock, PartyPopper, ShieldCheck, X } from 'lucide-react-native';
import { useEffect } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { GoldGlow } from '@/components/brand/gold-glow';
import { EmptyState } from '@/components/empty-state';
import { Skeleton } from '@/components/skeleton';
import { IconButton } from '@/components/ui/icon-button';
import { InlineError } from '@/components/ui/inline-error';
import { StickyFooter } from '@/components/ui/sticky-footer';
import { useCart } from '@/hooks/use-cart';
import { usePaymentFlow } from '@/hooks/use-payment-flow';
import { PAYMENT_PHASE_COPY, type PaymentPhase } from '@/payments/payment-flow';
import { colors, fontFamily, spacing } from '@/theme/tokens';
import { formatMoney } from '@/utils/money';

const BUSY_PHASES: PaymentPhase[] = ['creating_order', 'preparing', 'in_sheet', 'confirming'];

export default function CheckoutScreen() {
  const { data: cart, isPending: cartPending } = useCart();
  const flow = usePaymentFlow();
  const { phase, order, message } = flow;
  const busy = BUSY_PHASES.includes(phase);

  function close() {
    if (order) router.replace(`/orders/${order.uuid}`);
    else router.back();
  }

  // ----- Review -----
  if (phase === 'review') {
    if (!cartPending && (!cart || cart.items.length === 0)) {
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.black }}>
          <Header onClose={() => router.back()} />
          <EmptyState icon={Lock} title="No hay nada que pagar" message="Tu carrito está vacío." actionLabel="Ir a la tienda" onAction={() => router.replace('/store')} />
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.black }}>
        <Header onClose={() => router.back()} title="Confirmar y pagar" />
        {cartPending || !cart ? (
          <View style={{ padding: spacing.lg, gap: spacing.md }}>
            <Skeleton height={60} />
            <Skeleton height={120} />
          </View>
        ) : (
          <>
            <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
              <View style={{ gap: spacing.sm }}>
                <AppText variant="label" tone="muted">
                  TU PEDIDO
                </AppText>
                {cart.items.map((item) => (
                  <View key={item.id} style={{ flexDirection: 'row', gap: spacing.sm }}>
                    <AppText variant="body" tone="muted" style={{ width: 28 }}>
                      {item.quantity}×
                    </AppText>
                    <View style={{ flex: 1 }}>
                      <AppText variant="body" numberOfLines={2}>
                        {item.product_name}
                      </AppText>
                      {item.variant_name ? (
                        <AppText variant="caption" tone="muted">
                          {item.variant_name}
                        </AppText>
                      ) : null}
                    </View>
                    <AppText variant="body">{formatMoney(item.line_total_minor, item.currency)}</AppText>
                  </View>
                ))}
              </View>

              <View style={{ gap: spacing.xs, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.hairline }}>
                <Row label="Subtotal" value={formatMoney(cart.subtotal_minor, cart.currency)} />
                {cart.discount_minor > 0 ? <Row label={`Descuento${cart.coupon ? ` (${cart.coupon.code})` : ''}`} value={`−${formatMoney(cart.discount_minor, cart.currency)}`} /> : null}
                <Row label="Total" value={formatMoney(cart.total_minor, cart.currency)} strong />
              </View>

              <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
                <ShieldCheck size={18} color={colors.success} />
                <AppText variant="caption" tone="muted" style={{ flex: 1 }}>
                  Pago seguro con Stripe. Los datos de tu tarjeta van directo al procesador; nunca pasan por nuestros servidores.
                </AppText>
              </View>
            </ScrollView>

            <StickyFooter>
              <InlineError message={message} />
              <AppButton label={`Pagar ${formatMoney(cart.total_minor, cart.currency)}`} icon={Lock} onPress={flow.checkoutAndPay} disabled={cart.items.length === 0} />
            </StickyFooter>
          </>
        )}
      </SafeAreaView>
    );
  }

  // ----- In progress -----
  if (busy) {
    const copy = PAYMENT_PHASE_COPY[phase];
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl }}>
        <ActivityIndicator size="large" color={colors.gold} />
        <AppText variant="subtitle" align="center" accessibilityLiveRegion="polite">
          {copy.title}
        </AppText>
        {copy.message ? (
          <AppText variant="body" tone="muted" align="center">
            {copy.message}
          </AppText>
        ) : null}
      </SafeAreaView>
    );
  }

  // ----- Outcomes -----
  const copy = PAYMENT_PHASE_COPY[phase];
  const total = order ? formatMoney(order.total_minor, order.currency) : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.black }}>
      <Header onClose={close} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, gap: spacing.md }}>
        <OutcomeBadge phase={phase} />
        <AppText variant="title" align="center" accessibilityRole="header" accessibilityLiveRegion="polite">
          {copy.title}
        </AppText>
        {order ? (
          <AppText variant="body" tone="muted" align="center">
            Pedido #{order.order_number}
            {total ? ` · ${total}` : ''}
          </AppText>
        ) : null}
        <AppText variant="body" tone="muted" align="center">
          {phase === 'failed' && message ? message : copy.message}
        </AppText>
      </View>

      <StickyFooter>
        {phase === 'paid' || phase === 'processing' || phase === 'unavailable' ? (
          <>
            {order ? <AppButton label="Ver mi pedido" onPress={() => router.replace(`/orders/${order.uuid}`)} /> : null}
            <AppButton label="Seguir explorando la tienda" variant="ghost" onPress={() => router.replace('/store')} />
          </>
        ) : phase === 'failed' || phase === 'cancelled' ? (
          <>
            <AppButton label="Intentar de nuevo" icon={Lock} onPress={flow.payExisting} />
            {order ? <AppButton label="Pagar después" variant="ghost" onPress={() => router.replace(`/orders/${order.uuid}`)} /> : null}
          </>
        ) : (
          <AppButton label="Volver al carrito" onPress={() => router.replace('/cart')} />
        )}
      </StickyFooter>
    </SafeAreaView>
  );
}

function Header({ onClose, title }: { onClose: () => void; title?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: spacing.sm }}>
      <IconButton icon={X} label="Cerrar" onPress={onClose} />
      <AppText style={{ flex: 1, textAlign: 'center', fontFamily: fontFamily.semibold, fontSize: 16, marginRight: 44 }}>{title ?? ''}</AppText>
    </View>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <AppText style={{ fontFamily: strong ? fontFamily.semibold : fontFamily.regular, fontSize: strong ? 18 : 15, color: strong ? colors.foreground : colors.muted }}>{label}</AppText>
      <AppText style={{ fontFamily: strong ? fontFamily.bold : fontFamily.medium, fontSize: strong ? 20 : 15, color: strong ? colors.goldSoft : colors.foreground }}>{value}</AppText>
    </View>
  );
}

function OutcomeBadge({ phase }: { phase: PaymentPhase }) {
  const scale = useSharedValue(0.5);
  useEffect(() => {
    scale.value = withSpring(1, { damping: 11, stiffness: 140 });
  }, [scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const success = phase === 'paid';
  const Icon = success ? PartyPopper : phase === 'processing' || phase === 'unavailable' ? Clock : CircleAlert;
  const tint = success ? colors.gold : phase === 'processing' || phase === 'unavailable' ? colors.goldSoft : colors.destructive;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm }}>
      {success ? <GoldGlow size={200} style={{ position: 'absolute' }} /> : null}
      <Animated.View
        style={[
          { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: success ? colors.gold : colors.graphite },
          style,
        ]}>
        <Icon size={38} color={success ? colors.black : tint} strokeWidth={2} />
      </Animated.View>
    </View>
  );
}
