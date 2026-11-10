import { router } from 'expo-router';
import { Bell, CalendarClock, ChevronRight, Search, Share2, Users } from 'lucide-react-native';
import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { LegacyIdTag } from '@/components/brand/legacy-id-tag';
import { EventCard } from '@/components/event-card';
import { GettingStarted } from '@/components/guide/getting-started';
import { ActivateCard } from '@/components/home/activate-card';
import { ActiveSupportBanner, OrderStatusChip } from '@/components/home/home-banners';
import { MomentPreviewRow } from '@/components/home/moment-preview-row';
import { PushPrimerCard } from '@/components/home/push-primer-card';
import { TrainingHomeCard } from '@/features/training/components/training-home-card';
import { LegacyTimelineCard } from '@/components/legacy/legacy-timeline-card';
import { BrandRefreshControl } from '@/components/motion/brand-refresh-control';
import { PressableScale } from '@/components/motion/pressable-scale';
import { Reveal } from '@/components/motion/reveal';
import { ScrollHeader, useScrollY } from '@/components/motion/scroll-header';
import { ProductCard } from '@/components/product-card';
import { Skeleton } from '@/components/skeleton';
import { Avatar } from '@/components/ui/avatar';
import { IconButton } from '@/components/ui/icon-button';
import { SectionHeader } from '@/components/ui/section-header';
import { useEvents } from '@/hooks/use-events';
import { useMyEvents } from '@/hooks/use-my-events';
import { useUnreadNotificationsCount } from '@/hooks/use-notifications';
import { useProfile } from '@/hooks/use-profile';
import { useFeed } from '@/hooks/use-social';
import { useProducts } from '@/hooks/use-store-products';
import { useAuthStore } from '@/stores/authStore';
import { colors, radius, shadows, spacing } from '@/theme/tokens';
import type { AthleteHistoryRow } from '@/types/models';
import { formatLongDate } from '@/utils/dates';
import { timeOfDayGreeting } from '@/utils/greeting';
import { useI18n } from '@/i18n';
import { splitMarkers } from '@/i18n/text';

const NAV_HEIGHT = 52;

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
 * Inicio — iOS-style large title that collapses into a frosted nav bar.
 * Order: greeting → Activar (the main action) → anything live (support,
 * order) → first steps → next race → latest chapter → community →
 * Colecciones. Every block taps through to where it really lives.
 */
export default function HomeScreen() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { scrollY, onScroll } = useScrollY();
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

  const firstName = user?.first_name ?? profile.data?.athlete.full_name?.split(' ')[0] ?? t('atleta');
  const fullName = profile.data?.athlete.full_name ?? user?.name;

  const actions = (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: -6 }}>
      <IconButton icon={Search} label={t('Buscar atletas, eventos y productos')} onPress={() => router.push('/search')} />
      <IconButton icon={Bell} label={unread > 0 ? t('Notificaciones, {count} sin leer', { count: unread }) : t('Notificaciones')} badge={unread} onPress={() => router.push('/notifications')} />
      <PressableScale
        onPress={() => router.push('/profile')}
        accessibilityRole="button"
        accessibilityLabel={t('Mi perfil')}
        scaleTo={0.92}
        hitSlop={6}
        style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
        <Avatar uri={profile.data?.profile?.profile_photo_url} name={fullName} size={32} />
      </PressableScale>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + NAV_HEIGHT, paddingBottom: spacing.xxl }}
        refreshControl={<BrandRefreshControl refreshing={refreshing} onRefresh={refresh} progressViewOffset={insets.top + NAV_HEIGHT} />}>
        <Reveal style={{ paddingHorizontal: spacing.lg, gap: 2, marginBottom: spacing.lg }}>
          {/* One sentence for the translator ("Buenos días, {name}"): the name is set big wherever the language puts it. */}
          {splitMarkers(timeOfDayGreeting(), ['name']).map((segment, index) =>
            segment.type === 'slot' ? (
              <AppText key={index} variant="display" accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                {firstName}
              </AppText>
            ) : segment.value.trim() ? (
              <AppText key={index} variant="body" tone="muted">
                {segment.value.trim()}
              </AppText>
            ) : null,
          )}
          {user?.legacy_id ? (
            <View style={{ marginTop: spacing.xs }}>
              <LegacyIdTag legacyId={user.legacy_id} />
            </View>
          ) : null}
        </Reveal>

        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.xl }}>
          <Reveal delay={60}>
            <ActivateCard />
          </Reveal>

          <Reveal delay={90}>
            <TrainingHomeCard />
          </Reveal>

          {/* Direct children: when both render nothing they must not leave an empty gap slot. */}
          <ActiveSupportBanner />
          <OrderStatusChip />

          {profile.data ? <GettingStarted profile={profile.data} /> : null}

          {myNextRace?.event_date ? (
            <Reveal delay={120}>
              <NextRaceCard row={myNextRace} days={daysUntil(myNextRace.event_date)} />
            </Reveal>
          ) : nextPublicEvent ? (
            <Reveal delay={120}>
              <SectionHeader title={t('Tu próxima meta')} actionLabel={t('Eventos')} onAction={() => router.navigate('/explore')} />
              <EventCard edition={nextPublicEvent} onPress={() => router.push(`/events/${nextPublicEvent.event.slug}`)} />
            </Reveal>
          ) : null}

          {myEvents.isPending && !myEvents.data ? (
            <Skeleton height={190} radius={radius.xl} />
          ) : latestRace ? (
            <Reveal delay={160}>
              <SectionHeader title={t('Tu último recuerdo')} actionLabel={t('Recuerdos')} onAction={() => router.navigate('/legacy')} />
              <LegacyTimelineCard row={latestRace} compact onPress={() => router.push(`/my-events/${latestRace.id}`)} />
              <PressableScale
                onPress={() => router.push(`/moments/create?type=race_completed&participantId=${latestRace.id}`)}
                accessibilityRole="button"
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 44, alignSelf: 'flex-start' }}>
                <Share2 size={16} color={colors.accent} />
                <AppText variant="caption" tone="accent" style={{ fontWeight: '600' }}>
                  {t('Compartir con mi comunidad')}
                </AppText>
              </PressableScale>
            </Reveal>
          ) : null}

          <PushPrimerCard />

          <View>
            <SectionHeader title={t('Tu comunidad')} actionLabel={t('Ver todo')} onAction={() => router.navigate('/explore')} />
            {feed.isPending && !feed.data ? (
              <View style={{ gap: spacing.sm }}>
                <Skeleton height={56} />
                <Skeleton height={56} />
              </View>
            ) : recentMoments.length > 0 ? (
              <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.hairline, ...shadows.soft }}>
                {recentMoments.map((moment) => (
                  <MomentPreviewRow key={moment.uuid} moment={moment} />
                ))}
              </View>
            ) : (
              <PressableScale
                onPress={() => router.push('/search')}
                accessibilityRole="button"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  padding: spacing.md,
                  backgroundColor: colors.card,
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderColor: colors.hairline,
                }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.goldWash, alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={20} color={colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyStrong">{t('Encuentra a tu gente')}</AppText>
                  <AppText variant="caption" tone="muted">
                    {t('Sigue a otros atletas para ver sus carreras y logros aquí.')}
                  </AppText>
                </View>
                <ChevronRight size={18} color={colors.subtle} />
              </PressableScale>
            )}
          </View>
        </View>

        {featuredProducts.length > 0 ? (
          <View style={{ marginTop: spacing.xl }}>
            <SectionHeader title={t('Colecciones')} actionLabel={t('Ver tienda')} onAction={() => router.navigate('/store')} style={{ paddingHorizontal: spacing.lg }} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={156 + spacing.sm}
              contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}>
              {featuredProducts.map((product) => (
                <View key={product.uuid} style={{ width: 156 }}>
                  <ProductCard product={product} onPress={() => router.push(`/store/${product.slug}`)} />
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}
      </Animated.ScrollView>

      <ScrollHeader scrollY={scrollY} title={t('Inicio')} threshold={70} right={actions} />
    </View>
  );
}

/** The athlete's own upcoming race, with a countdown — the most motivating number on the screen. */
function NextRaceCard({ row, days }: { row: AthleteHistoryRow; days: number }) {
  const { t } = useI18n();
  const countdown = days <= 0 ? t('Hoy') : days === 1 ? t('Mañana') : String(days);
  return (
    <PressableScale
      onPress={() => router.push(`/my-events/${row.id}`)}
      accessibilityRole="button"
      accessibilityLabel={
        days <= 0
          ? t('Tu próxima carrera: {event}, hoy', { event: row.event ?? t('evento') })
          : days === 1
            ? t('Tu próxima carrera: {event}, mañana', { event: row.event ?? t('evento') })
            : t('Tu próxima carrera: {event}, en {days} días', { event: row.event ?? t('evento'), days })
      }
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.md,
        borderRadius: radius.lg,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.hairline,
        ...shadows.soft,
      }}>
      <View style={{ alignItems: 'center', justifyContent: 'center', width: 68, height: 68, borderRadius: 16, backgroundColor: colors.goldWash }}>
        <AppText variant={days > 1 ? 'title' : 'bodyStrong'} tone="accent">
          {countdown}
        </AppText>
        {days > 1 ? (
          <AppText variant="eyebrow" style={{ fontSize: 9, letterSpacing: 1.5 }}>
            {t('días')}
          </AppText>
        ) : null}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <CalendarClock size={13} color={colors.accent} />
          <AppText variant="eyebrow">{t('Tu próxima carrera')}</AppText>
        </View>
        <AppText variant="subtitle" numberOfLines={2}>
          {row.event ?? t('Evento')}
        </AppText>
        <AppText variant="caption" tone="muted" numberOfLines={1}>
          {[row.race, row.event_date ? formatLongDate(row.event_date) : null].filter(Boolean).join(' · ')}
        </AppText>
      </View>
      <ChevronRight size={18} color={colors.subtle} />
    </PressableScale>
  );
}
