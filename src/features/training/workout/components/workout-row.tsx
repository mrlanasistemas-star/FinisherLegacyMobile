import { Bike, CloudUpload, Dumbbell, Footprints, Mountain, WavesLadder, type LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { PressableScale } from '@/components/motion/pressable-scale';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/i18n';
import type { Workout } from '@/schemas/workouts';
import { colors, radius, spacing } from '@/theme/tokens';

import { durationLabel, kmLabel, rhythmLabel, workoutDateLabel } from '../format';

/** Line icon per activity (lucide has no swimmer — the pool ladder reads as swimming). */
const SPORT_ICONS: Record<string, LucideIcon> = { ciclismo: Bike, natacion: WavesLadder, trail: Mountain, running: Footprints, triatlon: Footprints };

export function SportIcon({ slug, size = 20, color = colors.foreground }: { slug: string | null | undefined; size?: number; color?: string }) {
  const Icon = (slug && SPORT_ICONS[slug]) || Dumbbell;
  return <Icon size={size} color={color} />;
}

export interface WorkoutRowData {
  key: string;
  sportName: string;
  sportSlug: string | null;
  metric: 'pace' | 'speed';
  source: 'live' | 'manual';
  startedAt: string;
  durationS: number;
  distanceM: number | null;
  paceSecondsPerKm?: number | null;
  speedMps?: number | null;
  /** Still in the offline outbox. */
  pending?: boolean;
}

/** Server workout → row. */
export function workoutToRow(workout: Workout): WorkoutRowData {
  return {
    key: workout.uuid,
    sportName: workout.sport?.name ?? '',
    sportSlug: workout.sport?.slug ?? null,
    metric: workout.sport?.metric ?? 'pace',
    source: workout.source,
    startedAt: workout.started_at,
    durationS: workout.duration_s,
    distanceM: workout.distance_m,
    paceSecondsPerKm: workout.avg_pace_s_per_km,
    speedMps: workout.avg_speed_mps,
  };
}

/** One workout in the history / home list: activity, date, time, distance, pace or speed, and its source. */
export function WorkoutRow({ row, onPress }: { row: WorkoutRowData; onPress?: () => void }) {
  const { t } = useI18n();
  const rhythm = rhythmLabel(row.metric, row.paceSecondsPerKm, row.speedMps);
  const details = [durationLabel(row.durationS), row.distanceM ? kmLabel(row.distanceM) : null, rhythm].filter(Boolean).join(' · ');

  return (
    <PressableScale
      onPress={onPress}
      disabled={!onPress}
      scaleTo={0.98}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={[row.sportName, workoutDateLabel(row.startedAt), details, row.source === 'manual' ? t('Registrado manualmente') : t('En vivo'), row.pending ? t('Pendiente de sincronizar') : null].filter(Boolean).join('. ')}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        backgroundColor: colors.card,
        borderRadius: radius.lg,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: colors.hairline,
        padding: spacing.md,
      }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}>
        <SportIcon slug={row.sportSlug} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' }}>
          <AppText variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
            {row.sportName}
          </AppText>
          {row.source === 'manual' ? <Badge label={t('Manual')} /> : null}
        </View>
        <AppText variant="caption" tone="subtle" numberOfLines={1}>
          {workoutDateLabel(row.startedAt)}
        </AppText>
        <AppText variant="caption" tone="muted" numberOfLines={1} style={{ fontVariant: ['tabular-nums'] }}>
          {details}
        </AppText>
      </View>
      {row.pending ? <CloudUpload size={18} color={colors.subtle} accessibilityLabel={t('Pendiente de sincronizar')} /> : null}
    </PressableScale>
  );
}
