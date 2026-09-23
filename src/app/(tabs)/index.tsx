import { router } from 'expo-router';
import { Bell, ChevronRight, ScanLine, Search, Share2, Users } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { CinematicHero } from '@/components/brand/cinematic-hero';
import { HeroFallback } from '@/components/brand/hero-fallback';
import { LegacyIdTag } from '@/components/brand/legacy-id-tag';
import { MedalHeroTile } from '@/components/brand/medal-hero-tile';
import { EventCard } from '@/components/event-card';
import { GettingStarted } from '@/components/guide/getting-started';
import { Reveal } from '@/components/motion/reveal';
import { MyEventRow } from '@/components/my-event-row';
import { Skeleton } from '@/components/skeleton';
import { MomentCard } from '@/components/social/moment-card';
import { IconButton } from '@/components/ui/icon-button';
import { SectionHeader } from '@/components/ui/section-header';
import { useEvents } from '@/hooks/use-events';
import { useMedals } from '@/hooks/use-medals';
import { useMyEvents } from '@/hooks/use-my-events';
import { useUnreadNotificationsCount } from '@/hooks/use-notifications';
import { useProfile } from '@/hooks/use-profile';
import { useFeed } from '@/hooks/use-social';
import { useAuthStore } from '@/stores/authStore';
import { colors, fontFamily, spacing } from '@/theme/tokens';
import { timeOfDayGreeting } from '@/utils/greeting';

// Confirmed live (~17MB, Range-capable). `CinematicHero` only autoplays it
// on Wi-Fi; every other case falls back to `HeroFallback`.
const HERO_VIDEO_URL = 'https://finisherlegacy.com/media/home/hero/finisher-hero-desktop.mp4';

/**
 * Home is a launchpad, not a catalogue: who you are, what's next, your last
 * race, a peek at your Legacy, and a taste of the community. The store,
 * gear and events each live in their own place.
 */
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const profile = useProfile();
  const medals = useMedals();
  const events = useEvents();
  const myEvents = useMyEvents();
  const feed = useFeed('following');
  const unread = useUnreadNotificationsCount();

  const latestMedals = useMemo(() => medals.data?.pages[0]?.data.slice(0, 5) ?? [], [medals.data]);
  const totalMedals = medals.data?.pages[0]?.meta.total ?? 0;
  const nextEdition = events.data?.pages[0]?.data[0] ?? null;
  const latestParticipation = myEvents.data?.pages[0]?.rows[0] ?? null;
  const recentMoments = useMemo(() => feed.data?.pages[0]?.data.slice(0, 2) ?? [], [feed.data]);

  const refreshing = profile.isRefetching || medals.isRefetching || feed.isRefetching;
  const refresh = () => {
    profile.refetch();
    medals.refetch();
    events.refetch();
    myEvents.refetch();
    feed.refetch();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.black }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.gold} progressViewOffset={insets.top} />}>
        <CinematicHero videoUri={HERO_VIDEO_URL} fallback={<HeroFallback />} height={300} gradient="full">
          <View style={{ flex: 1, paddingTop: insets.top + spacing.xs, paddingHorizontal: spacing.lg, justifyContent: 'space-between', paddingBottom: spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <AppText variant="label" tone="gold" style={{ letterSpacing: 3 }}>
                FINISHER LEGACY
              </AppText>
              <View style={{ flexDirection: 'row', marginRight: -10 }}>
                <IconButton icon={Search} label="Buscar atletas, eventos y productos" onPress={() => router.push('/explore')} />
                <IconButton icon={Bell} label="Notificaciones" badge={unread} onPress={() => router.push('/notifications')} />
              </View>
            </View>

            <Reveal style={{ gap: spacing.xs }}>
              <AppText variant="body" tone="muted">
                {timeOfDayGreeting()}, {user?.first_name ?? 'atleta'}
              </AppText>
              <View>
                <AppText variant="hero" style={{ fontSize: 32, lineHeight: 34 }}>
                  TU HISTORIA
                </AppText>
                <AppText variant="hero" tone="gold" style={{ fontSize: 32, lineHeight: 34 }}>
                  SIGUE CORRIENDO.
                </AppText>
              </View>
              {user?.legacy_id ? <LegacyIdTag legacyId={user.legacy_id} /> : null}
            </Reveal>
          </View>
        </CinematicHero>

        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.xl, marginTop: spacing.lg }}>
          {profile.data ? <GettingStarted profile={profile.data} /> : null}

          {nextEdition ? (
            <View>
              <SectionHeader title="Tu próxima meta" actionLabel="Eventos" onAction={() => router.push('/events')} />
              <EventCard edition={nextEdition} onPress={() => router.push(`/events/${nextEdition.event.slug}`)} />
            </View>
          ) : null}

          {latestParticipation ? (
            <View>
              <SectionHeader title="Tu última carrera" actionLabel="Todas" onAction={() => router.push('/my-events')} />
              <MyEventRow row={latestParticipation} onPress={() => router.push(`/my-events/${latestParticipation.id}`)} />
              <Pressable
                onPress={() => router.push(`/moments/create?type=race_completed&participantId=${latestParticipation.id}`)}
                accessibilityRole="button"
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 44, opacity: pressed ? 0.6 : 1 })}>
                <Share2 size={16} color={colors.gold} />
                <AppText variant="caption" tone="gold">
                  Compartir como Legacy Moment
                </AppText>
              </Pressable>
            </View>
          ) : null}

          <View>
            <SectionHeader
              title="Tu Legacy"
              actionLabel={totalMedals > 0 ? `Ver ${totalMedals}` : undefined}
              onAction={() => router.push('/legacy')}
            />
            {medals.isPending ? (
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Skeleton width={140} height={140} radius={20} />
                <Skeleton width={140} height={140} radius={20} />
              </View>
            ) : latestMedals.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginHorizontal: -spacing.lg }}
                contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}>
                {latestMedals.map((medal) => (
                  <MedalHeroTile key={medal.id} medal={medal} width={140} onPress={() => router.push(`/medals/${medal.id}`)} />
                ))}
              </ScrollView>
            ) : (
              <AppText variant="body" tone="muted">
                Tu Legacy Vault está listo para tu primera medalla.
              </AppText>
            )}
          </View>

          <Pressable
            onPress={() => router.push('/legacy/scan')}
            accessibilityRole="button"
            accessibilityLabel="Escanear un Legacy Code"
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              paddingVertical: spacing.md,
              borderTopWidth: 1,
              borderBottomWidth: 1,
              borderColor: colors.hairline,
              opacity: pressed ? 0.7 : 1,
            })}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.goldWash, alignItems: 'center', justifyContent: 'center' }}>
              <ScanLine size={22} color={colors.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText style={{ fontFamily: fontFamily.semibold, fontSize: 15 }}>¿Tienes un Legacy Code?</AppText>
              <AppText variant="caption" tone="muted">
                Escanéalo y agrégalo a tu historia.
              </AppText>
            </View>
            <ChevronRight size={18} color={colors.subtle} />
          </Pressable>

          <View>
            <SectionHeader title="Comunidad" actionLabel="Ver todo" onAction={() => router.push('/feed')} />
            {feed.isPending ? (
              <Skeleton height={220} radius={16} />
            ) : recentMoments.length === 0 ? (
              <Pressable
                onPress={() => router.push('/explore')}
                accessibilityRole="button"
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, opacity: pressed ? 0.7 : 1 })}>
                <Users size={22} color={colors.gold} />
                <View style={{ flex: 1 }}>
                  <AppText style={{ fontFamily: fontFamily.semibold, fontSize: 15 }}>Encuentra a tu comunidad</AppText>
                  <AppText variant="caption" tone="muted">
                    Sigue a otros atletas para ver sus carreras y logros aquí.
                  </AppText>
                </View>
                <ChevronRight size={18} color={colors.subtle} />
              </Pressable>
            ) : null}
          </View>
        </View>

        {recentMoments.length > 0 ? (
          <View style={{ marginTop: -spacing.sm }}>
            {recentMoments.map((moment) => (
              <MomentCard key={moment.uuid} moment={moment} />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
