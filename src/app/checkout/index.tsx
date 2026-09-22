import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Network from 'expo-network';
import { Check, ShoppingBag } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { GoldGlow } from '@/components/brand/gold-glow';
import { ErrorState } from '@/components/error-state';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { AppError } from '@/api/errors';
import { useCart } from '@/hooks/use-cart';
import { useCheckout } from '@/hooks/use-checkout';
import { useCreateOnlinePayment } from '@/hooks/use-payments';
import { isGatewayUnconfiguredError } from '@/payments/gateway-adapter';
import { colors, radius, spacing } from '@/theme/tokens';
import { describeCommerceError } from '@/utils/commerce-errors';
import { formatMoney } from '@/utils/money';
import type { Order } from '@/types/models';

type Step = 'review' | 'processing' | 'payment_pending' | 'payment_unavailable' | 'error';

export default function CheckoutScreen() {
  const { data: cart, isPending: cartPending } = useCart();
  const checkout = useCheckout();
  const [order, setOrder] = useState<Order | null>(null);
  const [step, setStep] = useState<Step>('review');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paymentUnavailableReason, setPaymentUnavailableReason] = useState<string | null>(null);
  const payment = useCreateOnlinePayment(order?.uuid ?? '');

  async function handleConfirm() {
    setErrorMessage(null);

    // Fail fast with a clear message instead of waiting out the full 15s
    // request timeout on a connection we already know is down — a paid
    // checkout is exactly the kind of write that must never look like it's
    // "just taking a while" when it can't possibly succeed.
    const network = await Network.getNetworkStateAsync().catch(() => null);
    if (network?.isConnected === false) {
      setStep('error');
      setErrorMessage('No hay conexión a Internet. Verifica tu red e intenta de nuevo.');
      return;
    }

    setStep('processing');
    try {
      const createdOrder = await checkout.mutateAsync();
      setOrder(createdOrder);

      try {
        await payment.mutateAsync();
        // A successful call here still only returns `client_payload` for a
        // client-side card form to finish — no real gateway SDK is wired
        // (see src/payments/gateway-adapter.ts), so the order is created
        // but payment is not actually collected yet.
        setStep('payment_pending');
      } catch (paymentError) {
        const isUnconfigured = paymentError instanceof AppError && isGatewayUnconfiguredError(paymentError.status);
        setPaymentUnavailableReason(
          isUnconfigured
            ? null
            : paymentError instanceof AppError
              ? describeCommerceError(paymentError)
              : 'No pudimos iniciar tu pago.',
        );
        setStep('payment_unavailable');
      }
    } catch (error) {
      setStep('error');
      setErrorMessage(error instanceof AppError ? describeCommerceError(error) : 'No pudimos crear tu pedido.');
    }
  }

  if (step === 'review') {
    return (
      <Screen edges={['top', 'left', 'right']}>
        <ScreenHeader title="Confirmar pedido" />
        {cartPending || !cart ? (
          <Skeleton height={200} />
        ) : (
          <View style={{ gap: spacing.lg }}>
            <View style={{ gap: spacing.xs }}>
              {cart.items.map((item) => (
                <View key={item.id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <AppText variant="body" numberOfLines={1} style={{ flex: 1, marginRight: spacing.sm }}>
                    {item.quantity}× {item.product_name}
                  </AppText>
                  <AppText variant="body">{formatMoney(item.line_total_minor, item.currency)}</AppText>
                </View>
              ))}
            </View>

            <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <AppText variant="subtitle">Total</AppText>
                <AppText variant="subtitle" tone="gold">
                  {formatMoney(cart.total_minor, cart.currency)}
                </AppText>
              </View>
              <AppText variant="caption" tone="muted" style={{ marginTop: spacing.xxs }}>
                El total final se confirma al procesar tu pedido.
              </AppText>
            </View>

            <AppButton label="Confirmar pedido" onPress={handleConfirm} disabled={cart.items.length === 0} />
          </View>
        )}
      </Screen>
    );
  }

  if (step === 'processing') {
    return (
      <Screen edges={['top', 'left', 'right']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md }}>
          <Skeleton width={64} height={64} radius={32} />
          <AppText variant="body" tone="muted">
            Procesando tu pedido…
          </AppText>
        </View>
      </Screen>
    );
  }

  if (step === 'error') {
    return (
      <Screen edges={['top', 'left', 'right']}>
        <ScreenHeader title="Confirmar pedido" />
        <ErrorState message={errorMessage ?? undefined} onRetry={handleConfirm} />
      </Screen>
    );
  }

  // payment_pending / payment_unavailable reach here with a created Order —
  // the order itself is always real at this point regardless of payment state.
  return <OrderCreatedCelebration order={order} step={step} paymentUnavailableReason={paymentUnavailableReason} />;
}

function OrderCreatedCelebration({
  order,
  step,
  paymentUnavailableReason,
}: {
  order: Order | null;
  step: Step;
  paymentUnavailableReason: string | null;
}) {
  const glow = useSharedValue(0);
  const badgeScale = useSharedValue(0.4);
  const contentOpacity = useSharedValue(0);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    glow.value = withTiming(1, { duration: 900 });
    badgeScale.value = withSpring(1, { damping: 10, stiffness: 120 });
    contentOpacity.value = withDelay(300, withTiming(1, { duration: 500 }));
  }, [badgeScale, contentOpacity, glow]);

  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value, transform: [{ scale: 0.6 + glow.value * 0.6 }] }));
  const badgeStyle = useAnimatedStyle(() => ({ transform: [{ scale: badgeScale.value }] }));
  const contentStyle = useAnimatedStyle(() => ({ opacity: contentOpacity.value, transform: [{ translateY: (1 - contentOpacity.value) * 12 }] }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.black }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, paddingHorizontal: spacing.xl }}>
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={[{ position: 'absolute' }, glowStyle]}>
            <GoldGlow size={200} intensity={1.2} />
          </Animated.View>
          <Animated.View
            style={[
              { width: 88, height: 88, borderRadius: radius.pill, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
              badgeStyle,
            ]}>
            {step === 'payment_pending' ? <ShoppingBag color={colors.black} size={40} /> : <Check color={colors.black} size={40} strokeWidth={3} />}
          </Animated.View>
        </View>

        <Animated.View style={[{ alignItems: 'center', gap: spacing.xs }, contentStyle]}>
          <AppText variant="title" align="center">
            Pedido creado
          </AppText>
          {order ? (
            <AppText variant="body" tone="muted" align="center">
              #{order.order_number}
            </AppText>
          ) : null}
          {step === 'payment_unavailable' ? (
            <AppText variant="body" tone="muted" align="center" style={{ marginTop: spacing.xs }}>
              {paymentUnavailableReason ??
                'El pago en línea todavía no está disponible. Tu pedido quedó guardado — puedes completarlo más tarde desde Mis Pedidos.'}
            </AppText>
          ) : (
            <AppText variant="body" tone="muted" align="center" style={{ marginTop: spacing.xs }}>
              Estamos preparando tu pago. Revisa el estado desde Mis Pedidos.
            </AppText>
          )}
        </Animated.View>
      </View>

      <Animated.View style={[{ gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }, contentStyle]}>
        {order ? (
          <AppButton label="Ver mi pedido" onPress={() => router.replace(`/orders/${order.uuid}`)} />
        ) : null}
        <AppButton label="Ir a Mis Pedidos" variant={order ? 'secondary' : 'primary'} onPress={() => router.replace('/orders')} />
      </Animated.View>
    </View>
  );
}
