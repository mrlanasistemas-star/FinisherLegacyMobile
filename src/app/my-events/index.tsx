import { router } from 'expo-router';
import { Trophy } from 'lucide-react-native';
import { useMemo } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { MascotTip } from '@/components/brand/mascot-tip';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { MyEventRow } from '@/components/my-event-row';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { useMyEvents } from '@/hooks/use-my-events';
import { spacing } from '@/theme/tokens';
import type { AthleteHistoryRow } from '@/types/models';

type Section = { year: string; rows: AthleteHistoryRow[] };

function groupByYear(rows: AthleteHistoryRow[]): Section[] {
  const buckets = new Map<string, AthleteHistoryRow[]>();
  for (const row of rows) {
    const year = row.event_date ? row.event_date.slice(0, 4) : 'Sin fecha';
    const bucket = buckets.get(year) ?? [];
    bucket.push(row);
    buckets.set(year, bucket);
  }
  return Array.from(buckets.entries()).map(([year, bucketRows]) => ({ year, rows: bucketRows }));
}

export default function MyEventsScreen() {
  const { data, isPending, isError, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useMyEvents();

  const rows = useMemo<AthleteHistoryRow[]>(() => data?.pages.flatMap((page) => page.rows) ?? [], [data]);
  const sections = useMemo(() => groupByYear(rows), [rows]);

  const header = (
    <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md }}>
      <ScreenHeader title="Mi Legado" />
      <AppText variant="hero" style={{ fontSize: 36, lineHeight: 38, marginTop: spacing.xs }}>
        MIS EVENTOS
      </AppText>
      <AppText variant="body" tone="muted" style={{ marginTop: spacing.xxs, marginBottom: spacing.md }}>
        Cada carrera que corriste, en un solo lugar.
      </AppText>
      <MascotTip
        id="my-events-intro"
        message="Toca cualquier carrera para revivirla: tu resultado, tus medallas, tus recuerdos y tu equipo."
      />
    </View>
  );

  return (
    <Screen edges={['top', 'left', 'right']} padded={false}>
      {isPending ? (
        <View style={{ gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
          <Skeleton height={32} width={200} />
          <Skeleton height={110} radius={16} />
          <Skeleton height={110} radius={16} />
        </View>
      ) : isError ? (
        <ErrorState message="No pudimos cargar tu historia." onRetry={refetch} />
      ) : rows.length === 0 ? (
        <View>
          {header}
          <EmptyState
            icon={Trophy}
            title="Tu historia empieza aquí"
            message="Cuando tu Legacy Code se vincule a una participación real, aparecerá en tu línea de tiempo."
          />
        </View>
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(section) => section.year}
          ListHeaderComponent={header}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.lg }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => hasNextPage && fetchNextPage()}
          ListFooterComponent={isFetchingNextPage ? <Skeleton height={60} style={{ marginTop: spacing.sm }} /> : null}
          renderItem={({ item: section }) => (
            <View style={{ gap: spacing.sm }}>
              <AppText variant="label" tone="muted" style={{ letterSpacing: 2 }}>
                {section.year}
              </AppText>
              <View style={{ gap: spacing.sm }}>
                {section.rows.map((row) => (
                  <MyEventRow key={row.id} row={row} onPress={() => router.push(`/my-events/${row.id}`)} />
                ))}
              </View>
            </View>
          )}
        />
      )}
    </Screen>
  );
}
