import { router } from 'expo-router';
import { Receipt } from 'lucide-react-native';
import { useMemo } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { FulfillmentStatusBadge, OrderStatusBadge, PaymentStatusBadge } from '@/components/order-status-badge';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { useOrders } from '@/hooks/use-orders';
import { colors, spacing } from '@/theme/tokens';
import { formatLongDate } from '@/utils/dates';
import { formatMoney } from '@/utils/money';
import type { Order } from '@/types/models';

function OrderRow({ order }: { order: Order }) {
  return (
    <Card onPress={() => router.push(`/orders/${order.uuid}`)} style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View>
          <AppText variant="bodyStrong">#{order.order_number}</AppText>
          <AppText variant="caption" tone="muted">
            {formatLongDate(order.created_at.slice(0, 10))}
          </AppText>
        </View>
        <AppText variant="bodyStrong" tone="gold">
          {formatMoney(order.total_minor, order.currency)}
        </AppText>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xxs }}>
        <OrderStatusBadge status={order.status} />
        <PaymentStatusBadge status={order.payment_status} />
        <FulfillmentStatusBadge status={order.fulfillment_status} />
      </View>
    </Card>
  );
}

export default function OrdersScreen() {
  const { data, isPending, isError, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } = useOrders();

  const orders = useMemo<Order[]>(() => data?.pages.flatMap((page) => page.rows) ?? [], [data]);

  return (
    <Screen edges={['top', 'left', 'right']} padded={false}>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <ScreenHeader title="Mis pedidos" />
      </View>

      {isPending ? (
        <View style={{ gap: spacing.md, paddingHorizontal: spacing.lg }}>
          <Skeleton height={90} radius={16} />
          <Skeleton height={90} radius={16} />
        </View>
      ) : isError ? (
        <ErrorState message="No pudimos cargar tus pedidos." onRetry={refetch} />
      ) : orders.length === 0 ? (
        <EmptyState icon={Receipt} title="Sin pedidos todavía" message="Cuando compres algo en la tienda lo verás aquí." />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.uuid}
          contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.gold} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => hasNextPage && fetchNextPage()}
          ListFooterComponent={isFetchingNextPage ? <Skeleton height={90} radius={16} /> : null}
          renderItem={({ item }) => <OrderRow order={item} />}
        />
      )}
    </Screen>
  );
}
