import { router } from 'expo-router';
import { CalendarDays, Compass, Plus, Search, Users, WifiOff } from 'lucide-react-native';
import { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandRefreshControl } from '@/components/motion/brand-refresh-control';
import { PressableScale } from '@/components/motion/pressable-scale';
import { StaggerItem } from '@/components/motion/reveal';
import { AppError } from '@/api/errors';
import { AppText } from '@/components/app-text';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { EventCard } from '@/components/event-card';
import { Skeleton } from '@/components/skeleton';
import { FollowButton } from '@/components/social/follow-button';
import { MomentCard } from '@/components/social/moment-card';
import { Avatar } from '@/components/ui/avatar';
import { IconButton } from '@/components/ui/icon-button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { useEvents } from '@/hooks/use-events';
import { useProfile } from '@/hooks/use-profile';
import { useExplore, useFeed } from '@/hooks/use-social';
import { colors, fontFamily, radius, shadows, spacing } from '@/theme/tokens';
import type { EventEditionCard } from '@/types/models';
import type { AthleteSummary, LegacyMoment } from '@/types/social';
import { useI18n } from '@/i18n';

type Section = 'following' | 'discover' | 'events';

/**
 * Comunidad (formerly Explorar) — the community. Siguiendo / Descubrir are the cursor-paginated
 * feed (`meta.next_cursor`), Eventos is discovery. Search lives one tap
 * away (top right). Cached pages stay readable offline; errors never wipe
 * what's already on screen.
 */
export default function ExploreTab() {
  const { t } = useI18n();
  const [section, setSection] = useState<Section>('following');
  const myProfile = useProfile();

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: spacing.xs }}>
          <AppText variant="display" style={{ flex: 1 }} accessibilityRole="header">
            {t('Comunidad')}
          </AppText>
          <IconButton icon={Search} label={t('Buscar atletas, eventos y productos')} onPress={() => router.push('/search')} />
          <IconButton icon={Plus} label={t('Compartir un momento')} onPress={() => router.push('/moments/create')} />
          <PressableScale
            onPress={() => router.push('/profile')}
            accessibilityRole="button"
            accessibilityLabel={t('Mi perfil')}
            scaleTo={0.92}
            hitSlop={6}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -6 }}>
            <Avatar uri={myProfile.data?.profile?.profile_photo_url} name={myProfile.data?.athlete.full_name} size={32} />
          </PressableScale>
        </View>
        <SegmentedControl
          value={section}
          onChange={setSection}
          options={[
            { value: 'following', label: t('Siguiendo') },
            { value: 'discover', label: t('Descubrir') },
            { value: 'events', label: t('Eventos') },
          ]}
        />
      </View>

      {section === 'events' ? <EventsDiscovery /> : <CommunityFeed scope={section} onSwitchToDiscover={() => setSection('discover')} />}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Feed
// ---------------------------------------------------------------------------

function CommunityFeed({ scope, onSwitchToDiscover }: { scope: 'following' | 'discover'; onSwitchToDiscover: () => void }) {
  const { t } = useI18n();
  const feed = useFeed(scope);
  const explore = useExplore();
  const moments = useMemo<LegacyMoment[]>(() => feed.data?.pages.flatMap((p) => p.data) ?? [], [feed.data]);
  const suggestions = useMemo(() => (explore.data?.athletes ?? []).filter((a) => a.username && a.is_following !== true).slice(0, 10), [explore.data]);

  const renderItem = useCallback(
    ({ item, index }: { item: LegacyMoment; index: number }) => (
      <StaggerItem index={index}>
        <MomentCard moment={item} />
      </StaggerItem>
    ),
    [],
  );

  if (feed.isPending && !feed.data) {
    return (
      <View style={{ paddingTop: spacing.md, gap: spacing.lg }}>
        <View style={{ flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg }}>
          <Skeleton width={40} height={40} radius={20} />
          <View style={{ flex: 1, gap: 6 }}>
            <Skeleton height={14} width="50%" />
            <Skeleton height={12} width="30%" />
          </View>
        </View>
        <Skeleton height={300} radius={0} />
        <Skeleton height={14} width="70%" style={{ marginHorizontal: spacing.lg }} />
      </View>
    );
  }

  if (feed.isError && !feed.data) {
    return <ErrorState error={feed.error} message={t('No pudimos cargar la comunidad.')} onRetry={feed.refetch} />;
  }

  const showingStale = feed.isError && !!feed.data;
  const offline = feed.error instanceof AppError && (feed.error.kind === 'network' || feed.error.kind === 'timeout');

  return (
    <FlatList
      data={moments}
      keyExtractor={(item) => item.uuid}
      renderItem={renderItem}
      contentContainerStyle={{ paddingBottom: spacing.xxl, flexGrow: 1 }}
      refreshControl={<BrandRefreshControl refreshing={feed.isRefetching && !feed.isFetchingNextPage} onRefresh={() => { feed.refetch(); explore.refetch(); }} />}
      onEndReachedThreshold={0.6}
      onEndReached={() => feed.hasNextPage && !feed.isFetchingNextPage && !feed.isError && feed.fetchNextPage()}
      // Media-heavy rows: render few, keep a small window, recycle off-screen views.
      initialNumToRender={3}
      maxToRenderPerBatch={3}
      updateCellsBatchingPeriod={60}
      windowSize={7}
      removeClippedSubviews
      ListHeaderComponent={
        <View>
          {showingStale ? (
            <Animated.View
              entering={FadeIn}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginHorizontal: spacing.lg, marginBottom: spacing.sm, padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.card }}>
              <WifiOff size={16} color={colors.muted} />
              <AppText variant="caption" tone="muted" style={{ flex: 1 }}>
                {offline ? t('Sin conexión. Te mostramos lo último que guardamos.') : t('No pudimos actualizar. Te mostramos lo último que guardamos.')}
              </AppText>
              <Pressable onPress={() => feed.refetch()} accessibilityRole="button" hitSlop={8}>
                <AppText variant="caption" tone="gold">
                  {t('Reintentar')}
                </AppText>
              </Pressable>
            </Animated.View>
          ) : null}
          {suggestions.length > 0 ? <AthleteSuggestions athletes={suggestions} /> : null}
        </View>
      }
      ListFooterComponent={
        feed.isFetchingNextPage ? (
          <View style={{ paddingTop: spacing.md, gap: spacing.sm }}>
            <Skeleton height={16} width="40%" style={{ marginHorizontal: spacing.lg }} />
            <Skeleton height={220} radius={0} />
          </View>
        ) : moments.length > 0 && !feed.hasNextPage ? (
          <AppText variant="caption" align="center" style={{ color: colors.subtle, paddingVertical: spacing.lg }}>
            {t('Estás al día.')}
          </AppText>
        ) : null
      }
      ListEmptyComponent={
        scope === 'following' ? (
          <EmptyState
            icon={Users}
            title={t('Tu comunidad está por empezar')}
            message={t('Sigue a otros atletas para ver aquí sus carreras, medallas y entrenamientos. Tus propios momentos también aparecen aquí.')}
            actionLabel={t('Ver lo más reciente')}
            onAction={onSwitchToDiscover}
            secondaryLabel={t('Buscar atletas')}
            onSecondary={() => router.push('/search')}
          />
        ) : (
          <EmptyState
            icon={Compass}
            title={t('Aún no hay momentos públicos')}
            message={t('Sé el primero en compartir un entrenamiento, una carrera o un recuerdo.')}
            actionLabel={t('Compartir un momento')}
            onAction={() => router.push('/moments/create')}
          />
        )
      }
    />
  );
}

function AthleteSuggestions({ athletes }: { athletes: AthleteSummary[] }) {
  const { t } = useI18n();
  return (
    <View style={{ paddingBottom: spacing.md, marginBottom: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
      <AppText variant="eyebrow" tone="subtle" style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.sm }}>
        {t('Atletas para seguir')}
      </AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}>
        {athletes.map((athlete) => (
          <SuggestionCard key={athlete.username ?? athlete.name} athlete={athlete} />
        ))}
      </ScrollView>
    </View>
  );
}

const SuggestionCard = memo(function SuggestionCard({ athlete }: { athlete: AthleteSummary }) {
  const { t } = useI18n();
  const myUsername = useProfile().data?.profile?.username;
  const username = athlete.username as string;
  return (
    <View style={{ width: 148, padding: spacing.sm, borderRadius: radius.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.hairline, alignItems: 'center', gap: spacing.xs, ...shadows.soft }}>
      <Pressable
        onPress={() => router.push(`/athlete/${username}`)}
        accessibilityRole="button"
        accessibilityLabel={t('Ver perfil de {name}', { name: athlete.name })}
        style={{ alignItems: 'center', gap: 6 }}>
        <Avatar uri={athlete.photo_url} name={athlete.name} size={56} ring />
        <AppText style={{ fontFamily: fontFamily.semibold, fontSize: 14 }} numberOfLines={1}>
          {athlete.name}
        </AppText>
        <AppText variant="caption" numberOfLines={1} style={{ color: colors.subtle, fontSize: 12, marginTop: -4 }}>
          {athlete.city ?? `@${username}`}
        </AppText>
      </Pressable>
      {username !== myUsername ? <FollowButton username={username} isFollowing={!!athlete.is_following} firstName={athlete.name.split(' ')[0]} fullWidth /> : null}
    </View>
  );
});

// ---------------------------------------------------------------------------
// Events discovery
// ---------------------------------------------------------------------------

function EventsDiscovery() {
  const { t } = useI18n();
  const events = useEvents();
  const rows = useMemo<EventEditionCard[]>(() => events.data?.pages.flatMap((p) => p.data) ?? [], [events.data]);
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = useMemo(() => rows.filter((e) => e.event_date >= today), [rows, today]);

  if (events.isPending && !events.data) {
    return (
      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        <Skeleton height={200} radius={16} />
        <Skeleton height={200} radius={16} />
      </View>
    );
  }
  if (events.isError && !events.data) {
    return <ErrorState error={events.error} message={t('No pudimos cargar los eventos.')} onRetry={events.refetch} />;
  }

  return (
    <FlatList
      data={upcoming.length > 0 ? upcoming : rows}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md, flexGrow: 1 }}
      renderItem={({ item, index }) => (
        <StaggerItem index={index}>
          <EventCard edition={item} onPress={() => router.push(`/events/${item.event.slug}`)} />
        </StaggerItem>
      )}
      refreshControl={<BrandRefreshControl refreshing={events.isRefetching && !events.isFetchingNextPage} onRefresh={events.refetch} />}
      onEndReachedThreshold={0.5}
      onEndReached={() => events.hasNextPage && !events.isFetchingNextPage && events.fetchNextPage()}
      initialNumToRender={4}
      windowSize={7}
      ListHeaderComponent={
        upcoming.length > 0 ? (
          <AppText variant="eyebrow" tone="subtle">
            {t('Próximas carreras')}
          </AppText>
        ) : null
      }
      ListFooterComponent={events.isFetchingNextPage ? <Skeleton height={200} radius={16} /> : null}
      ListEmptyComponent={<EmptyState icon={CalendarDays} title={t('Sin eventos próximos')} message={t('Vuelve pronto: aquí aparecerán las próximas carreras.')} compact />}
    />
  );
}
