import { router } from 'expo-router';
import { ChevronLeft, Trophy } from 'lucide-react-native';
import { useMemo } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { BrandRefreshControl } from '@/components/motion/brand-refresh-control';
import { StaggerItem } from '@/components/motion/reveal';
import { ScrollHeader, useScrollY } from '@/components/motion/scroll-header';
import { MyEventRow } from '@/components/my-event-row';
import { Skeleton } from '@/components/skeleton';
import { IconButton } from '@/components/ui/icon-button';
import { useMyEvents } from '@/hooks/use-my-events';
import { colors, spacing } from '@/theme/tokens';
import type { AthleteHistoryRow } from '@/types/models';

type Section = { year: string; rows: AthleteHistoryRow[] };

const NAV_HEIGHT = 52;

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

/** Mis carreras — every participation grouped by year, large title collapsing into the nav bar. */
export default function MyEventsScreen() {
  const insets = useSafeAreaInsets();
  const { scrollY, onScroll } = useScrollY();
  const { data, isPending, isError, error, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } = useMyEvents();

  const rows = useMemo<AthleteHistoryRow[]>(() => data?.pages.flatMap((page) => page.rows) ?? [], [data]);
  const sections = useMemo(() => groupByYear(rows), [rows]);
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/legacy'));

  const header = (
    <View style={{ paddingBottom: spacing.sm, gap: 2 }}>
      <AppText variant="display" accessibilityRole="header">
        Mis carreras
      </AppText>
      <AppText variant="body" tone="muted">
        Cada carrera que corriste, en un solo lugar.
      </AppText>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Animated.FlatList
        onScroll={onScroll}
        scrollEventThrottle={16}
        data={isPending || isError ? [] : sections}
        keyExtractor={(section) => section.year}
        ListHeaderComponent={header}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: insets.top + NAV_HEIGHT, paddingBottom: insets.bottom + spacing.xl, gap: spacing.lg, flexGrow: 1 }}
        refreshControl={<BrandRefreshControl refreshing={isRefetching} onRefresh={refetch} progressViewOffset={insets.top + NAV_HEIGHT} />}
        onEndReachedThreshold={0.4}
        onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
        ListFooterComponent={isFetchingNextPage ? <Skeleton height={96} radius={16} /> : null}
        ListEmptyComponent={
          isPending ? (
            <View style={{ gap: spacing.sm }}>
              <Skeleton height={96} radius={16} />
              <Skeleton height={96} radius={16} />
              <Skeleton height={96} radius={16} />
            </View>
          ) : isError ? (
            <ErrorState error={error} message="No pudimos cargar tu historia." onRetry={refetch} />
          ) : (
            <EmptyState
              icon={Trophy}
              title="Tu historia empieza aquí"
              message="Cuando una participación real se vincule a tu cuenta, aparecerá en esta línea de tiempo."
            />
          )
        }
        renderItem={({ item: section, index }) => (
          <StaggerItem index={index} style={{ gap: spacing.sm }}>
            <AppText variant="eyebrow" tone="muted" accessibilityRole="header">
              {section.year}
            </AppText>
            <View style={{ gap: spacing.sm }}>
              {section.rows.map((row) => (
                <MyEventRow key={row.id} row={row} onPress={() => router.push(`/my-events/${row.id}`)} />
              ))}
            </View>
          </StaggerItem>
        )}
      />

      <ScrollHeader scrollY={scrollY} title="Mis carreras" threshold={60} left={<IconButton icon={ChevronLeft} label="Volver" onPress={goBack} size={26} />} />
    </View>
  );
}
