import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Award, BookHeart, ChevronRight, Flag, PenLine, Plus, ScanLine, Shirt, Sparkles } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { GearIconBadge } from '@/components/brand/gear-icon-badge';
import { MedalHeroTile } from '@/components/brand/medal-hero-tile';
import { EmptyState } from '@/components/empty-state';
import { MyEventRow } from '@/components/my-event-row';
import { Skeleton } from '@/components/skeleton';
import { IconButton } from '@/components/ui/icon-button';
import { SectionHeader } from '@/components/ui/section-header';
import { Sheet } from '@/components/ui/sheet';
import { SheetActionRow } from '@/components/ui/sheet-action-row';
import { useMyGear } from '@/hooks/use-gear';
import { useMedals } from '@/hooks/use-medals';
import { useMyEvents } from '@/hooks/use-my-events';
import { useProfile } from '@/hooks/use-profile';
import { useAthleteMoments } from '@/hooks/use-social';
import { colors, fontFamily, spacing } from '@/theme/tokens';

/**
 * The Legacy tab is a collection, not a menu: medals, races, memories,
 * gear and Legacy Plates, each a row you can swipe through, each with a
 * way in. Adding things is one "+" away.
 */
export default function LegacyScreen() {
  const [addOpen, setAddOpen] = useState(false);
  const profile = useProfile();
  const medals = useMedals();
  const myEvents = useMyEvents();
  const gear = useMyGear();
  const username = profile.data?.profile?.username ?? '';
  const moments = useAthleteMoments(username);

  const medalList = useMemo(() => medals.data?.pages.flatMap((p) => p.data).slice(0, 10) ?? [], [medals.data]);
  const races = useMemo(() => myEvents.data?.pages[0]?.rows.slice(0, 3) ?? [], [myEvents.data]);
  const memories = useMemo(() => moments.data?.pages[0]?.data.slice(0, 8) ?? [], [moments.data]);
  const gearList = gear.data?.slice(0, 8) ?? [];
  const stats = profile.data?.stats;

  const isEmpty =
    !medals.isPending && !myEvents.isPending && medalList.length === 0 && races.length === 0 && gearList.length === 0 && memories.length === 0;

  const refresh = () => {
    profile.refetch();
    medals.refetch();
    myEvents.refetch();
    gear.refetch();
    if (username) moments.refetch();
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.black }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        refreshControl={<RefreshControl refreshing={medals.isRefetching || myEvents.isRefetching} onRefresh={refresh} tintColor={colors.gold} />}>
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, flexDirection: 'row', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <AppText variant="hero" style={{ fontSize: 38, lineHeight: 40 }} accessibilityRole="header">
              LEGACY
            </AppText>
            {stats ? (
              <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
                {stats.medal_count} {stats.medal_count === 1 ? 'medalla' : 'medallas'} · {stats.event_count}{' '}
                {stats.event_count === 1 ? 'carrera' : 'carreras'}
                {stats.total_distance_km ? ` · ${stats.total_distance_km} km` : ''}
              </AppText>
            ) : (
              <Skeleton width={180} height={14} style={{ marginTop: 6 }} />
            )}
          </View>
          <IconButton icon={Plus} label="Agregar a mi Legacy" onPress={() => setAddOpen(true)} color={colors.gold} />
        </View>

        {isEmpty ? (
          <EmptyState
            icon={Sparkles}
            title="Tu Legacy empieza aquí"
            message="Cada carrera merece un lugar en tu historia. Escanea tu Legacy Code o agrega una medalla."
            actionLabel="Escanear Legacy Code"
            onAction={() => router.push('/legacy/scan')}
            secondaryLabel="Agregar medalla manualmente"
            onSecondary={() => router.push('/medals/create')}
          />
        ) : (
          <View style={{ gap: spacing.xl, marginTop: spacing.lg }}>
            <CollectionSection
              title="Medallas"
              count={stats?.medal_count}
              onSeeAll={() => router.push('/medals')}
              loading={medals.isPending}
              emptyText="Todavía no hay medallas. Escanea tu primera."
              isEmpty={medalList.length === 0}>
              {medalList.map((medal) => (
                <MedalHeroTile key={medal.id} medal={medal} width={132} onPress={() => router.push(`/medals/${medal.id}`)} />
              ))}
            </CollectionSection>

            <View style={{ paddingHorizontal: spacing.lg }}>
              <SectionHeader title="Carreras" actionLabel={races.length > 0 ? 'Ver todas' : undefined} onAction={() => router.push('/my-events')} />
              {myEvents.isPending ? (
                <Skeleton height={72} radius={14} />
              ) : races.length === 0 ? (
                <AppText variant="body" tone="muted">
                  Cuando participes en un evento Finisher Legacy, tus resultados aparecerán aquí.
                </AppText>
              ) : (
                <View style={{ gap: spacing.sm }}>
                  {races.map((row) => (
                    <MyEventRow key={row.id} row={row} onPress={() => router.push(`/my-events/${row.id}`)} />
                  ))}
                </View>
              )}
            </View>

            <CollectionSection
              title="Recuerdos"
              onSeeAll={username ? () => router.push(`/athlete/${username}`) : undefined}
              loading={!!username && moments.isPending}
              emptyText="Comparte un entrenamiento, una carrera o una foto especial."
              emptyAction={{ label: 'Crear un momento', onPress: () => router.push('/moments/create') }}
              isEmpty={memories.length === 0}>
              {memories.map((moment) => (
                <Pressable
                  key={moment.uuid}
                  onPress={() => router.push(`/moments/${moment.uuid}`)}
                  accessibilityRole="button"
                  accessibilityLabel={moment.caption ?? 'Ver momento'}
                  style={{ width: 132, height: 132, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.graphite, justifyContent: 'flex-end' }}>
                  {moment.media[0]?.type === 'image' ? (
                    <MomentThumb url={moment.media[0].url} />
                  ) : (
                    <View style={{ ...StyleFill, alignItems: 'center', justifyContent: 'center' }}>
                      <BookHeart size={28} color={colors.goldDim} />
                    </View>
                  )}
                  <View style={{ padding: 8, backgroundColor: 'rgba(10,10,12,0.55)' }}>
                    <AppText variant="caption" numberOfLines={1} style={{ fontSize: 12 }}>
                      {moment.activity?.event ?? moment.metrics?.title ?? moment.caption ?? 'Momento'}
                    </AppText>
                  </View>
                </Pressable>
              ))}
            </CollectionSection>

            <CollectionSection
              title="Mi equipo"
              count={stats?.gear_count}
              onSeeAll={() => router.push('/gear')}
              loading={gear.isPending}
              emptyText="Reclama el gear Finisher Legacy que compraste o recibiste."
              emptyAction={{ label: 'Reclamar gear', onPress: () => router.push('/gear/claim') }}
              isEmpty={gearList.length === 0}>
              {gearList.map((item) => (
                <Pressable
                  key={item.uuid}
                  onPress={() => router.push(`/gear/${item.uuid}`)}
                  accessibilityRole="button"
                  accessibilityLabel={item.product_name}
                  style={{ width: 112, gap: spacing.xs, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: 16, backgroundColor: colors.graphite }}>
                  <GearIconBadge productName={item.product_name} size={48} />
                  <AppText variant="caption" numberOfLines={2} align="center" style={{ paddingHorizontal: 6 }}>
                    {item.product_name}
                  </AppText>
                </Pressable>
              ))}
            </CollectionSection>

            <Pressable
              onPress={() => router.push('/my-events')}
              accessibilityRole="button"
              style={({ pressed }) => ({
                marginHorizontal: spacing.lg,
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                paddingVertical: spacing.md,
                borderTopWidth: 1,
                borderBottomWidth: 1,
                borderColor: colors.hairline,
                opacity: pressed ? 0.7 : 1,
              })}>
              <Award size={22} color={colors.gold} />
              <View style={{ flex: 1 }}>
                <AppText style={{ fontFamily: fontFamily.semibold, fontSize: 15 }}>Legacy Plates</AppText>
                <AppText variant="caption" tone="muted">
                  {stats?.legacy_plate_count
                    ? `${stats.legacy_plate_count} ${stats.legacy_plate_count === 1 ? 'placa grabada' : 'placas grabadas'} con tu resultado.`
                    : 'Tu resultado grabado en metal, con su propio Legacy Code.'}
                </AppText>
              </View>
              <ChevronRight size={18} color={colors.subtle} />
            </Pressable>
          </View>
        )}
      </ScrollView>

      {addOpen ? (
        <Sheet visible onClose={() => setAddOpen(false)}>
          <AppText variant="subtitle" style={{ marginBottom: spacing.xs }}>
            Agregar a tu Legacy
          </AppText>
          <SheetActionRow icon={ScanLine} label="Escanear Legacy Code" onPress={() => go('/legacy/scan')} />
          <SheetActionRow icon={Award} label="Agregar medalla manualmente" onPress={() => go('/medals/create')} />
          <SheetActionRow icon={PenLine} label="Compartir un momento" onPress={() => go('/moments/create')} />
          <SheetActionRow icon={Shirt} label="Reclamar gear" onPress={() => go('/gear/claim')} />
          <SheetActionRow icon={Flag} label="Ver mis carreras" onPress={() => go('/my-events')} />
        </Sheet>
      ) : null}
    </SafeAreaView>
  );

  function go(href: '/legacy/scan' | '/medals/create' | '/moments/create' | '/gear/claim' | '/my-events') {
    setAddOpen(false);
    router.push(href);
  }
}

const StyleFill = { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 };

function MomentThumb({ url }: { url: string }) {
  return <Image source={{ uri: url }} style={StyleFill} contentFit="cover" cachePolicy="memory-disk" />;
}

function CollectionSection({
  title,
  count,
  onSeeAll,
  loading,
  isEmpty,
  emptyText,
  emptyAction,
  children,
}: {
  title: string;
  count?: number;
  onSeeAll?: () => void;
  loading?: boolean;
  isEmpty: boolean;
  emptyText: string;
  emptyAction?: { label: string; onPress: () => void };
  children: React.ReactNode;
}) {
  return (
    <View>
      <SectionHeader
        title={title}
        actionLabel={!isEmpty && onSeeAll ? (count ? `Ver ${count}` : 'Ver todo') : undefined}
        onAction={onSeeAll}
        style={{ paddingHorizontal: spacing.lg }}
      />
      {loading ? (
        <View style={{ flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg }}>
          <Skeleton width={132} height={132} radius={16} />
          <Skeleton width={132} height={132} radius={16} />
        </View>
      ) : isEmpty ? (
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.xxs }}>
          <AppText variant="body" tone="muted">
            {emptyText}
          </AppText>
          {emptyAction ? (
            <Pressable onPress={emptyAction.onPress} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
              <AppText variant="bodyStrong" tone="gold">
                {emptyAction.label}
              </AppText>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}>
          {children}
        </ScrollView>
      )}
    </View>
  );
}
