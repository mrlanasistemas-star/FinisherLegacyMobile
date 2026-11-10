import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { CalendarDays, ChevronLeft, MapPin, Share2 } from 'lucide-react-native';
import { useState } from 'react';
import { Share, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedReaction } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { GradientOverlay } from '@/components/brand/gradient-overlay';
import { ErrorState } from '@/components/error-state';
import { PreregistrationSheet } from '@/components/events/preregistration-sheet';
import { Reveal } from '@/components/motion/reveal';
import { ScrollHeader, useParallax, useScrollY } from '@/components/motion/scroll-header';
import { Skeleton } from '@/components/skeleton';
import { IconButton } from '@/components/ui/icon-button';
import { useEvent } from '@/hooks/use-events';
import { colors, radius, shadows, spacing } from '@/theme/tokens';
import { formatLongDate } from '@/utils/dates';
import { useI18n } from '@/i18n';

const HERO_HEIGHT = 320;

export default function EventDetailScreen() {
  const { t } = useI18n();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: event, isPending, isError, error, refetch } = useEvent(slug);
  const insets = useSafeAreaInsets();
  // Short pages must still scroll far enough for the compact bar to become fully opaque.
  const { height: windowHeight } = useWindowDimensions();
  const { scrollY, onScroll } = useScrollY();
  const parallax = useParallax(scrollY, HERO_HEIGHT);
  const [preregistering, setPreregistering] = useState(false);
  // Light status-bar glyphs while the dark hero is under them, dark once the frosted bar takes over.
  const [overHero, setOverHero] = useState(true);
  const threshold = HERO_HEIGHT - 80;

  useAnimatedReaction(
    () => scrollY.value < threshold,
    (now, before) => {
      if (now !== before) scheduleOnRN(setOverHero, now);
    },
  );

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/explore'));
  const shareButton = event ? (
    <IconButton
      icon={Share2}
      label={t('Compartir evento')}
      filled={overHero}
      color={colors.foreground}
      onPress={() => Share.share({ message: `https://finisherlegacy.com/events/${event.slug}` })}
    />
  ) : null;

  if (isPending || isError || !event) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        <View style={{ paddingHorizontal: spacing.sm, minHeight: 52, justifyContent: 'center' }}>
          <IconButton icon={ChevronLeft} label={t('Volver')} onPress={goBack} size={26} />
        </View>
        {isPending ? (
          <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
            <Skeleton height={220} radius={radius.xl} />
            <Skeleton height={28} width="60%" />
            <Skeleton height={16} width="40%" />
          </View>
        ) : (
          <ErrorState error={error} message={t('No pudimos cargar este evento.')} onRetry={refetch} />
        )}
      </View>
    );
  }

  const edition = event.edition;
  const location = edition ? [edition.city, edition.state, edition.country].filter(Boolean).join(', ') : '';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={overHero ? 'light' : 'dark'} animated />
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl, minHeight: windowHeight + HERO_HEIGHT }}>
        <View style={{ height: HERO_HEIGHT + insets.top, overflow: 'hidden', backgroundColor: colors.graphite }}>
          <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, parallax]}>
            {event.cover_url ? (
              <Image source={{ uri: event.cover_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={250} />
            ) : null}
          </Animated.View>
          <GradientOverlay variant="bottom" />
          <View style={{ position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: spacing.lg, gap: spacing.xxs }}>
            {event.sport ? (
              <AppText variant="eyebrow" style={{ color: colors.goldSoft }}>
                {event.sport}
              </AppText>
            ) : null}
            <AppText variant="display" tone="onDark" accessibilityRole="header">
              {event.name}
            </AppText>
            {event.organizer ? (
              <AppText variant="caption" tone="onDarkMuted">
                {t('Organiza {organizer}', { organizer: event.organizer })}
              </AppText>
            ) : null}
          </View>
        </View>

        <Reveal style={{ padding: spacing.lg, gap: spacing.lg }}>
          {edition ? (
            <>
              <View style={groupStyle}>
                <InfoRow icon={CalendarDays} label={edition.name} value={formatLongDate(edition.event_date)} first />
                {location ? <InfoRow icon={MapPin} label={t('Lugar||sede o ciudad de la carrera')} value={location} /> : null}
              </View>

              {edition.races.length > 0 ? (
                <View style={{ gap: spacing.xs }}>
                  <AppText variant="eyebrow" tone="muted" style={{ marginLeft: spacing.xs }}>
                    {t('Distancias')}
                  </AppText>
                  <View style={groupStyle}>
                    {edition.races.map((race, i) => (
                      <View
                        key={race.uuid}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          minHeight: 52,
                          paddingVertical: spacing.sm,
                          paddingHorizontal: spacing.md,
                          borderTopWidth: i === 0 ? 0 : 1,
                          borderTopColor: colors.hairline,
                        }}>
                        <AppText variant="bodyStrong" style={{ flex: 1 }}>
                          {race.name}
                        </AppText>
                        <AppText variant="caption" tone="muted">
                          {race.distance_value} {race.distance_unit}
                          {race.start_time ? ` · ${race.start_time}` : ''}
                        </AppText>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              {edition.preregistration_open && edition.races.length > 0 ? (
                <View style={{ gap: spacing.xs }}>
                  <AppButton label={t('Prerregistrarme')} onPress={() => setPreregistering(true)} />
                  <AppText variant="caption" tone="muted" align="center">
                    {t('Aparta tu lugar en segundos con los datos de tu cuenta.')}
                  </AppText>
                </View>
              ) : (
                <AppText variant="caption" tone="muted">
                  {t('El prerregistro para esta edición no está abierto en este momento.')}
                </AppText>
              )}

              {preregistering ? (
                <PreregistrationSheet visible onClose={() => setPreregistering(false)} editionId={edition.id} eventName={event.name} races={edition.races} />
              ) : null}
            </>
          ) : (
            <AppText variant="body" tone="muted">
              {t('Este evento aún no tiene una edición activa.')}
            </AppText>
          )}

          {event.description ? (
            <View style={{ gap: spacing.xs }}>
              <AppText variant="eyebrow" tone="muted">
                {t('Acerca del evento')}
              </AppText>
              <AppText variant="body">{event.description}</AppText>
            </View>
          ) : null}
        </Reveal>
      </Animated.ScrollView>

      <ScrollHeader
        scrollY={scrollY}
        title={event.name}
        threshold={threshold + 40}
        left={
          <IconButton
            icon={ChevronLeft}
            label={t('Volver')}
            onPress={goBack}
            size={26}
            filled={overHero}
            color={colors.foreground}
          />
        }
        right={shareButton}
      />
    </View>
  );
}

const groupStyle = {
  backgroundColor: colors.card,
  borderRadius: radius.lg,
  borderCurve: 'continuous' as const,
  borderWidth: 1,
  borderColor: colors.hairline,
  overflow: 'hidden' as const,
  ...shadows.soft,
};

function InfoRow({ icon: Icon, label, value, first = false }: { icon: typeof MapPin; label: string; value: string; first?: boolean }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        minHeight: 56,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colors.hairline,
      }}>
      <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: colors.goldWash, alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={16} color={colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="caption" tone="muted">
          {label}
        </AppText>
        <AppText variant="bodyStrong">{value}</AppText>
      </View>
    </View>
  );
}
