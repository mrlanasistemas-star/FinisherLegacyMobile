import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ChevronRight, HeartHandshake, Package } from 'lucide-react-native';
import { useMemo } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { PressableScale } from '@/components/motion/pressable-scale';
import { AppText } from '@/components/app-text';
import { PAYMENT_STATE_LABEL } from '@/features/commerce/order-timeline';
import { useOrders } from '@/hooks/use-orders';
import { useSupportSessions } from '@/hooks/use-support';
import { colors, fontFamily, radius, spacing } from '@/theme/tokens';
import type { Order } from '@/types/models';

const LIVE_SUPPORT_STATUSES = new Set(['active', 'open']);

/**
 * "Tu gente corre contigo" — shown only while a support session is live or
 * accepting messages. Read-only from `/me/support-sessions`; tapping opens
 * the session. (Live GPS tracking has no "my active session" list endpoint
 * yet, so only support is surfaced here.)
 */
export function ActiveSupportBanner() {
  const sessions = useSupportSessions();
  const live = useMemo(() => sessions.data?.pages[0]?.rows.find((s) => LIVE_SUPPORT_STATUSES.has(s.status)) ?? null, [sessions.data]);
  if (!live) return null;

  const isActive = live.status === 'active';

  return (
    <Animated.View entering={FadeIn.duration(260)}>
      <PressableScale
        dim
        scaleTo={0.98}
        onPress={() => router.push(`/support/${live.id}`)}
        accessibilityRole="button"
        accessibilityLabel={`${isActive ? 'Apoyo en vivo' : 'Tu equipo de apoyo está recibiendo mensajes'}: ${live.title}`}
        style={{ borderRadius: radius.lg, overflow: 'hidden' }}>
        <LinearGradient
          colors={['rgba(201,174,139,0.22)', 'rgba(201,174,139,0.06)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderWidth: 1, borderColor: colors.gold, borderRadius: radius.lg }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }}>
            <HeartHandshake size={20} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {isActive ? <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success }} /> : null}
              <AppText variant="label" tone="gold" style={{ letterSpacing: 1.5 }}>
                {isActive ? 'APOYO EN VIVO' : 'TU GENTE TE ESTÁ ESCRIBIENDO'}
              </AppText>
            </View>
            <AppText style={{ fontFamily: fontFamily.semibold, fontSize: 15 }} numberOfLines={1}>
              {live.title}
            </AppText>
          </View>
          <ChevronRight size={18} color={colors.accent} />
        </LinearGradient>
      </PressableScale>
    </Animated.View>
  );
}

function orderStatusLabel(order: Order): string {
  if (order.payment_state !== 'paid') return PAYMENT_STATE_LABEL[order.payment_state]?.label ?? 'En proceso';
  if (order.fulfillment_status === 'partially_fulfilled') return 'Entrega parcial';
  return 'En preparación';
}

/** One chip for the most recent order still in motion — nothing when all are done. */
export function OrderStatusChip() {
  const orders = useOrders();
  const open = useMemo(
    () =>
      orders.data?.pages[0]?.data.find(
        (o) => o.status !== 'cancelled' && o.status !== 'completed' && o.fulfillment_status !== 'fulfilled' && o.payment_state !== 'cancelled' && o.payment_state !== 'refunded',
      ) ?? null,
    [orders.data],
  );
  if (!open) return null;

  const needsPayment = open.payable && open.payment_state !== 'paid';

  return (
    <PressableScale
      dim
      scaleTo={0.98}
      onPress={() => router.push(`/orders/${open.uuid}`)}
      accessibilityRole="button"
      accessibilityLabel={`Pedido ${open.order_number}: ${orderStatusLabel(open)}`}
      style={{
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        minHeight: 40,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: needsPayment ? colors.goldDim : colors.border,
        backgroundColor: colors.card,
      }}>
      <Package size={15} color={needsPayment ? colors.gold : colors.muted} />
      <AppText variant="caption" style={{ fontFamily: fontFamily.medium }}>
        Pedido {open.order_number}
      </AppText>
      <AppText variant="caption" tone={needsPayment ? 'gold' : 'muted'}>
        · {orderStatusLabel(open)}
      </AppText>
      <ChevronRight size={14} color={colors.subtle} />
    </PressableScale>
  );
}
