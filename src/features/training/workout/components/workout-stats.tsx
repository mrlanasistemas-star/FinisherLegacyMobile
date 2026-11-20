import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { formatClock } from '@/features/training/session-clock';
import { useI18n } from '@/i18n';
import { colors, fontFamily, radius, spacing } from '@/theme/tokens';

import { kmLabel, NO_VALUE, rhythmLabel } from '../format';

/**
 * The numbers of one workout as a grid of tiles. Only what was measured:
 * distance / pace / climb / best efforts appear with GPS, and pace stays "—"
 * without enough data. No calories.
 */
export function WorkoutStats(props: {
  metric: 'pace' | 'speed';
  usesGps: boolean;
  durationS: number;
  movingS: number | null;
  distanceM: number | null;
  paceSecondsPerKm: number | null;
  speedMps: number | null;
  elevationGainM: number | null;
  best5kS: number | null;
  best10kS: number | null;
  manual?: boolean;
}) {
  const { t } = useI18n();
  const tiles: { label: string; value: string }[] = [{ label: t('Tiempo'), value: formatClock(props.durationS * 1000) }];

  if (props.usesGps || props.manual) {
    tiles.push({ label: t('Distancia'), value: props.distanceM ? kmLabel(props.distanceM) : NO_VALUE });
    tiles.push({
      label: props.metric === 'speed' ? t('Velocidad promedio') : t('Ritmo promedio'),
      value: rhythmLabel(props.metric, props.paceSecondsPerKm, props.speedMps) ?? NO_VALUE,
    });
  }
  if (props.usesGps) {
    if (props.movingS && props.movingS > 0 && props.movingS < props.durationS - 30) tiles.push({ label: t('En movimiento'), value: formatClock(props.movingS * 1000) });
    if (props.elevationGainM !== null && props.elevationGainM > 0) tiles.push({ label: t('Desnivel positivo'), value: t('{value} m', { value: props.elevationGainM }) });
    if (props.best5kS) tiles.push({ label: t('Mejor 5 km'), value: formatClock(props.best5kS * 1000) });
    if (props.best10kS) tiles.push({ label: t('Mejor 10 km'), value: formatClock(props.best10kS * 1000) });
  }

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {tiles.map((tile) => (
        <View
          key={tile.label}
          accessible
          accessibilityLabel={`${tile.label}: ${tile.value}`}
          style={{ flexBasis: '47%', flexGrow: 1, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.hairline, padding: spacing.md, gap: 4 }}>
          <AppText variant="caption" tone="subtle" numberOfLines={1}>
            {tile.label}
          </AppText>
          <AppText style={{ fontFamily: fontFamily.heading, fontSize: 22, color: colors.foreground, fontVariant: ['tabular-nums'] }} numberOfLines={1} adjustsFontSizeToFit>
            {tile.value}
          </AppText>
        </View>
      ))}
    </View>
  );
}
