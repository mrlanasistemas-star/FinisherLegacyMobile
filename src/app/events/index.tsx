import { router } from 'expo-router';
import { CalendarDays } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandRefreshControl } from '@/components/motion/brand-refresh-control';
import { AppText } from '@/components/app-text';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { EventCard } from '@/components/event-card';
import { StaggerItem } from '@/components/motion/reveal';
import { Skeleton } from '@/components/skeleton';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { TopBar } from '@/components/ui/top-bar';
import { useEvents } from '@/hooks/use-events';
import { colors, spacing } from '@/theme/tokens';
import type { EventEditionCard } from '@/types/models';
import { isPastDate } from '@/utils/dates';

type Filter = 'upcoming' | 'past';

export default function EventsScreen() {
  const { data, isPending, isError, error, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } = useEvents();
  const [filter, setFilter] = useState<Filter>('upcoming');
  const insets = useSafeAreaInsets();

  const allEditions = useMemo<EventEditionCard[]>(() => data?.pages.flatMap((page) => page.data) ?? [], [data]);
  const editions = useMemo(() => allEditions.filter((edition) => isPastDate(edition.event_date) === (filter === 'past')), [allEditions, filter]);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.sm }}>
        <TopBar title="Eventos" />
        <AppText variant="body" tone="muted">
          Encuentra tu siguiente meta.
        </AppText>
        <SegmentedControl
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'upcoming', label: 'Próximos' },
            { value: 'past', label: 'Pasados' },
          ]}
        />
      </View>

      {isPending ? (
        <View style={{ gap: spacing.md, padding: spacing.lg }}>
          <Skeleton height={240} radius={16} />
          <Skeleton height={120} radius={16} />
        </View>
      ) : isError ? (
        <ErrorState error={error} message="No pudimos cargar los eventos." onRetry={refetch} />
      ) : (
        <FlatList
          data={editions}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.xl, flexGrow: 1 }}
          refreshControl={<BrandRefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
          ListFooterComponent={isFetchingNextPage ? <Skeleton height={120} radius={16} /> : null}
          renderItem={({ item, index }) => (
            <StaggerItem index={index}>
              <EventCard edition={item} featured={index === 0 && filter === 'upcoming'} onPress={() => router.push(`/events/${item.event.slug}`)} />
            </StaggerItem>
          )}
          ListEmptyComponent={
            <EmptyState
              compact
              icon={CalendarDays}
              title={filter === 'upcoming' ? 'Sin eventos próximos por ahora' : 'Aún no hay eventos pasados'}
              message="Vuelve pronto: aquí aparecen las carreras de la comunidad Finisher Legacy."
            />
          }
        />
      )}
    </SafeAreaView>
  );
}
