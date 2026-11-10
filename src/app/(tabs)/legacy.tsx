import { router, type Href } from 'expo-router';
import { Award, Flag, KeyRound, Nfc, PenLine, Plus, Sparkles } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandRefreshControl } from '@/components/motion/brand-refresh-control';
import { AppText } from '@/components/app-text';
import { MedalHeroTile } from '@/components/brand/medal-hero-tile';
import { MetricNumber } from '@/components/brand/metric-number';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { LegacyTimelineCard } from '@/components/legacy/legacy-timeline-card';
import { StaggerItem } from '@/components/motion/reveal';
import { ScrollHeader, useScrollY } from '@/components/motion/scroll-header';
import { MyGearRail } from '@/components/legacy/my-gear-rail';
import { MyStoriesEntry } from '@/features/iap/my-stories-entry';
import { useMyStories } from '@/features/iap/use-photo-expansion';
import { Skeleton } from '@/components/skeleton';
import { IconButton } from '@/components/ui/icon-button';
import { SectionHeader } from '@/components/ui/section-header';
import { Sheet } from '@/components/ui/sheet';
import { SheetActionRow } from '@/components/ui/sheet-action-row';
import { useMedals } from '@/hooks/use-medals';
import { useMyEvents } from '@/hooks/use-my-events';
import { useMyGear } from '@/hooks/use-gear';
import { useProfile } from '@/hooks/use-profile';
import { colors, spacing } from '@/theme/tokens';
import type { AthleteHistoryRow } from '@/types/models';

type TimelineItem = { kind: 'year'; key: string; year: string } | { kind: 'race'; key: string; row: AthleteHistoryRow; first: boolean };

const RAIL = 22;
const NAV_HEIGHT = 52;

/** Year markers between races — the timeline reads like chapters. */
function toTimeline(rows: AthleteHistoryRow[]): TimelineItem[] {
  const items: TimelineItem[] = [];
  let currentYear: string | null = null;
  rows.forEach((row, index) => {
    const year = row.event_date?.slice(0, 4) ?? '';
    if (year && year !== currentYear) {
      currentYear = year;
      items.push({ kind: 'year', key: `y-${year}`, year });
    }
    items.push({ kind: 'race', key: `r-${row.id}`, row, first: index === 0 });
  });
  return items;
}

/**
 * Legado — the athlete's story, newest page first. Every participation is
 * a big card that opens its full story (result, media, gear, Legacy Plate,
 * apoyo). Mi equipo and medals sit above as the "collection"; adding is one
 * "+" away. Works from cache offline (profile + latest legacy persist).
 */
export default function RecuerdosScreen() {
  const insets = useSafeAreaInsets();
  const { scrollY, onScroll } = useScrollY();
  const [addOpen, setAddOpen] = useState(false);
  const profile = useProfile();
  const medals = useMedals();
  const myEvents = useMyEvents();
  const gear = useMyGear();
  const stories = useMyStories();

  const rows = useMemo(() => myEvents.data?.pages.flatMap((p) => p.rows) ?? [], [myEvents.data]);
  const timeline = useMemo(() => toTimeline(rows), [rows]);
  const medalList = useMemo(() => medals.data?.pages[0]?.data.slice(0, 10) ?? [], [medals.data]);
  const stats = profile.data?.stats;

  const isEmpty = !myEvents.isPending && !medals.isPending && rows.length === 0 && medalList.length === 0 && (gear.data?.length ?? 0) === 0 && (stories.data?.length ?? 0) === 0;

  const refresh = () => {
    profile.refetch();
    medals.refetch();
    myEvents.refetch();
    gear.refetch();
    stories.refetch();
  };

  const renderItem = useCallback(({ item, index }: { item: TimelineItem; index: number }) => {
    if (item.kind === 'year') {
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: index === 0 ? 0 : spacing.md, paddingBottom: spacing.sm }}>
          <View style={{ width: RAIL, alignItems: 'center' }}>
            <View style={{ width: 9, height: 9, borderRadius: 5, borderWidth: 1.5, borderColor: colors.gold, backgroundColor: colors.background }} />
          </View>
          <AppText variant="eyebrow" style={{ marginLeft: spacing.xs, fontSize: 12 }}>
            {item.year}
          </AppText>
        </View>
      );
    }
    return (
      <StaggerItem index={index} style={{ flexDirection: 'row', paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <View style={{ width: RAIL, alignItems: 'center' }}>
          <View style={{ position: 'absolute', top: 0, bottom: -spacing.md, width: 1, backgroundColor: colors.border }} />
          <View style={{ marginTop: 26, width: 7, height: 7, borderRadius: 4, backgroundColor: item.first ? colors.gold : colors.goldDim }} />
        </View>
        <View style={{ flex: 1, marginLeft: spacing.xs }}>
          <LegacyTimelineCard row={item.row} onPress={() => router.push(`/my-events/${item.row.id}`)} />
        </View>
      </StaggerItem>
    );
  }, []);

  const header = (
    <View style={{ gap: spacing.xl, paddingBottom: spacing.lg }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xs }}>
        <AppText variant="eyebrow">Tu historia</AppText>
        <AppText variant="display" accessibilityRole="header">
          Mis recuerdos
        </AppText>

        {stats ? (
          <View style={{ flexDirection: 'row', gap: spacing.lg, marginTop: spacing.lg, padding: spacing.md, borderRadius: 16, borderCurve: 'continuous', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.hairline }}>
            <MetricNumber value={stats.event_count} label={stats.event_count === 1 ? 'Carrera' : 'Carreras'} size={30} tone="gold" animate />
            <MetricNumber value={stats.medal_count} label={stats.medal_count === 1 ? 'Medalla' : 'Medallas'} size={30} animate />
            {stats.total_distance_km ? <MetricNumber value={Math.round(stats.total_distance_km)} label="Kilómetros" size={30} animate /> : null}
          </View>
        ) : profile.isPending ? (
          <Skeleton width={220} height={44} style={{ marginTop: spacing.md }} />
        ) : null}
      </View>

      <MyGearRail />

      <MyStoriesEntry />

      {medalList.length > 0 ? (
        <View>
          <SectionHeader
            title="Medallas"
            actionLabel={stats?.medal_count ? `Ver ${stats.medal_count}` : 'Ver todo'}
            onAction={() => router.push('/medals')}
            style={{ paddingHorizontal: spacing.lg }}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}>
            {medalList.map((medal) => (
              <MedalHeroTile key={medal.id} medal={medal} width={120} onPress={() => router.push(`/medals/${medal.id}`)} />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {rows.length > 0 ? <SectionHeader title="Tu historia" actionLabel="Lista" onAction={() => router.push('/my-events')} style={{ paddingHorizontal: spacing.lg, marginBottom: -spacing.md }} /> : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Animated.FlatList
        onScroll={onScroll}
        scrollEventThrottle={16}
        data={isEmpty ? [] : timeline}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        ListHeaderComponent={header}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + NAV_HEIGHT, paddingBottom: spacing.xxl, flexGrow: 1 }}
        refreshControl={<BrandRefreshControl refreshing={myEvents.isRefetching && !myEvents.isFetchingNextPage} onRefresh={refresh} progressViewOffset={insets.top + NAV_HEIGHT} />}
        onEndReachedThreshold={0.5}
        onEndReached={() => myEvents.hasNextPage && !myEvents.isFetchingNextPage && myEvents.fetchNextPage()}
        initialNumToRender={4}
        windowSize={9}
        ListFooterComponent={myEvents.isFetchingNextPage ? <Skeleton height={200} radius={24} style={{ marginHorizontal: spacing.lg }} /> : null}
        ListEmptyComponent={
          myEvents.isPending && !myEvents.data ? (
            <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
              <Skeleton height={228} radius={22} />
              <Skeleton height={228} radius={22} />
            </View>
          ) : myEvents.isError && !myEvents.data ? (
            <ErrorState error={myEvents.error} message="No pudimos cargar tu historia." onRetry={myEvents.refetch} />
          ) : isEmpty ? (
            <EmptyState
              icon={Sparkles}
              title="Tus recuerdos empiezan aquí"
              message="Activa tu pieza Finisher Legacy con NFC o participa en un evento: tus resultados, fotos y equipo aparecerán aquí."
              actionLabel="Activar mi pieza"
              onAction={() => router.push('/activate' as Href)}
              secondaryLabel="Agregar una medalla"
              onSecondary={() => router.push('/medals/create')}
            />
          ) : (
            <AppText variant="body" tone="muted" style={{ paddingHorizontal: spacing.lg }}>
              Cuando participes en un evento Finisher Legacy, tus resultados aparecerán aquí.
            </AppText>
          )
        }
      />

      <ScrollHeader
        scrollY={scrollY}
        title="Mis recuerdos"
        threshold={70}
        right={<IconButton icon={Plus} label="Agregar a mis recuerdos" onPress={() => setAddOpen(true)} color={colors.accent} />}
      />

      {addOpen ? (
        <Sheet visible onClose={() => setAddOpen(false)}>
          <AppText variant="subtitle" style={{ marginBottom: spacing.xs }}>
            Agregar a mis recuerdos
          </AppText>
          <SheetActionRow icon={Nfc} label="Activar una pieza con NFC" onPress={() => go('/activate' as Href)} />
          <SheetActionRow icon={Award} label="Agregar medalla" onPress={() => go('/medals/create')} />
          <SheetActionRow icon={PenLine} label="Compartir un momento" onPress={() => go('/moments/create')} />
          <SheetActionRow icon={Flag} label="Ver todas mis carreras" onPress={() => go('/my-events')} />
          <SheetActionRow icon={KeyRound} label="Tengo un código impreso" onPress={() => go('/legacy/scan')} />
        </Sheet>
      ) : null}
    </View>
  );

  function go(href: Href) {
    setAddOpen(false);
    router.push(href);
  }
}
