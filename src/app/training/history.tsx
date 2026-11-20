/**
 * Historial — every saved workout, newest first (paginated from the
 * server), filterable Todos / En vivo / Manual. Workouts still waiting in
 * the offline outbox are listed on top with a "pendiente" mark.
 */
import { router, type Href } from 'expo-router';
import { Dumbbell } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { BrandRefreshControl } from '@/components/motion/brand-refresh-control';
import { Skeleton } from '@/components/skeleton';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { TopBar } from '@/components/ui/top-bar';
import { StatusBarScrim } from '@/components/ui/status-bar-scrim';
import { WorkoutRow, workoutToRow, type WorkoutRowData } from '@/features/training/workout/components/workout-row';
import { flattenWorkouts, useRefreshOnSync, useWorkoutHistory } from '@/features/training/workout/use-workouts';
import { useWorkoutOutbox } from '@/features/training/workout/workout-outbox';
import { useI18n } from '@/i18n';
import { colors, radius, spacing } from '@/theme/tokens';

type Filter = 'all' | 'live' | 'manual';

export default function WorkoutHistoryScreen() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<Filter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const query = useWorkoutHistory(filter);
  const ops = useWorkoutOutbox((s) => s.ops);
  useRefreshOnSync();

  const rows = useMemo<WorkoutRowData[]>(() => {
    const pending = ops.flatMap((op) =>
      (op.kind === 'finish' || op.kind === 'manual') && (filter === 'all' || op.summary.source === filter)
        ? [
            {
              key: `pending-${op.id}`,
              sportName: op.summary.sportName,
              sportSlug: op.summary.sportSlug,
              metric: op.summary.sportSlug === 'ciclismo' ? ('speed' as const) : ('pace' as const),
              source: op.summary.source,
              startedAt: op.summary.startedAt,
              durationS: op.summary.durationS,
              distanceM: op.summary.distanceM,
              pending: true,
            },
          ]
        : [],
    );
    return [...pending, ...flattenWorkouts(query.data?.pages).map(workoutToRow)];
  }, [ops, filter, query.data]);

  const filters: { value: Filter; label: string }[] = [
    { value: 'all', label: t('Todos||filtro: todos los entrenamientos') },
    { value: 'live', label: t('En vivo') },
    { value: 'manual', label: t('Manual') },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={rows}
        keyExtractor={(row) => row.key}
        contentContainerStyle={{ paddingTop: insets.top, paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.xxl, gap: spacing.sm }}
        ListHeaderComponent={
          <View style={{ gap: spacing.md, marginBottom: spacing.xs }}>
            <TopBar title={t('Historial')} large />
            <SegmentedControl options={filters} value={filter} onChange={setFilter} />
          </View>
        }
        renderItem={({ item }) => (
          <WorkoutRow row={item} onPress={item.pending ? undefined : () => router.push(`/training/workouts/${item.key}` as Href)} />
        )}
        ListEmptyComponent={
          query.isPending ? (
            <View style={{ gap: spacing.sm }}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} height={76} radius={radius.lg} />
              ))}
            </View>
          ) : query.isError ? (
            <ErrorState error={query.error} onRetry={() => query.refetch()} message={t('No pudimos cargar tus entrenamientos.')} />
          ) : (
            <EmptyState compact icon={Dumbbell} title={t('Sin entrenamientos aún')} message={t('Cuando entrenes o registres una actividad, aparecerá aquí.')} />
          )
        }
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
        }}
        ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator style={{ marginTop: spacing.md }} color={colors.accent} /> : null}
        refreshControl={
          <BrandRefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await query.refetch().catch(() => {});
              setRefreshing(false);
            }}
          />
        }
      />
      <StatusBarScrim />
    </View>
  );
}
