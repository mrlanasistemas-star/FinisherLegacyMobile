import { router } from 'expo-router';
import { CalendarDays, ChevronRight, Store as StoreIcon } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { MascotTip } from '@/components/brand/mascot-tip';
import { SectionTitle } from '@/components/brand/section-title';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { EventCard } from '@/components/event-card';
import { Screen } from '@/components/screen';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Skeleton } from '@/components/skeleton';
import { useEvents } from '@/hooks/use-events';
import { isPastDate } from '@/utils/dates';
import { colors, radius, spacing } from '@/theme/tokens';
import type { EventEditionCard } from '@/types/models';

function StoreTeaser() {
  return (
    <Pressable
      onPress={() => router.push('/store')}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.goldDim,
        backgroundColor: colors.graphite,
        padding: spacing.md,
        opacity: pressed ? 0.85 : 1,
      })}>
      <StoreIcon color={colors.gold} size={20} />
      <View style={{ flex: 1 }}>
        <AppText variant="bodyStrong">Finisher Legacy Store</AppText>
        <AppText variant="caption" tone="muted">
          Equipo y gear que se suma a tu historia
        </AppText>
      </View>
      <ChevronRight color={colors.muted} size={18} />
    </Pressable>
  );
}

type Filter = 'upcoming' | 'past';

export default function EventsScreen() {
  const { data, isPending, isError, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useEvents();
  const [filter, setFilter] = useState<Filter>('upcoming');

  const allEditions = useMemo<EventEditionCard[]>(() => data?.pages.flatMap((page) => page.data) ?? [], [data]);
  const editions = useMemo(
    () => allEditions.filter((edition) => isPastDate(edition.event_date) === (filter === 'past')),
    [allEditions, filter],
  );
  const [featured, ...rest] = editions;

  const header = (
    <View>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md }}>
        <AppText variant="hero" style={{ fontSize: 40, lineHeight: 40 }}>
          EVENTOS
        </AppText>
        <AppText variant="body" tone="muted" style={{ marginTop: spacing.xxs, marginBottom: spacing.md }}>
          Descubre tu siguiente meta
        </AppText>
        <MascotTip id="events-intro" message="¿Cuál será tu próxima meta?" style={{ marginBottom: spacing.md }} />
        <StoreTeaser />
        <View style={{ height: spacing.md }} />
        <SegmentedControl
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'upcoming', label: 'Próximos' },
            { value: 'past', label: 'Pasados' },
          ]}
        />
      </View>

      {featured ? (
        <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.lg, marginTop: spacing.md }}>
          <EventCard edition={featured} featured onPress={() => router.push(`/events/${featured.event.slug}`)} />
        </View>
      ) : null}

      {rest.length > 0 ? (
        <SectionTitle eyebrow="Explora" title="Más eventos" style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.md }} />
      ) : null}
    </View>
  );

  return (
    <Screen edges={['top', 'left', 'right']} padded={false}>
      {isPending ? (
        <View style={{ gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
          <Skeleton height={40} width={200} />
          <Skeleton height={280} radius={16} />
        </View>
      ) : isError ? (
        <ErrorState message="No pudimos cargar los eventos." onRetry={refetch} />
      ) : allEditions.length === 0 ? (
        <EmptyState icon={CalendarDays} title="Sin eventos por ahora" message="Vuelve pronto para ver las próximas carreras." />
      ) : editions.length === 0 ? (
        <View>
          {header}
          <AppText variant="body" tone="muted" style={{ paddingHorizontal: spacing.lg }}>
            {filter === 'upcoming' ? 'No hay eventos próximos por ahora.' : 'Aún no hay eventos pasados.'}
          </AppText>
        </View>
      ) : (
        <FlatList
          data={rest}
          keyExtractor={(item) => String(item.id)}
          ListHeaderComponent={header}
          contentContainerStyle={{ gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => hasNextPage && fetchNextPage()}
          ListFooterComponent={isFetchingNextPage ? <Skeleton height={60} /> : null}
          renderItem={({ item }) => <EventCard edition={item} onPress={() => router.push(`/events/${item.event.slug}`)} />}
        />
      )}
    </Screen>
  );
}
