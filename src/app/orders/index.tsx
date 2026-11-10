import { router } from 'expo-router';
import { ChevronRight, Receipt } from 'lucide-react-native';
import { useMemo } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandRefreshControl } from '@/components/motion/brand-refresh-control';
import { AppText } from '@/components/app-text';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PressableScale } from '@/components/motion/pressable-scale';
import { StaggerItem } from '@/components/motion/reveal';
import { SkeletonRow } from '@/components/skeleton';
import { TopBar } from '@/components/ui/top-bar';
import { PAYMENT_STATE_LABEL } from '@/features/commerce/order-timeline';
import { useOrders } from '@/hooks/use-orders';
import { colors, fontFamily, radius, shadows, spacing } from '@/theme/tokens';
import type { Order } from '@/types/models';
import { formatLongDate } from '@/utils/dates';
import { formatMoney } from '@/utils/money';

const TONE_COLOR = { gold: colors.accent, success: colors.success, destructive: colors.destructive, muted: colors.muted } as const;

export default function OrdersScreen() {
  const { data, isPending, isError, error, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } = useOrders();
  const orders = useMemo<Order[]>(() => data?.pages.flatMap((page) => page.data) ?? [], [data]);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <TopBar title="Mis pedidos" />
      </View>

      {isPending ? (
        <View style={{ gap: spacing.md, padding: spacing.lg }}>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </View>
      ) : isError ? (
        <ErrorState error={error} message="No pudimos cargar tus pedidos." onRetry={refetch} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.uuid}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.xxl, gap: spacing.sm, flexGrow: 1 }}
          refreshControl={<BrandRefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={colors.accent} style={{ marginVertical: spacing.md }} /> : null}
          renderItem={({ item, index }) => (
            <StaggerItem index={index}>
              <OrderRow order={item} />
            </StaggerItem>
          )}
          ListEmptyComponent={
            <EmptyState icon={Receipt} title="Aún no tienes pedidos" message="Cuando compres algo en la tienda, aquí podrás seguir su estado." actionLabel="Ver colecciones" onAction={() => router.replace('/store')} />
          }
        />
      )}
    </SafeAreaView>
  );
}

function OrderRow({ order }: { order: Order }) {
  const state = PAYMENT_STATE_LABEL[order.payment_state] ?? PAYMENT_STATE_LABEL.pending;
  const label = order.status === 'cancelled' && order.payment_state !== 'paid' ? 'Cancelado' : order.fulfillment_status === 'fulfilled' ? 'Entregado' : state.label;
  const tone = order.status === 'cancelled' && order.payment_state !== 'paid' ? 'muted' : order.fulfillment_status === 'fulfilled' ? 'success' : state.tone;
  const itemCount = order.items?.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <PressableScale
      onPress={() => router.push(`/orders/${order.uuid}`)}
      accessibilityRole="button"
      accessibilityLabel={`Pedido ${order.order_number}, ${label}, ${formatMoney(order.total_minor, order.currency)}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.md,
        borderRadius: radius.lg,
        borderCurve: 'continuous',
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.hairline,
        ...shadows.soft,
      }}>
      <View style={{ flex: 1, gap: 3 }}>
        <AppText style={{ fontFamily: fontFamily.semibold, fontSize: 15 }}>#{order.order_number}</AppText>
        <AppText variant="caption" tone="muted">
          {formatLongDate(order.created_at.slice(0, 10))}
          {itemCount ? ` · ${itemCount} ${itemCount === 1 ? 'producto' : 'productos'}` : ''}
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: TONE_COLOR[tone] }} />
          <AppText variant="caption" style={{ color: TONE_COLOR[tone] }}>
            {label}
          </AppText>
        </View>
      </View>
      <AppText style={{ fontFamily: fontFamily.bold, fontSize: 16 }}>{formatMoney(order.total_minor, order.currency)}</AppText>
      <ChevronRight size={18} color={colors.subtle} />
    </PressableScale>
  );
}
