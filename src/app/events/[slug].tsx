import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Share2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Share, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { PreregistrationSheet } from '@/components/events/preregistration-sheet';
import { GlassSurface } from '@/components/brand/glass-surface';
import { GradientOverlay } from '@/components/brand/gradient-overlay';
import { Card } from '@/components/card';
import { ErrorState } from '@/components/error-state';
import { Reveal } from '@/components/motion/reveal';
import { Screen } from '@/components/screen';
import { Skeleton } from '@/components/skeleton';
import { useEvent } from '@/hooks/use-events';
import { formatLongDate } from '@/utils/dates';
import { colors, spacing } from '@/theme/tokens';

export default function EventDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: event, isPending, isError, refetch } = useEvent(slug);
  const insets = useSafeAreaInsets();
  const [preregistering, setPreregistering] = useState(false);

  return (
    <Screen scroll edges={['left', 'right']} padded={false}>
      <View style={{ position: 'absolute', top: insets.top + spacing.xs, left: spacing.md, right: spacing.md, zIndex: 1, flexDirection: 'row', justifyContent: 'space-between' }}>
        <GlassSurface style={{ width: 40, height: 40 }}>
          <Pressable
            onPress={() => router.back()}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
            accessibilityRole="button"
            accessibilityLabel="Volver">
            <ChevronLeft color={colors.foreground} size={22} />
          </Pressable>
        </GlassSurface>
        {event ? (
          <GlassSurface style={{ width: 40, height: 40 }}>
            <Pressable
              onPress={() => Share.share({ message: `https://finisherlegacy.com/events/${event.slug}` })}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
              accessibilityRole="button"
              accessibilityLabel="Compartir evento">
              <Share2 color={colors.foreground} size={18} />
            </Pressable>
          </GlassSurface>
        ) : null}
      </View>

      {isPending ? (
        <View style={{ padding: spacing.lg, gap: spacing.md, marginTop: insets.top + spacing.xl }}>
          <Skeleton height={200} radius={16} />
          <Skeleton height={24} width="60%" />
        </View>
      ) : isError || !event ? (
        <View style={{ padding: spacing.lg, marginTop: insets.top + spacing.xl }}>
          <ErrorState message="No pudimos cargar este evento." onRetry={refetch} />
        </View>
      ) : (
        <View>
          <View style={{ height: 300, backgroundColor: colors.graphite }}>
            {event.cover_url ? (
              <Image source={{ uri: event.cover_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} />
            ) : null}
            <GradientOverlay variant="bottom" />
            <View style={{ position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: spacing.lg }}>
              <AppText variant="label" tone="gold" style={{ letterSpacing: 2 }}>
                {event.sport?.toUpperCase()}
              </AppText>
              <AppText variant="display">{event.name}</AppText>
            </View>
          </View>

          <Reveal style={{ padding: spacing.lg, gap: spacing.lg }}>
            {event.organizer ? (
              <AppText variant="caption" tone="muted">
                Organiza {event.organizer}
              </AppText>
            ) : null}

            {event.edition ? (
              <>
                <Card>
                  <AppText variant="bodyStrong">{event.edition.name}</AppText>
                  <AppText variant="caption" tone="gold" style={{ marginTop: spacing.xxs }}>
                    {formatLongDate(event.edition.event_date)}
                  </AppText>
                  {(event.edition.city || event.edition.country) && (
                    <AppText variant="caption" tone="muted" style={{ marginTop: spacing.xxs }}>
                      {[event.edition.city, event.edition.state, event.edition.country].filter(Boolean).join(', ')}
                    </AppText>
                  )}
                </Card>

                {event.edition.races.length > 0 ? (
                  <View>
                    <AppText variant="label" tone="muted" style={{ marginBottom: spacing.sm }}>
                      DISTANCIAS
                    </AppText>
                    <View style={{ gap: spacing.sm }}>
                      {event.edition.races.map((race) => (
                        <Card key={race.uuid}>
                          <AppText variant="bodyStrong">{race.name}</AppText>
                          <AppText variant="caption" tone="muted">
                            {race.distance_value} {race.distance_unit}
                            {race.start_time ? ` · ${race.start_time}` : ''}
                          </AppText>
                        </Card>
                      ))}
                    </View>
                  </View>
                ) : null}

                {event.edition.preregistration_open && event.edition.races.length > 0 ? (
                  <View style={{ gap: spacing.xs }}>
                    <AppButton label="Prerregistrarme" onPress={() => setPreregistering(true)} />
                    <AppText variant="caption" tone="muted" align="center">
                      Aparta tu lugar en segundos con los datos de tu cuenta.
                    </AppText>
                  </View>
                ) : (
                  <AppText variant="caption" tone="muted">
                    El prerregistro para esta edición no está abierto en este momento.
                  </AppText>
                )}

                {preregistering ? (
                  <PreregistrationSheet
                    visible
                    onClose={() => setPreregistering(false)}
                    editionId={event.edition.id}
                    eventName={event.name}
                    races={event.edition.races}
                  />
                ) : null}
              </>
            ) : (
              <AppText variant="body" tone="muted">
                Este evento aún no tiene una edición activa.
              </AppText>
            )}

            {event.description ? (
              <View>
                <AppText variant="label" tone="muted">
                  ACERCA DEL EVENTO
                </AppText>
                <AppText variant="body" style={{ marginTop: spacing.xs }}>
                  {event.description}
                </AppText>
              </View>
            ) : null}
          </Reveal>
        </View>
      )}
    </Screen>
  );
}
