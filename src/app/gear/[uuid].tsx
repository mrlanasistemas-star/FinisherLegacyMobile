import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { GearIconBadge } from '@/components/brand/gear-icon-badge';
import { GoldGlow } from '@/components/brand/gold-glow';
import { GEAR_STATUS_LABEL, GEAR_STATUS_VARIANT } from '@/components/gear-card';
import { Card } from '@/components/card';
import { ErrorState } from '@/components/error-state';
import { Reveal } from '@/components/motion/reveal';
import { Screen } from '@/components/screen';
import { Skeleton } from '@/components/skeleton';
import { Badge } from '@/components/ui/badge';
import { useMyGear } from '@/hooks/use-gear';
import { formatDateTime } from '@/utils/dates';
import { colors, spacing } from '@/theme/tokens';

export default function GearDetailScreen() {
  const { uuid } = useLocalSearchParams<{ uuid: string }>();
  // /me/gear isn't paginated and there's no GET /me/gear/{uuid} endpoint —
  // find the item in the already-fetched list rather than inventing a route.
  const { data, isPending, isError, refetch } = useMyGear();
  const gear = data?.find((item) => item.uuid === uuid) ?? null;

  return (
    <Screen scroll edges={['top', 'left', 'right']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Volver">
          <ChevronLeft color={colors.foreground} size={26} />
        </Pressable>
      </View>

      {isPending ? (
        <View style={{ gap: spacing.md }}>
          <Skeleton height={140} radius={22} />
          <Skeleton height={80} radius={16} />
        </View>
      ) : isError || !gear ? (
        <ErrorState message="No pudimos cargar este equipo." onRetry={refetch} />
      ) : (
        <Reveal style={{ gap: spacing.lg, paddingBottom: spacing.xl }}>
          <View style={{ alignItems: 'center', paddingVertical: spacing.lg, position: 'relative' }}>
            <GoldGlow size={200} style={{ position: 'absolute' }} />
            <GearIconBadge productName={gear.product_name} size={100} />
          </View>

          <View style={{ alignItems: 'center', gap: spacing.xs }}>
            <Badge label={GEAR_STATUS_LABEL[gear.status]} variant={GEAR_STATUS_VARIANT[gear.status]} />
            <AppText variant="display" align="center">
              {gear.product_name}
            </AppText>
            {gear.variant_name ? (
              <AppText variant="body" tone="muted">
                {gear.variant_name}
              </AppText>
            ) : null}
          </View>

          <Card>
            <AppText variant="label" tone="muted">
              CÓDIGO
            </AppText>
            <AppText variant="subtitle" style={{ marginTop: spacing.xxs, letterSpacing: 2 }}>
              {gear.asset_code}
            </AppText>
          </Card>

          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <Card style={{ flex: 1 }}>
              <AppText variant="label" tone="muted">
                ADQUIRIDO
              </AppText>
              <AppText variant="bodyStrong" style={{ marginTop: spacing.xxs }}>
                {formatDateTime(gear.acquired_at)}
              </AppText>
            </Card>
            <Card style={{ flex: 1 }}>
              <AppText variant="label" tone="muted">
                ACTIVADO
              </AppText>
              <AppText variant="bodyStrong" style={{ marginTop: spacing.xxs }}>
                {gear.activated_at ? formatDateTime(gear.activated_at) : 'Aún no'}
              </AppText>
            </Card>
          </View>

          {gear.usage_history && gear.usage_history.length > 0 ? (
            <View>
              <AppText variant="label" tone="muted" style={{ marginBottom: spacing.xs }}>
                USADO EN
              </AppText>
              <View style={{ gap: spacing.xs }}>
                {gear.usage_history.map((entry, index) => (
                  <Card key={`${entry.event_participant_id}-${index}`}>
                    <AppText variant="bodyStrong">{entry.event ?? 'Evento'}</AppText>
                    {entry.edition ? (
                      <AppText variant="caption" tone="muted">
                        {entry.edition}
                      </AppText>
                    ) : null}
                    <AppText variant="caption" tone="gold" style={{ marginTop: 2 }}>
                      {formatDateTime(entry.selected_at)}
                    </AppText>
                  </Card>
                ))}
              </View>
            </View>
          ) : (
            <AppText variant="body" tone="muted">
              Todavía no has usado este equipo en ningún evento.
            </AppText>
          )}
        </Reveal>
      )}
    </Screen>
  );
}
