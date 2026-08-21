import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ScanLine } from 'lucide-react-native';
import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { CinematicHero } from '@/components/brand/cinematic-hero';
import { HeroFallback } from '@/components/brand/hero-fallback';
import { LegacyIdTag } from '@/components/brand/legacy-id-tag';
import { MedalHeroTile } from '@/components/brand/medal-hero-tile';
import { MetricNumber } from '@/components/brand/metric-number';
import { SectionTitle } from '@/components/brand/section-title';
import { EventCard } from '@/components/event-card';
import { Reveal } from '@/components/motion/reveal';
import { Skeleton } from '@/components/skeleton';
import { useEvents } from '@/hooks/use-events';
import { useMedals } from '@/hooks/use-medals';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing } from '@/theme/tokens';
import { timeOfDayGreeting } from '@/utils/greeting';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const medals = useMedals();
  const events = useEvents();

  const latestMedals = useMemo(() => medals.data?.pages[0]?.data.slice(0, 6) ?? [], [medals.data]);
  const totalMedals = medals.data?.pages[0]?.meta.total ?? null;
  const nextEdition = events.data?.pages[0]?.data[0] ?? null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.black }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <CinematicHero fallback={<HeroFallback />} height={340} gradient="full">
          <View style={{ flex: 1, paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.lg, justifyContent: 'space-between' }}>
            <AppText variant="label" tone="gold" style={{ letterSpacing: 3 }}>
              FINISHER LEGACY
            </AppText>

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
