import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Award, Bell, CheckCheck, Flag, Heart, LifeBuoy, Megaphone, MessageCircle, Mic, Nfc, Package, PackageCheck, RotateCcw, Truck, UserPlus } from 'lucide-react-native';
import { useMemo } from 'react';
import { SectionList, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandRefreshControl } from '@/components/motion/brand-refresh-control';
import { PressableScale } from '@/components/motion/pressable-scale';
import { StaggerItem } from '@/components/motion/reveal';
import { AppText } from '@/components/app-text';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Skeleton } from '@/components/skeleton';
import { IconButton } from '@/components/ui/icon-button';
import { TopBar } from '@/components/ui/top-bar';
import { PushPrimerCard } from '@/components/home/push-primer-card';
import { reportNotificationOpened } from '@/api/notifications';
import { campaignOpenId, notificationDestination } from '@/features/notifications/notification-href';
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
  order_paid: Package,
  order_shipped: Truck,
  order_delivered: PackageCheck,
  order_refunded: RotateCcw,
  tag_activated: Nfc,
  training_cheer: Mic,
  support_reply: LifeBuoy,
  broadcast: Megaphone,
  custom: Megaphone,
};

/** Same destination rule as a push tap — see features/notifications/notification-href.ts. */
function openNotification(notification: AppNotification) {
  const destination = notificationDestination(notification);
  if (destination?.kind === 'app') router.push(destination.href as Href);
  else if (destination?.kind === 'external') WebBrowser.openBrowserAsync(destination.url).catch(() => {});
}

/** Only absolute https images (rich push / broadcast picture) are shown. */
function imageUri(url: string | null | undefined): string | null {
  return url && url.toLowerCase().startsWith('https://') ? url : null;
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
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
    // Push-campaign rows: count the open (fire-and-forget, once per row).
    const openId = campaignOpenId(notification);
    if (openId) reportNotificationOpened(openId);
    openNotification(notification);
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <TopBar
          title="Notificaciones"
          right={hasUnread ? <IconButton icon={CheckCheck} label="Marcar todas como leídas" onPress={() => markAllRead.mutate()} color={colors.accent} /> : null}
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
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl, flexGrow: 1 }}
          refreshControl={<BrandRefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
          renderSectionHeader={({ section }) => (
            <AppText variant="eyebrow" tone="subtle" style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xs }}>
              {section.title}
            </AppText>
          )}
          renderItem={({ item, index }) => (
            <StaggerItem index={index}>
              <NotificationRow notification={item} onPress={() => handlePress(item)} />
            </StaggerItem>
          )}
          ListHeaderComponent={
            <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xs }}>
              <PushPrimerCard message="Recibe estos avisos aunque no tengas la app abierta." />
            </View>
          }
          ListFooterComponent={isFetchingNextPage ? <Skeleton height={56} style={{ margin: spacing.lg }} /> : null}
          ListEmptyComponent={
            <EmptyState
              icon={Bell}
              title="Todo al día"
              message="Aquí verás cuando alguien te siga o apoye tus momentos, y novedades de tus pedidos y eventos."
              actionLabel="Ir a Comunidad"
              onAction={() => router.navigate('/explore')}
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
    <PressableScale
      onPress={onPress}
      scaleTo={0.985}
      accessibilityRole="button"
      accessibilityLabel={`${unread ? 'No leída. ' : ''}${notification.title ?? ''}. ${notification.message ?? ''}`}
      style={{
        flexDirection: 'row',
        gap: spacing.sm,
        paddingVertical: spacing.sm + 2,
        paddingHorizontal: spacing.lg,
        backgroundColor: unread ? 'rgba(201,174,139,0.08)' : 'transparent',
      }}>
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: unread ? colors.goldWash : colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={18} color={unread ? colors.accent : colors.muted} />
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
      {imageUri(notification.image_url) ? (
        <Image
          source={{ uri: imageUri(notification.image_url) as string }}
          style={{ width: 56, height: 56, borderRadius: 10 }}
          contentFit="cover"
          accessibilityIgnoresInvertColors
        />
      ) : null}
      {unread ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold, marginTop: 6 }} /> : null}
    </PressableScale>
  );
}
