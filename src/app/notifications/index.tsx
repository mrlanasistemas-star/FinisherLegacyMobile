import * as Linking from 'expo-linking';
import { router, type Href } from 'expo-router';
import { Bell, CheckCheck } from 'lucide-react-native';
import { useMemo } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '@/hooks/use-notifications';
import { colors, spacing } from '@/theme/tokens';
import { formatDateTime } from '@/utils/dates';
import type { AppNotification } from '@/types/models';

/**
 * `action_url` can point back into the app (finisherlegacy://...) or out to
 * the web — resolved the same way `src/hooks/use-deep-links.ts` resolves a
 * cold-start deep link: parse it, and if it carries an in-app path, route
 * there; otherwise hand it to the OS. The target is runtime-computed, not a
 * statically known literal, so typed routes can't verify it at compile
 * time — same cast `use-deep-links.ts` already uses for the same reason.
 */
function openNotificationTarget(actionUrl: string) {
  const { path } = Linking.parse(actionUrl);
  if (path) {
    router.push(`/${path}` as Href);
    return;
  }
  Linking.openURL(actionUrl).catch(() => {});
}

function NotificationRow({ notification, onPress }: { notification: AppNotification; onPress: () => void }) {
  const unread = notification.read_at === null;

  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        gap: spacing.sm,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: unread ? 'rgba(201,161,89,0.06)' : 'transparent',
      }}
      accessibilityRole="button">
      <View style={{ width: 8, alignItems: 'center', paddingTop: 6 }}>
        {unread ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold }} /> : null}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant={unread ? 'bodyStrong' : 'body'}>{notification.title ?? 'Finisher Legacy'}</AppText>
        {notification.message ? (
          <AppText variant="caption" tone="muted" numberOfLines={3}>
            {notification.message}
          </AppText>
        ) : null}
        <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
          {formatDateTime(notification.created_at)}
        </AppText>
      </View>
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const { data, isPending, isError, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = useMemo<AppNotification[]>(() => data?.pages.flatMap((page) => page.rows) ?? [], [data]);
  const hasUnread = notifications.some((n) => n.read_at === null);

  function handlePress(notification: AppNotification) {
    if (notification.read_at === null) {
      markRead.mutate(notification.id);
    }
    if (notification.action_url) {
      openNotificationTarget(notification.action_url);
    }
  }

  const header = (
    <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm }}>
      <ScreenHeader title="Notificaciones" />
      {hasUnread ? (
        <Pressable
          onPress={() => markAllRead.mutate()}
          disabled={markAllRead.isPending}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, alignSelf: 'flex-start', marginTop: spacing.xs }}
          accessibilityRole="button">
          <CheckCheck size={16} color={colors.gold} />
          <AppText variant="caption" tone="gold">
            Marcar todas como leídas
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <Screen edges={['top', 'left', 'right']} padded={false}>
      {isPending ? (
        <View style={{ gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
          <Skeleton height={28} width={200} />
          <Skeleton height={64} radius={12} />
          <Skeleton height={64} radius={12} />
          <Skeleton height={64} radius={12} />
        </View>
      ) : isError ? (
        <View>
          {header}
          <ErrorState message="No pudimos cargar tus notificaciones." onRetry={refetch} />
        </View>
      ) : notifications.length === 0 ? (
        <View>
          {header}
          <EmptyState
            icon={Bell}
            title="Sin notificaciones todavía"
            message="Aquí verás avisos sobre tus medallas, eventos y pedidos."
          />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={header}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => hasNextPage && fetchNextPage()}
          ListFooterComponent={isFetchingNextPage ? <Skeleton height={60} style={{ marginHorizontal: spacing.lg, marginTop: spacing.sm }} /> : null}
          renderItem={({ item }) => <NotificationRow notification={item} onPress={() => handlePress(item)} />}
        />
      )}
    </Screen>
  );
}
