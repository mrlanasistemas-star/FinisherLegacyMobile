import { router } from 'expo-router';
import { CalendarDays } from 'lucide-react-native';
import { useMemo } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { SectionTitle } from '@/components/brand/section-title';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { EventCard } from '@/components/event-card';
import { Screen } from '@/components/screen';
import { Skeleton } from '@/components/skeleton';
import { useEvents } from '@/hooks/use-events';
import { spacing } from '@/theme/tokens';
import type { EventEditionCard } from '@/types/models';

export default function EventsScreen() {
  const { data, isPending, isError, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useEvents();

  const editions = useMemo<EventEditionCard[]>(() => data?.pages.flatMap((page) => page.data) ?? [], [data]);
  const [featured, ...rest] = editions;

  const header = (
    <View>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md }}>
        <AppText variant="hero" style={{ fontSize: 40, lineHeight: 40 }}>
          EVENTOS
        </AppText>
        <AppText variant="body" tone="muted" style={{ marginTop: spacing.xxs }}>
          Descubre tu siguiente meta
        </AppText>
      </View>

      {featured ? (
        <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.lg }}>
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
      ) : editions.length === 0 ? (
        <EmptyState icon={CalendarDays} title="Sin eventos por ahora" message="Vuelve pronto para ver las próximas carreras." />
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
