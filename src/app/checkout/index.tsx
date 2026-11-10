import { router } from 'expo-router';
import { CircleAlert, Clock, CreditCard, Lock, PartyPopper, ShieldCheck, Truck, UserRound, X } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useEffect, type ReactNode } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { GoldGlow } from '@/components/brand/gold-glow';
import { EmptyState } from '@/components/empty-state';
import { Skeleton } from '@/components/skeleton';
import { IconButton } from '@/components/ui/icon-button';
import { InlineError } from '@/components/ui/inline-error';
import { StickyFooter } from '@/components/ui/sticky-footer';
import { CartItemThumb } from '@/features/commerce/components/cart-item-thumb';
import { useCart } from '@/hooks/use-cart';
import { useOrder } from '@/hooks/use-orders';
import { usePaymentFlow } from '@/hooks/use-payment-flow';
import { useI18n } from '@/i18n';
import { paymentPhaseCopy, phaseFromOrder, type PaymentPhase } from '@/payments/payment-flow';
import { useAuthStore } from '@/stores/authStore';
import { colors, fontFamily, radius, spacing } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';
import { formatMoney } from '@/utils/money';

const BUSY_PHASES: PaymentPhase[] = ['creating_order', 'preparing', 'in_browser', 'confirming'];

/**
 * One calm checkout: datos → entrega → pago → resumen, then very clear
 * states (creando, pagando, confirmando, en proceso, confirmado, error).
 * "Pago confirmado" only ever comes from the server; a `processing`
 * payment keeps being watched until the webhook settles it.
 */
export default function CheckoutScreen() {
  const { t } = useI18n();
  const { data: cart, isPending: cartPending } = useCart();
  const user = useAuthStore((s) => s.user);
  const flow = usePaymentFlow();
  const { order, message } = flow;

  // Webhook-driven settlement: keep reading the order while it's processing.
  const watching = flow.phase === 'processing' && !!order;
  const settlement = useOrder(order?.uuid ?? '', { enabled: watching, watchSettlement: true });
  const settled = watching && settlement.data ? phaseFromOrder(settlement.data, { type: 'returned' }) : null;
  const phase: PaymentPhase = settled ? (settled === 'confirming' ? 'processing' : settled) : flow.phase;
  const busy = BUSY_PHASES.includes(phase);
  useEffect(() => {
    if (settled === 'paid') haptics.success();
  }, [settled]);
  const shownOrder = (watching && settlement.data) || order;

  function close() {
    if (order) router.replace(`/orders/${order.uuid}`);
    else router.back();
  }

  // ----- Review -----
  if (phase === 'review') {
    if (!cartPending && (!cart || cart.items.length === 0)) {
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <Header onClose={() => router.back()} />
          <EmptyState icon={Lock} title={t('No hay nada que pagar')} message={t('Tu carrito está vacío.')} actionLabel={t('Ver colecciones')} onAction={() => router.replace('/store')} />
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.background }}>
        <Header onClose={() => router.back()} title={t('Confirmar y pagar')} />
        {cartPending || !cart ? (
          <View style={{ padding: spacing.lg, gap: spacing.md }}>
            <Skeleton height={60} />
            <Skeleton height={120} />
          </View>
        ) : (
          <>
            <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
              <Section icon={UserRound} title={t('Tus datos')}>
                <AppText variant="body">{user?.name ?? t('Tu cuenta')}</AppText>
                {user?.email ? (
                  <AppText variant="caption" tone="muted">
                    {t('{email} · aquí te enviaremos la confirmación', { email: user.email })}
                  </AppText>
                ) : null}
              </Section>

              <Section icon={Truck} title={t('Entrega')}>
                <AppText variant="caption" tone="muted">
                  {t('Preparamos tu pedido al confirmar el pago y te avisamos cuando esté listo para entregarse o enviarse. Si tu compra es de un evento, la recibes en la entrega de kits.')}
                </AppText>
              </Section>

              <Section icon={CreditCard} title={t('Pago')}>
                <AppText variant="caption" tone="muted">
                  {t('Tarjeta de crédito o débito. Se abre una ventana segura; si tu banco pide verificarte, lo haces ahí mismo.')}
                </AppText>
              </Section>

              <View style={{ gap: spacing.sm, marginTop: spacing.xs, padding: spacing.md, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.hairline }}>
                <AppText variant="eyebrow" tone="subtle">{t('Resumen')}</AppText>
                {cart.items.map((item) => (
                  <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <CartItemThumb item={item} width={40} height={48} radius={10} />
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

              <View style={{ gap: spacing.xs, paddingTop: spacing.sm, paddingHorizontal: spacing.md }}>
                <Row label={t('Subtotal')} value={formatMoney(cart.subtotal_minor, cart.currency)} />
                {cart.discount_minor > 0 ? <Row label={cart.coupon ? t('Descuento ({code})', { code: cart.coupon.code }) : t('Descuento')} value={`−${formatMoney(cart.discount_minor, cart.currency)}`} /> : null}
                <Row label={t('Total')} value={formatMoney(cart.total_minor, cart.currency)} strong />
              </View>

              <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
                <ShieldCheck size={18} color={colors.success} />
                <AppText variant="caption" tone="muted" style={{ flex: 1 }}>
                  {t('Pago seguro. Los datos de tu tarjeta se capturan en una ventana protegida y nunca se guardan en la app.')}
                </AppText>
              </View>
            </ScrollView>

            <StickyFooter>
              <InlineError message={message} />
              <AppButton label={t('Pagar {total}', { total: formatMoney(cart.total_minor, cart.currency) })} variant="legacy" onPress={flow.checkoutAndPay} disabled={cart.items.length === 0} />
            </StickyFooter>
          </>
        )}
      </SafeAreaView>
    );
  }

  // ----- In progress -----
  if (busy) {
    const copy = paymentPhaseCopy(phase);
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl }}>
        <ActivityIndicator size="large" color={colors.accent} />
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
  const copy = paymentPhaseCopy(phase);
  const total = shownOrder ? formatMoney(shownOrder.total_minor, shownOrder.currency) : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Header onClose={close} />
      <Animated.View entering={FadeIn.duration(240)} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, gap: spacing.md }}>
        <OutcomeBadge key={phase} phase={phase} />
        <AppText variant="title" align="center" accessibilityRole="header" accessibilityLiveRegion="polite">
          {copy.title}
        </AppText>
        {shownOrder ? (
          <AppText variant="body" tone="muted" align="center">
            {t('Pedido #{number}', { number: shownOrder.order_number })}
            {total ? ` · ${total}` : ''}
          </AppText>
        ) : null}
        <AppText variant="body" tone="muted" align="center">
          {phase === 'failed' && message ? message : copy.message}
        </AppText>
        {phase === 'processing' && settlement.isFetching ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <ActivityIndicator size="small" color={colors.accent} />
            <AppText variant="caption" tone="muted">
              {t('Esperando la confirmación…')}
            </AppText>
          </View>
        ) : null}
      </Animated.View>

      <StickyFooter>
        {phase === 'paid' || phase === 'processing' || phase === 'unavailable' || phase === 'not_app_payable' ? (
          <>
            {order ? <AppButton label={t('Ver mi pedido')} onPress={() => router.replace(`/orders/${order.uuid}`)} /> : null}
            <AppButton label={t('Seguir viendo colecciones')} variant="ghost" onPress={() => router.replace('/store')} />
          </>
        ) : phase === 'pending' ? (
          <>
            <AppButton label={t('Revisar de nuevo')} onPress={flow.checkAgain} />
            <AppButton label={t('Intentar de nuevo')} icon={Lock} variant="ghost" onPress={flow.payExisting} />
          </>
        ) : phase === 'failed' || phase === 'cancelled' ? (
          <>
            <AppButton label={t('Intentar de nuevo')} icon={Lock} onPress={flow.payExisting} />
            {order ? <AppButton label={t('Pagar después')} variant="ghost" onPress={() => router.replace(`/orders/${order.uuid}`)} /> : null}
          </>
        ) : (
          <AppButton label={t('Volver al carrito')} onPress={() => router.replace('/cart')} />
        )}
      </StickyFooter>
    </SafeAreaView>
  );
}

function Header({ onClose, title }: { onClose: () => void; title?: string }) {
  const { t } = useI18n();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: spacing.sm }}>
      <IconButton icon={X} label={t('Cerrar')} onPress={onClose} />
      <AppText accessibilityRole="header" style={{ flex: 1, textAlign: 'center', fontFamily: fontFamily.headingSemibold, fontSize: 16, marginRight: 44 }}>{title ?? ''}</AppText>
    </View>
  );
}

function Section({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.hairline }}>
      <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.goldWash }}>
        <Icon size={16} color={colors.accent} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText accessibilityRole="header" style={{ fontFamily: fontFamily.semibold, fontSize: 15 }}>
          {title}
        </AppText>
        {children}
      </View>
    </View>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <AppText style={{ fontFamily: strong ? fontFamily.semibold : fontFamily.regular, fontSize: strong ? 18 : 15, color: strong ? colors.foreground : colors.muted }}>{label}</AppText>
      <AppText style={{ fontFamily: strong ? fontFamily.heading : fontFamily.medium, fontSize: strong ? 20 : 15, color: colors.foreground }}>{value}</AppText>
    </View>
  );
}

function OutcomeBadge({ phase }: { phase: PaymentPhase }) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(reduceMotion ? 1 : 0.5);
  useEffect(() => {
    scale.value = reduceMotion ? 1 : withSpring(1, { damping: 13, stiffness: 160 });
  }, [scale, reduceMotion]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const success = phase === 'paid';
  const waiting = phase === 'processing' || phase === 'unavailable' || phase === 'pending' || phase === 'cancelled';
  const Icon = success ? PartyPopper : waiting ? Clock : CircleAlert;
  const tint = success ? colors.gold : waiting ? colors.accent : colors.destructive;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm }}>
      {success ? <GoldGlow size={200} style={{ position: 'absolute' }} /> : null}
      <Animated.View
        style={[
          { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: success ? colors.gold : colors.card, borderWidth: success ? 0 : 1, borderColor: colors.border },
          style,
        ]}>
        <Icon size={38} color={success ? colors.black : tint} strokeWidth={2} />
      </Animated.View>
    </View>
  );
}
