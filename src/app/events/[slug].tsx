import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Card } from '@/components/card';
import { ErrorState } from '@/components/error-state';
import { Screen } from '@/components/screen';
import { Skeleton } from '@/components/skeleton';
import { useEvent } from '@/hooks/use-events';
import { formatLongDate } from '@/utils/dates';
import { colors, radius, spacing } from '@/theme/tokens';

export default function EventDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: event, isPending, isError, refetch } = useEvent(slug);

  return (
    <Screen scroll edges={['top', 'left', 'right']} padded={false}>
      <View style={{ position: 'absolute', top: spacing.sm, left: spacing.lg, zIndex: 1 }}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={{
            backgroundColor: 'rgba(10,10,12,0.6)',
            borderRadius: radius.pill,
            padding: spacing.xs,
          }}>
          <ChevronLeft color={colors.foreground} size={24} />
        </Pressable>
      </View>

      {isPending ? (
        <View style={{ padding: spacing.lg, gap: spacing.md }}>
          <Skeleton height={200} radius={16} />
          <Skeleton height={24} width="60%" />
        </View>
      ) : isError || !event ? (
        <View style={{ padding: spacing.lg }}>
          <ErrorState message="No pudimos cargar este evento." onRetry={refetch} />
        </View>
      ) : (
        <View>
          <View style={{ aspectRatio: 16 / 9, backgroundColor: colors.graphite }}>
            {event.cover_url ? (
              <Image source={{ uri: event.cover_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} />
            ) : null}
          </View>

          <View style={{ padding: spacing.lg, gap: spacing.lg }}>
            <View>
              <AppText variant="caption" tone="gold">
                {event.sport}
              </AppText>
              <AppText variant="title">{event.name}</AppText>
              {event.organizer ? (
                <AppText variant="caption" tone="muted" style={{ marginTop: spacing.xxs }}>
                  Organiza {event.organizer}
                </AppText>
              ) : null}
            </View>

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
                        <Card key={race.name}>
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

                <Card>
                  <AppText variant="bodyStrong">Prerregistro</AppText>
                  <AppText variant="caption" tone="muted" style={{ marginTop: spacing.xxs }}>
                    El prerregistro estará disponible próximamente desde la app. Mientras tanto, visita
                    finisherlegacy.com para prerregistrarte.
                  </AppText>
                </Card>
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
          </View>
        </View>
      )}
    </Screen>
  );
}
