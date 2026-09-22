import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Bell, ChevronRight, ScanLine } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { CinematicHero } from '@/components/brand/cinematic-hero';
import { GearIconBadge } from '@/components/brand/gear-icon-badge';
import { HeroFallback } from '@/components/brand/hero-fallback';
import { LegacyIdTag } from '@/components/brand/legacy-id-tag';
import { MascotTip } from '@/components/brand/mascot-tip';
import { MedalHeroTile } from '@/components/brand/medal-hero-tile';
import { MetricNumber } from '@/components/brand/metric-number';
import { SectionTitle } from '@/components/brand/section-title';
import { EventCard } from '@/components/event-card';
import { MyEventRow } from '@/components/my-event-row';
import { ProductCard } from '@/components/product-card';
import { Reveal } from '@/components/motion/reveal';
import { Skeleton } from '@/components/skeleton';
import { useEvents } from '@/hooks/use-events';
import { useMyGear } from '@/hooks/use-gear';
import { useMedals } from '@/hooks/use-medals';
import { useMyEvents } from '@/hooks/use-my-events';
import { useNotifications } from '@/hooks/use-notifications';
import { useProducts } from '@/hooks/use-store-products';
import { useAuthStore } from '@/stores/authStore';
import { colors, radius, spacing } from '@/theme/tokens';
import { timeOfDayGreeting } from '@/utils/greeting';

// Confirmed live (200 OK, ~17MB, Range-request capable) — same URL Welcome
// already uses. No mobile-optimized cut exists yet (no ffmpeg in this
// environment), so `CinematicHero`/`useCanAutoplayVideo` only autoplay it
// on Wi-Fi; every other case falls back to `HeroFallback` gracefully.
const HERO_VIDEO_URL = 'https://finisherlegacy.com/media/home/hero/finisher-hero-desktop.mp4';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const medals = useMedals();
  const events = useEvents();
  const myEvents = useMyEvents();
  const gear = useMyGear();
  const products = useProducts();
  const notifications = useNotifications();

  const latestMedals = useMemo(() => medals.data?.pages[0]?.data.slice(0, 6) ?? [], [medals.data]);
  const totalMedals = medals.data?.pages[0]?.meta.total ?? null;
  const nextEdition = events.data?.pages[0]?.data[0] ?? null;
  const latestParticipation = myEvents.data?.pages[0]?.rows[0] ?? null;
  const gearPreview = useMemo(() => gear.data?.slice(0, 4) ?? [], [gear.data]);
  const featuredProducts = useMemo(() => products.data?.pages[0]?.rows.slice(0, 4) ?? [], [products.data]);
  const hasUnreadNotifications = useMemo(
    () => notifications.data?.pages[0]?.rows.some((row) => row.read_at === null) ?? false,
    [notifications.data],
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.black }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <CinematicHero videoUri={HERO_VIDEO_URL} fallback={<HeroFallback />} height={340} gradient="full">
          <View style={{ flex: 1, paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.lg, justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <AppText variant="label" tone="gold" style={{ letterSpacing: 3 }}>
                FINISHER LEGACY
              </AppText>
              <Pressable
                onPress={() => router.push('/notifications')}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Notificaciones"
                style={{ padding: spacing.xxs }}>
                <Bell color={colors.foreground} size={22} />
                {hasUnreadNotifications ? (
                  <View
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: colors.gold,
                    }}
                  />
                ) : null}
              </Pressable>
            </View>

            <Reveal style={{ gap: spacing.sm }}>
              <View>
                <AppText variant="hero" style={{ fontSize: 34, lineHeight: 36 }}>
                  TU HISTORIA
                </AppText>
                <AppText variant="hero" tone="gold" style={{ fontSize: 34, lineHeight: 36 }}>
                  SIGUE CORRIENDO.
                </AppText>
              </View>

              <AppText variant="body" tone="muted">
                {timeOfDayGreeting()}, {user?.first_name ?? 'atleta'}
              </AppText>

              {user?.legacy_id ? <LegacyIdTag legacyId={user.legacy_id} /> : null}
            </Reveal>
          </View>
        </CinematicHero>

        <MascotTip
          id="home-intro"
          message="Toca el botón dorado para escanear tu Legacy Code, o desliza para ver tus medallas y tu próxima meta."
          style={{ marginHorizontal: spacing.lg, marginTop: spacing.lg }}
        />

        <View style={{ alignItems: 'center', marginTop: spacing.xl }}>
          {medals.isPending ? (
            <Skeleton width={100} height={64} />
          ) : (
            <MetricNumber value={totalMedals ?? 0} size={64} tone="gold" />
          )}
          <AppText variant="caption" tone="muted" align="center" style={{ marginTop: spacing.xxs, letterSpacing: 1.5 }}>
            {(totalMedals ?? 0) === 1 ? 'MEDALLA QUE CUENTA TU HISTORIA' : 'MEDALLAS QUE CUENTAN TU HISTORIA'}
          </AppText>
        </View>

        <View style={{ marginTop: spacing.xxl }}>
          <SectionTitle title="Últimas medallas" style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.md }} />

          {medals.isPending ? (
            <View style={{ flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg }}>
              <Skeleton width={168} height={168} radius={22} />
              <Skeleton width={168} height={168} radius={22} />
            </View>
          ) : latestMedals.length === 0 ? (
            <View style={{ paddingHorizontal: spacing.lg }}>
              <AppText variant="body" tone="muted">
                Tu Legacy Vault está listo para tu primera medalla.
              </AppText>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={168 + spacing.sm}
              decelerationRate="fast"
              contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}>
              {latestMedals.map((medal) => (
                <MedalHeroTile key={medal.id} medal={medal} onPress={() => router.push(`/medals/${medal.id}`)} />
              ))}
            </ScrollView>
          )}
        </View>

        <View style={{ marginTop: spacing.xxl, paddingHorizontal: spacing.lg }}>
          <Reveal>
            <View
              style={{
                borderRadius: 24,
                borderWidth: 1,
                borderColor: colors.goldDim,
                backgroundColor: colors.graphite,
                padding: spacing.lg,
                alignItems: 'center',
                gap: spacing.sm,
              }}>
              <AppText variant="label" tone="gold" style={{ letterSpacing: 2 }}>
                ENCUENTRA TU LEGACY
              </AppText>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 20,
                  backgroundColor: colors.gold,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <ScanLine color={colors.black} size={30} />
              </View>
              <AppButton label="Escanear Legacy Code" onPress={() => router.push('/legacy/scan')} fullWidth={false} style={{ paddingHorizontal: spacing.xl, marginTop: spacing.xs }} />
            </View>
          </Reveal>
        </View>

        {nextEdition ? (
          <View style={{ marginTop: spacing.xxl, paddingHorizontal: spacing.lg }}>
            <SectionTitle title="Tu próxima meta" style={{ marginBottom: spacing.md }} />
            <EventCard edition={nextEdition} onPress={() => router.push(`/events/${nextEdition.event.slug}`)} />
          </View>
        ) : null}

        {latestParticipation ? (
          <View style={{ marginTop: spacing.xxl, paddingHorizontal: spacing.lg }}>
            <SectionTitle title="Tu última participación" style={{ marginBottom: spacing.md }} />
            <MyEventRow row={latestParticipation} onPress={() => router.push(`/my-events/${latestParticipation.id}`)} />
          </View>
        ) : null}

        {gearPreview.length > 0 ? (
          <View style={{ marginTop: spacing.xxl }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: spacing.lg,
                marginBottom: spacing.md,
              }}>
              <SectionTitle title="Mi equipo" />
              <Pressable onPress={() => router.push('/gear')} style={{ flexDirection: 'row', alignItems: 'center' }} accessibilityRole="button">
                <AppText variant="caption" tone="gold">
                  Ver todo
                </AppText>
                <ChevronRight color={colors.gold} size={16} />
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}>
              {gearPreview.map((item) => (
                <Pressable
                  key={item.uuid}
                  onPress={() => router.push(`/gear/${item.uuid}`)}
                  style={{
                    width: 108,
                    alignItems: 'center',
                    gap: spacing.xs,
                    borderRadius: radius.lg,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.graphite,
                    padding: spacing.sm,
                  }}>
                  <GearIconBadge productName={item.product_name} size={48} />
                  <AppText variant="caption" numberOfLines={2} align="center">
                    {item.product_name}
                  </AppText>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {featuredProducts.length > 0 ? (
          <View style={{ marginTop: spacing.xxl }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: spacing.lg,
                marginBottom: spacing.md,
              }}>
              <SectionTitle title="Finisher Legacy Store" />
              <Pressable onPress={() => router.push('/store')} style={{ flexDirection: 'row', alignItems: 'center' }} accessibilityRole="button">
                <AppText variant="caption" tone="gold">
                  Ver tienda
                </AppText>
                <ChevronRight color={colors.gold} size={16} />
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}>
              {featuredProducts.map((product) => (
                <View key={product.uuid} style={{ width: 150 }}>
                  <ProductCard product={product} onPress={() => router.push(`/store/${product.slug}`)} />
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={{ alignItems: 'center', marginTop: spacing.xxl, marginBottom: spacing.xxl, opacity: 0.85 }}>
          <Image
            source={require('@/assets/images/brand/logo-mark-gold.png')}
            style={{ width: 40, height: 20 }}
            contentFit="contain"
          />
        </View>
      </ScrollView>
    </View>
  );
}
