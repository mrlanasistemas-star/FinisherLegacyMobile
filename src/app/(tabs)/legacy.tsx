import { router } from 'expo-router';
import { Award, Flag, KeyRound, Nfc, PenLine, Plus, Sparkles } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { MedalHeroTile } from '@/components/brand/medal-hero-tile';
import { MetricNumber } from '@/components/brand/metric-number';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { LegacyTimelineCard } from '@/components/legacy/legacy-timeline-card';
import { MyGearRail } from '@/components/legacy/my-gear-rail';
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
export default function LegadoScreen() {
  const [addOpen, setAddOpen] = useState(false);
  const profile = useProfile();
  const medals = useMedals();
  const myEvents = useMyEvents();
  const gear = useMyGear();

  const rows = useMemo(() => myEvents.data?.pages.flatMap((p) => p.rows) ?? [], [myEvents.data]);
  const timeline = useMemo(() => toTimeline(rows), [rows]);
  const medalList = useMemo(() => medals.data?.pages[0]?.data.slice(0, 10) ?? [], [medals.data]);
  const stats = profile.data?.stats;

  const isEmpty = !myEvents.isPending && !medals.isPending && rows.length === 0 && medalList.length === 0 && (gear.data?.length ?? 0) === 0;

  const refresh = () => {
    profile.refetch();
    medals.refetch();
    myEvents.refetch();
    gear.refetch();
  };

  const renderItem = useCallback(({ item, index }: { item: TimelineItem; index: number }) => {
    if (item.kind === 'year') {
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: index === 0 ? 0 : spacing.md, paddingBottom: spacing.sm }}>
          <View style={{ width: RAIL, alignItems: 'center' }}>
            <View style={{ width: 9, height: 9, borderRadius: 5, borderWidth: 1.5, borderColor: colors.gold }} />
          </View>
          <AppText variant="label" tone="gold" style={{ letterSpacing: 3, marginLeft: spacing.xs }}>
            {item.year}
          </AppText>
        </View>
      );
    }
    return (
      <Animated.View entering={index < 6 ? FadeInDown.delay(Math.min(index, 5) * 50).duration(320) : undefined} style={{ flexDirection: 'row', paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <View style={{ width: RAIL, alignItems: 'center' }}>
          <View style={{ position: 'absolute', top: 0, bottom: -spacing.md, width: 1, backgroundColor: colors.border }} />
          <View style={{ marginTop: 26, width: 7, height: 7, borderRadius: 4, backgroundColor: item.first ? colors.gold : colors.goldDim }} />
        </View>
        <View style={{ flex: 1, marginLeft: spacing.xs }}>
          <LegacyTimelineCard row={item.row} onPress={() => router.push(`/my-events/${item.row.id}`)} />
        </View>
      </Animated.View>
    );
  }, []);

  const header = (
    <View style={{ gap: spacing.xl, paddingBottom: spacing.lg }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <AppText variant="label" tone="gold" style={{ letterSpacing: 3 }}>
              TU HISTORIA
            </AppText>
            <AppText variant="hero" style={{ fontSize: 40, lineHeight: 42 }} accessibilityRole="header">
              LEGADO
            </AppText>
          </View>
          <IconButton icon={Plus} label="Agregar a mi Legado" onPress={() => setAddOpen(true)} color={colors.gold} style={{ marginRight: -10 }} />
        </View>

        {stats ? (
          <View style={{ flexDirection: 'row', gap: spacing.xl, marginTop: spacing.md }}>
            <MetricNumber value={stats.event_count} label={stats.event_count === 1 ? 'Carrera' : 'Carreras'} size={34} tone="gold" />
            <MetricNumber value={stats.medal_count} label={stats.medal_count === 1 ? 'Medalla' : 'Medallas'} size={34} />
            {stats.total_distance_km ? <MetricNumber value={Math.round(stats.total_distance_km)} label="Kilómetros" size={34} /> : null}
          </View>
        ) : profile.isPending ? (
          <Skeleton width={220} height={44} style={{ marginTop: spacing.md }} />
        ) : null}
      </View>

      <MyGearRail />

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
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.black }}>
      <FlatList
        data={isEmpty ? [] : timeline}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        ListHeaderComponent={header}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xxl, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={myEvents.isRefetching && !myEvents.isFetchingNextPage} onRefresh={refresh} tintColor={colors.gold} />}
        onEndReachedThreshold={0.5}
        onEndReached={() => myEvents.hasNextPage && !myEvents.isFetchingNextPage && myEvents.fetchNextPage()}
        initialNumToRender={4}
        windowSize={9}
        ListFooterComponent={myEvents.isFetchingNextPage ? <Skeleton height={200} radius={22} style={{ marginHorizontal: spacing.lg }} /> : null}
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
              title="Tu legado empieza aquí"
              message="Cada carrera suma una página. Cuando participes en un evento Finisher Legacy, tus resultados, fotos y equipo aparecerán aquí."
              actionLabel="Explorar eventos"
              onAction={() => router.navigate('/explore')}
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

      {addOpen ? (
        <Sheet visible onClose={() => setAddOpen(false)}>
          <AppText variant="subtitle" style={{ marginBottom: spacing.xs }}>
            Agregar a tu Legado
          </AppText>
          <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center', paddingVertical: spacing.sm }}>
            <Nfc size={20} color={colors.gold} />
            <AppText variant="caption" tone="muted" style={{ flex: 1 }}>
              ¿Tienes una Legacy Plate o un producto Finisher? Acerca tu teléfono a su etiqueta y se conecta solo.
            </AppText>
          </View>
          <SheetActionRow icon={Award} label="Agregar medalla" onPress={() => go('/medals/create')} />
          <SheetActionRow icon={PenLine} label="Compartir un momento" onPress={() => go('/moments/create')} />
          <SheetActionRow icon={Flag} label="Ver todas mis carreras" onPress={() => go('/my-events')} />
          <SheetActionRow icon={KeyRound} label="Tengo un código impreso" onPress={() => go('/legacy/scan')} />
        </Sheet>
      ) : null}
    </SafeAreaView>
  );

  function go(href: '/medals/create' | '/moments/create' | '/my-events' | '/legacy/scan') {
    setAddOpen(false);
    router.push(href);
  }
}
