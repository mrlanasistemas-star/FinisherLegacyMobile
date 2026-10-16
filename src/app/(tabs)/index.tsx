import { router } from 'expo-router';
import { Bell, CalendarClock, ChevronRight, Search, Share2, Users } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { CinematicHero } from '@/components/brand/cinematic-hero';
import { HeroFallback } from '@/components/brand/hero-fallback';
import { LegacyIdTag } from '@/components/brand/legacy-id-tag';
import { EventCard } from '@/components/event-card';
import { GettingStarted } from '@/components/guide/getting-started';
import { ActiveSupportBanner, OrderStatusChip } from '@/components/home/home-banners';
import { MomentPreviewRow } from '@/components/home/moment-preview-row';
import { PushPrimerCard } from '@/components/home/push-primer-card';
import { LegacyTimelineCard } from '@/components/legacy/legacy-timeline-card';
import { Reveal } from '@/components/motion/reveal';
import { ProductCard } from '@/components/product-card';
import { Skeleton } from '@/components/skeleton';
import { IconButton } from '@/components/ui/icon-button';
import { SectionHeader } from '@/components/ui/section-header';
import { useEvents } from '@/hooks/use-events';
import { useMyEvents } from '@/hooks/use-my-events';
import { useUnreadNotificationsCount } from '@/hooks/use-notifications';
import { useProfile } from '@/hooks/use-profile';
import { useFeed } from '@/hooks/use-social';
import { useProducts } from '@/hooks/use-store-products';
import { useAuthStore } from '@/stores/authStore';
import { colors, fontFamily, radius, spacing } from '@/theme/tokens';
import type { AthleteHistoryRow } from '@/types/models';
import { formatLongDate } from '@/utils/dates';
import { timeOfDayGreeting } from '@/utils/greeting';

// Confirmed live (~17MB, Range-capable). `CinematicHero` only autoplays it
// on Wi-Fi; every other case falls back to `HeroFallback`.
const HERO_VIDEO_URL = 'https://finisherlegacy.com/media/home/hero/finisher-hero-desktop.mp4';

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysUntil(dateIso: string): number {
  const [y, m, d] = dateIso.slice(0, 10).split('-').map(Number);
  const target = new Date(y, (m ?? 1) - 1, d ?? 1).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((target - today) / 86_400_000);
}

/**
 * Inicio — a personal front page, not a dashboard: who you are, what's
 * next, your latest chapter, anything live (support, an order on its way),
 * a glance at your people and the newest gear. Everything taps through to
 * where it really lives.
 */
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const profile = useProfile();
  const myEvents = useMyEvents();
  const events = useEvents();
  const feed = useFeed('following');
  const products = useProducts({ sort: 'newest' });
  const unread = useUnreadNotificationsCount();

  const today = todayIso();
  const rows = useMemo(() => myEvents.data?.pages[0]?.rows ?? [], [myEvents.data]);
  const myNextRace = useMemo<AthleteHistoryRow | null>(
    () => rows.filter((r) => r.event_date && r.event_date >= today).sort((a, b) => (a.event_date ?? '').localeCompare(b.event_date ?? ''))[0] ?? null,
    [rows, today],
  );
  const latestRace = useMemo(() => rows.find((r) => !r.event_date || r.event_date < today) ?? null, [rows, today]);
  const nextPublicEvent = useMemo(() => events.data?.pages[0]?.data.find((e) => e.event_date >= today) ?? null, [events.data, today]);
  const recentMoments = useMemo(() => feed.data?.pages[0]?.data.slice(0, 3) ?? [], [feed.data]);
  const featuredProducts = useMemo(() => products.data?.pages[0]?.rows.slice(0, 6) ?? [], [products.data]);

  const refreshing = profile.isRefetching || myEvents.isRefetching || feed.isRefetching;
  const refresh = () => {
    profile.refetch();
    myEvents.refetch();
    events.refetch();
    feed.refetch();
    products.refetch();
  };

  const firstName = user?.first_name ?? profile.data?.athlete.full_name?.split(' ')[0] ?? 'atleta';

  return (
    <View style={{ flex: 1, backgroundColor: colors.black }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.gold} progressViewOffset={insets.top} />}>
        <CinematicHero videoUri={HERO_VIDEO_URL} fallback={<HeroFallback />} height={250 + insets.top} gradient="full">
          <View style={{ flex: 1, paddingTop: insets.top + spacing.xs, paddingHorizontal: spacing.lg, justifyContent: 'space-between', paddingBottom: spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <AppText variant="label" tone="gold" style={{ letterSpacing: 3 }}>
                FINISHER LEGACY
              </AppText>
              <View style={{ flexDirection: 'row', marginRight: -10 }}>
                <IconButton icon={Search} label="Buscar atletas, eventos y productos" onPress={() => router.push('/search')} />
                <IconButton icon={Bell} label={unread > 0 ? `Notificaciones, ${unread} sin leer` : 'Notificaciones'} badge={unread} onPress={() => router.push('/notifications')} />
              </View>
            </View>

            <Reveal style={{ gap: spacing.xs }}>
              <AppText variant="body" tone="muted">
                {timeOfDayGreeting()},
              </AppText>
              <AppText variant="hero" style={{ fontSize: 36, lineHeight: 38 }} numberOfLines={1} adjustsFontSizeToFit>
                {firstName}
              </AppText>
              {user?.legacy_id ? <LegacyIdTag legacyId={user.legacy_id} /> : null}
            </Reveal>
          </View>
        </CinematicHero>

        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.xl, marginTop: spacing.lg }}>
          <View style={{ gap: spacing.sm }}>
            <ActiveSupportBanner />
            <OrderStatusChip />
          </View>

          {profile.data ? <GettingStarted profile={profile.data} /> : null}

          {myNextRace?.event_date ? (
            <NextRaceCard row={myNextRace} days={daysUntil(myNextRace.event_date)} />
          ) : nextPublicEvent ? (
            <View>
              <SectionHeader title="Tu próxima meta" actionLabel="Eventos" onAction={() => router.navigate('/explore')} />
              <EventCard edition={nextPublicEvent} onPress={() => router.push(`/events/${nextPublicEvent.event.slug}`)} />
            </View>
          ) : null}

          {myEvents.isPending && !myEvents.data ? (
            <Skeleton height={190} radius={22} />
          ) : latestRace ? (
            <View>
              <SectionHeader title="Tu último capítulo" actionLabel="Tu legado" onAction={() => router.navigate('/legacy')} />
              <LegacyTimelineCard row={latestRace} compact onPress={() => router.push(`/my-events/${latestRace.id}`)} />
              <Pressable
                onPress={() => router.push(`/moments/create?type=race_completed&participantId=${latestRace.id}`)}
                accessibilityRole="button"
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 44, opacity: pressed ? 0.6 : 1 })}>
                <Share2 size={16} color={colors.gold} />
                <AppText variant="caption" tone="gold">
                  Compartir como momento
                </AppText>
              </Pressable>
            </View>
          ) : null}

          <PushPrimerCard />

          <View>
            <SectionHeader title="Tu comunidad" actionLabel="Ver todo" onAction={() => router.navigate('/explore')} />
            {feed.isPending && !feed.data ? (
              <View style={{ gap: spacing.sm }}>
                <Skeleton height={56} />
                <Skeleton height={56} />
              </View>
            ) : recentMoments.length > 0 ? (
              <View>
                {recentMoments.map((moment) => (
                  <MomentPreviewRow key={moment.uuid} moment={moment} />
                ))}
              </View>
            ) : (
              <Pressable
                onPress={() => router.push('/search')}
                accessibilityRole="button"
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, opacity: pressed ? 0.7 : 1 })}>
                <Users size={22} color={colors.gold} />
                <View style={{ flex: 1 }}>
                  <AppText style={{ fontFamily: fontFamily.semibold, fontSize: 15 }}>Encuentra a tu gente</AppText>
                  <AppText variant="caption" tone="muted">
                    Sigue a otros atletas para ver sus carreras y logros aquí.
                  </AppText>
                </View>
                <ChevronRight size={18} color={colors.subtle} />
              </Pressable>
            )}
          </View>
        </View>

        {featuredProducts.length > 0 ? (
          <View style={{ marginTop: spacing.xl }}>
            <SectionHeader title="Lo nuevo en la tienda" actionLabel="Tienda" onAction={() => router.navigate('/store')} style={{ paddingHorizontal: spacing.lg }} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}>
              {featuredProducts.map((product) => (
                <View key={product.uuid} style={{ width: 156 }}>
                  <ProductCard product={product} onPress={() => router.push(`/store/${product.slug}`)} />
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

/** The athlete's own upcoming race, with a countdown — the most motivating number on the screen. */
function NextRaceCard({ row, days }: { row: AthleteHistoryRow; days: number }) {
  const countdown = days <= 0 ? 'HOY' : days === 1 ? 'MAÑANA' : String(days);
  return (
    <Pressable
      onPress={() => router.push(`/my-events/${row.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`Tu próxima carrera: ${row.event ?? 'evento'}, ${days <= 0 ? 'hoy' : days === 1 ? 'mañana' : `en ${days} días`}`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.md,
        borderRadius: radius.xl,
        backgroundColor: colors.graphite,
        borderWidth: 1,
        borderColor: colors.border,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}>
      <View style={{ alignItems: 'center', minWidth: 72 }}>
        <Text style={{ fontFamily: fontFamily.bold, fontSize: days > 1 ? 40 : 22, lineHeight: days > 1 ? 44 : 28, color: colors.goldSoft }}>{countdown}</Text>
        {days > 1 ? (
          <AppText variant="label" tone="muted" style={{ letterSpacing: 1.5 }}>
            DÍAS
          </AppText>
        ) : null}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <CalendarClock size={13} color={colors.gold} />
          <AppText variant="label" tone="gold" style={{ letterSpacing: 1.5 }}>
            TU PRÓXIMA CARRERA
          </AppText>
        </View>
        <AppText variant="subtitle" numberOfLines={2}>
          {row.event ?? 'Evento'}
        </AppText>
        <AppText variant="caption" tone="muted" numberOfLines={1}>
          {[row.race, row.event_date ? formatLongDate(row.event_date) : null].filter(Boolean).join(' · ')}
        </AppText>
      </View>
      <ChevronRight size={18} color={colors.subtle} />
    </Pressable>
  );
}
