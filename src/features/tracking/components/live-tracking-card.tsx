import { router } from 'expo-router';
import { ChevronRight, MapPin, Radio } from 'lucide-react-native';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { PressScale } from '@/components/motion/press-scale';
import { colors, fontFamily, radius, spacing } from '@/theme/tokens';

import { formatDistance } from '../format';
import { useTrackingStore } from '../tracking-storage';

/**
 * Entry point from a participation ("Iniciar seguimiento"), or — when a
 * session is running — a live status row that leads back to the stop
 * button. Also usable without `participantId` as an app-wide banner that
 * only renders while something is being shared.
 */
export function LiveTrackingCard({ participantId }: { participantId?: number }) {
  const record = useTrackingStore((s) => s.record);
  const live = record && (participantId === undefined || record.participantId === participantId) ? record : null;

  if (!live && participantId === undefined) return null;

  const target = live ? live.participantId : (participantId as number);

  return (
    <PressScale
      onPress={() => router.push(`/tracking/${target}`)}
      accessibilityRole="button"
      accessibilityLabel={live ? `Seguimiento en vivo activo, ${formatDistance(live.distanceM)}. Abrir` : 'Iniciar seguimiento en vivo'}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          padding: spacing.md,
          borderRadius: radius.lg,
          backgroundColor: live ? colors.goldWash : colors.graphite,
          borderWidth: 1,
          borderColor: live ? colors.goldDim : colors.hairline,
        }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: live ? colors.gold : colors.goldWash }}>
          {live ? <Radio size={20} color={colors.black} /> : <MapPin size={20} color={colors.gold} />}
        </View>
        <View style={{ flex: 1 }}>
          <AppText style={{ fontFamily: fontFamily.semibold, fontSize: 15 }}>{live ? 'Seguimiento en vivo activo' : 'Iniciar seguimiento'}</AppText>
          <AppText variant="caption" tone="muted">
            {live ? `${formatDistance(live.distanceM)} · toca para ver o detener` : 'Tu gente puede seguirte en vivo desde un enlace.'}
          </AppText>
        </View>
        <ChevronRight size={18} color={colors.muted} />
      </View>
    </PressScale>
  );
}
