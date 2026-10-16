import { router } from 'expo-router';
import { CalendarDays, Compass, Plus, Search, Users, WifiOff } from 'lucide-react-native';
import { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

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
import { colors, fontFamily, radius, spacing } from '@/theme/tokens';
import type { EventEditionCard } from '@/types/models';
import type { AthleteSummary, LegacyMoment } from '@/types/social';

type Section = 'following' | 'discover' | 'events';

/**
 * Explorar — the community. Siguiendo / Descubrir are the cursor-paginated
 * feed (`meta.next_cursor`), Eventos is discovery. Search lives one tap
 * away (top right). Cached pages stay readable offline; errors never wipe
 * what's already on screen.
 */
export default function ExploreTab() {
  const [section, setSection] = useState<Section>('following');

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.black }}>
      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: spacing.xs }}>
          <AppText variant="hero" style={{ fontSize: 34, lineHeight: 38, flex: 1 }} accessibilityRole="header">
            EXPLORAR
          </AppText>
          <IconButton icon={Search} label="Buscar atletas, eventos y productos" onPress={() => router.push('/search')} />
          <IconButton icon={Plus} label="Compartir un momento" onPress={() => router.push('/moments/create')} color={colors.gold} style={{ marginRight: -10 }} />
        </View>
        <SegmentedControl
          value={section}
          onChange={setSection}
          options={[
            { value: 'following', label: 'Siguiendo' },
            { value: 'discover', label: 'Descubrir' },
            { value: 'events', label: 'Eventos' },
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
  const feed = useFeed(scope);
  const explore = useExplore();
  const moments = useMemo<LegacyMoment[]>(() => feed.data?.pages.flatMap((p) => p.data) ?? [], [feed.data]);
  const suggestions = useMemo(() => (explore.data?.athletes ?? []).filter((a) => a.username && a.is_following !== true).slice(0, 10), [explore.data]);

  const renderItem = useCallback(({ item }: { item: LegacyMoment }) => <MomentCard moment={item} />, []);

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
    return <ErrorState error={feed.error} message="No pudimos cargar la comunidad." onRetry={feed.refetch} />;
  }

  const showingStale = feed.isError && !!feed.data;
  const offline = feed.error instanceof AppError && (feed.error.kind === 'network' || feed.error.kind === 'timeout');

  return (
    <FlatList
      data={moments}
      keyExtractor={(item) => item.uuid}
      renderItem={renderItem}
      contentContainerStyle={{ paddingBottom: spacing.xxl, flexGrow: 1 }}
      refreshControl={<RefreshControl refreshing={feed.isRefetching && !feed.isFetchingNextPage} onRefresh={() => { feed.refetch(); explore.refetch(); }} tintColor={colors.gold} />}
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
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginHorizontal: spacing.lg, marginBottom: spacing.sm, padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.graphite }}>
              <WifiOff size={16} color={colors.muted} />
              <AppText variant="caption" tone="muted" style={{ flex: 1 }}>
                {offline ? 'Sin conexión. Te mostramos lo último que guardamos.' : 'No pudimos actualizar. Te mostramos lo último que guardamos.'}
              </AppText>
              <Pressable onPress={() => feed.refetch()} accessibilityRole="button" hitSlop={8}>
                <AppText variant="caption" tone="gold">
                  Reintentar
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
            Estás al día.
          </AppText>
        ) : null
      }
      ListEmptyComponent={
        scope === 'following' ? (
          <EmptyState
            icon={Users}
            title="Tu comunidad está por empezar"
            message="Sigue a otros atletas para ver aquí sus carreras, medallas y entrenamientos. Tus propios momentos también aparecen aquí."
            actionLabel="Ver lo más reciente"
            onAction={onSwitchToDiscover}
            secondaryLabel="Buscar atletas"
            onSecondary={() => router.push('/search')}
          />
        ) : (
          <EmptyState
            icon={Compass}
            title="Aún no hay momentos públicos"
            message="Sé el primero en compartir un entrenamiento, una carrera o un recuerdo."
            actionLabel="Compartir un momento"
            onAction={() => router.push('/moments/create')}
          />
        )
      }
    />
  );
}

function AthleteSuggestions({ athletes }: { athletes: AthleteSummary[] }) {
  return (
    <View style={{ paddingBottom: spacing.md, marginBottom: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
      <AppText variant="label" tone="muted" style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.sm, letterSpacing: 1.5 }}>
        ATLETAS PARA SEGUIR
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
  const myUsername = useProfile().data?.profile?.username;
  const username = athlete.username as string;
  return (
    <View style={{ width: 148, padding: spacing.sm, borderRadius: radius.lg, backgroundColor: colors.graphite, borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: spacing.xs }}>
      <Pressable
        onPress={() => router.push(`/athlete/${username}`)}
        accessibilityRole="button"
        accessibilityLabel={`Ver perfil de ${athlete.name}`}
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
    return <ErrorState error={events.error} message="No pudimos cargar los eventos." onRetry={events.refetch} />;
  }

  return (
    <FlatList
      data={upcoming.length > 0 ? upcoming : rows}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md, flexGrow: 1 }}
      renderItem={({ item }) => <EventCard edition={item} onPress={() => router.push(`/events/${item.event.slug}`)} />}
      refreshControl={<RefreshControl refreshing={events.isRefetching && !events.isFetchingNextPage} onRefresh={events.refetch} tintColor={colors.gold} />}
      onEndReachedThreshold={0.5}
      onEndReached={() => events.hasNextPage && !events.isFetchingNextPage && events.fetchNextPage()}
      initialNumToRender={4}
      windowSize={7}
      ListHeaderComponent={
        upcoming.length > 0 ? (
          <AppText variant="label" tone="muted" style={{ letterSpacing: 1.5 }}>
            PRÓXIMAS CARRERAS
          </AppText>
        ) : null
      }
      ListFooterComponent={events.isFetchingNextPage ? <Skeleton height={200} radius={16} /> : null}
      ListEmptyComponent={<EmptyState icon={CalendarDays} title="Sin eventos próximos" message="Vuelve pronto: aquí aparecerán las próximas carreras." compact />}
    />
  );
}
