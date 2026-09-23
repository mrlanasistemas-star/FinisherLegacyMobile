import * as Linking from 'expo-linking';
import { router, type Href } from 'expo-router';
import { Award, Bell, CheckCheck, Flag, Heart, MessageCircle, Package, UserPlus } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, RefreshControl, SectionList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Skeleton } from '@/components/skeleton';
import { IconButton } from '@/components/ui/icon-button';
import { TopBar } from '@/components/ui/top-bar';
import { mapIncomingPath } from '@/features/links/map-incoming-path';
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '@/hooks/use-notifications';
import { colors, fontFamily, spacing } from '@/theme/tokens';
import type { AppNotification } from '@/types/models';
import { relativeTime, TIME_BUCKET_LABEL, timeBucket, type TimeBucket } from '@/utils/relative-time';

const TYPE_ICON: Record<string, typeof Bell> = {
  new_follower: UserPlus,
  moment_reaction: Heart,
  moment_comment: MessageCircle,
  order_ready: Package,
  payment_pending: Package,
  result_available: Flag,
  event_updated: Flag,
  legacy_plate_ready: Award,
};

/** Structured target first (social notifications), then the action URL. */
function openNotification(notification: AppNotification) {
  const target = notification.target;
  if (target?.kind === 'athlete' && target.username) return router.push(`/athlete/${target.username}`);
  if (target?.kind === 'moment' && target.moment_uuid) return router.push(`/moments/${target.moment_uuid}`);
  if (target?.kind === 'order' && target.order_uuid) return router.push(`/orders/${target.order_uuid}`);

  if (!notification.action_url) return;
  const mapped = mapIncomingPath(notification.action_url);
  if (mapped && mapped.startsWith('/')) {
    router.push(mapped as Href);
    return;
  }
  const { path } = Linking.parse(notification.action_url);
  if (path && !/^https?:/i.test(notification.action_url)) {
    router.push(`/${path}` as Href);
    return;
  }
  Linking.openURL(notification.action_url).catch(() => {});
}

export default function NotificationsScreen() {
  const { data, isPending, isError, error, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = useMemo<AppNotification[]>(() => data?.pages.flatMap((page) => page.rows) ?? [], [data]);
  const hasUnread = notifications.some((n) => n.read_at === null);

  const sections = useMemo(() => {
    const groups: Record<TimeBucket, AppNotification[]> = { today: [], week: [], earlier: [] };
    for (const n of notifications) groups[timeBucket(n.created_at)].push(n);
    return (['today', 'week', 'earlier'] as const).filter((k) => groups[k].length > 0).map((k) => ({ key: k, title: TIME_BUCKET_LABEL[k], data: groups[k] }));
  }, [notifications]);

  function handlePress(notification: AppNotification) {
    if (notification.read_at === null) markRead.mutate(notification.id);
    openNotification(notification);
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.black }}>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <TopBar
          title="Notificaciones"
          right={hasUnread ? <IconButton icon={CheckCheck} label="Marcar todas como leídas" onPress={() => markAllRead.mutate()} color={colors.gold} /> : null}
        />
      </View>

      {isPending ? (
        <View style={{ gap: spacing.md, padding: spacing.lg }}>
          <Skeleton height={56} />
          <Skeleton height={56} />
          <Skeleton height={56} />
        </View>
      ) : isError ? (
        <ErrorState error={error} message="No pudimos cargar tus notificaciones." onRetry={refetch} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingBottom: spacing.xxl, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.gold} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
          renderSectionHeader={({ section }) => (
            <AppText variant="label" tone="muted" style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xs }}>
              {section.title.toUpperCase()}
            </AppText>
          )}
          renderItem={({ item }) => <NotificationRow notification={item} onPress={() => handlePress(item)} />}
          ListFooterComponent={isFetchingNextPage ? <Skeleton height={56} style={{ margin: spacing.lg }} /> : null}
          ListEmptyComponent={
            <EmptyState
              icon={Bell}
              title="Todo al día"
              message="Aquí verás cuando alguien te siga o apoye tus momentos, y novedades de tus pedidos y eventos."
              actionLabel="Explorar la comunidad"
              onAction={() => router.push('/explore')}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

function NotificationRow({ notification, onPress }: { notification: AppNotification; onPress: () => void }) {
  const unread = notification.read_at === null;
  const Icon = TYPE_ICON[notification.type ?? ''] ?? Bell;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${unread ? 'No leída. ' : ''}${notification.title ?? ''}. ${notification.message ?? ''}`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        gap: spacing.sm,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        backgroundColor: pressed ? colors.graphite : unread ? 'rgba(201,161,89,0.05)' : 'transparent',
      })}>
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: unread ? colors.goldWash : colors.graphite, alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={18} color={unread ? colors.gold : colors.muted} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <AppText style={{ flex: 1, fontFamily: unread ? fontFamily.semibold : fontFamily.medium, fontSize: 15 }} numberOfLines={1}>
            {notification.title ?? 'Finisher Legacy'}
          </AppText>
          <AppText variant="caption" style={{ color: colors.subtle, fontSize: 12 }}>
            {relativeTime(notification.created_at)}
          </AppText>
        </View>
        {notification.message ? (
          <AppText variant="caption" tone="muted" numberOfLines={3}>
            {notification.message}
          </AppText>
        ) : null}
      </View>
      {unread ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold, marginTop: 6 }} /> : null}
    </Pressable>
  );
}
