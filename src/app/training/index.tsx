/**
 * Entrenamientos — the Modo entrenamiento hub. Three clearly different
 * paths, named as such:
 *   1. Entrenar ahora — a live workout (timer, GPS distance outdoors, cheers).
 *   2. Registrar actividad pasada — manual entry, always labeled "Manual".
 *   3. Seguir una carrera en vivo — the existing race-day live tracking.
 * Below: an open workout to continue/finish/discard, sync status, progress
 * for the week / month / year, honest personal records, the latest workouts
 * (including ones still waiting to sync) and the cheer-messages inbox.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import { ChevronLeft, Headphones, PenLine, Play, Radio, Trophy } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { ErrorState } from '@/components/error-state';
import { BrandRefreshControl } from '@/components/motion/brand-refresh-control';
import { PressableScale } from '@/components/motion/pressable-scale';
import { Reveal } from '@/components/motion/reveal';
import { SectionHeader } from '@/components/ui/section-header';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Skeleton } from '@/components/skeleton';
import { IconButton } from '@/components/ui/icon-button';
import { ListGroup, ListRow } from '@/components/ui/list-row';
import { StatStrip } from '@/components/ui/stat-strip';
import { useTrainingMessages } from '@/features/training/use-training';
import { InterruptedWorkoutCard, WORKOUT_HREF } from '@/features/training/workout/components/interrupted-workout-card';
import { ServerOpenWorkoutCard } from '@/features/training/workout/components/server-open-workout-card';
import { SyncStatus } from '@/features/training/workout/components/sync-status';
import { WorkoutRow, workoutToRow, type WorkoutRowData } from '@/features/training/workout/components/workout-row';
import { durationLabel, kmLabel, NO_VALUE } from '@/features/training/workout/format';
import { formatKm } from '@/features/training/workout/workout-math';
import { bootstrapWorkouts } from '@/features/training/workout/workout-controller';
import { useWorkoutOutbox } from '@/features/training/workout/workout-outbox';
import { useActiveWorkoutStore } from '@/features/training/workout/workout-storage';
import { flattenWorkouts, useRefreshOnSync, useWorkoutHistory, useWorkoutStats } from '@/features/training/workout/use-workouts';
import { getLocale, useI18n } from '@/i18n';
import type { WorkoutPeriod } from '@/schemas/workouts';
import { gradients } from '@/theme/gradients';
import { colors, fontFamily, radius, shadows, spacing } from '@/theme/tokens';

const LOG_HREF = '/training/log' as Href;
const HISTORY_HREF = '/training/history' as Href;
const MESSAGES_HREF = '/training/messages' as Href;
const SHARE_HREF = '/training/share' as Href;
/** Race-day live tracking lives in each participation ("Mis carreras"). */
const RACES_HREF = '/my-events' as Href;

export default function TrainingHubScreen() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<WorkoutPeriod>('month');
  const [refreshing, setRefreshing] = useState(false);
  const active = useActiveWorkoutStore((s) => s.workout);
  const activeHydrated = useActiveWorkoutStore((s) => s.hydrated);
  const ops = useWorkoutOutbox((s) => s.ops);

  useEffect(() => {
    bootstrapWorkouts().catch(() => {});
  }, []);
  useRefreshOnSync();

  const stats = useWorkoutStats(period);
  const allTime = useWorkoutStats('all');
  const history = useWorkoutHistory('all');
  const messages = useTrainingMessages('all');
  const unheard = messages.data?.pages[0]?.meta.unheard_count ?? 0;

  const pendingRows = useMemo<WorkoutRowData[]>(
    () =>
      ops.flatMap((op) =>
        op.kind === 'finish' || op.kind === 'manual'
          ? [
              {
                key: `pending-${op.id}`,
                sportName: op.summary.sportName,
                sportSlug: op.summary.sportSlug,
                metric: op.summary.sportSlug === 'ciclismo' ? 'speed' : 'pace',
                source: op.summary.source,
                startedAt: op.summary.startedAt,
                durationS: op.summary.durationS,
                distanceM: op.summary.distanceM,
                pending: true,
              } satisfies WorkoutRowData,
            ]
          : [],
      ),
    [ops],
  );
  const recent = flattenWorkouts(history.data?.pages).slice(0, 5);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([stats.refetch(), allTime.refetch(), history.refetch(), messages.refetch()]);
    setRefreshing(false);
  }, [stats, allTime, history, messages]);

  const periods: { value: WorkoutPeriod; label: string }[] = [
    { value: 'week', label: t('Semana') },
    { value: 'month', label: t('Mes') },
    { value: 'year', label: t('Año') },
  ];

  const records = allTime.data?.records;
  const recordTiles = [
    { label: t('Mayor distancia'), value: records?.longest_distance ? kmLabel(records.longest_distance.value) : NO_VALUE, uuid: records?.longest_distance?.uuid },
    { label: t('Más tiempo'), value: records?.longest_duration ? durationLabel(records.longest_duration.value) : NO_VALUE, uuid: records?.longest_duration?.uuid },
    { label: t('Mejor 5 km'), value: records?.best_5k ? clock(records.best_5k.value) : NO_VALUE, uuid: records?.best_5k?.uuid },
    { label: t('Mejor 10 km'), value: records?.best_10k ? clock(records.best_10k.value) : NO_VALUE, uuid: records?.best_10k?.uuid },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + spacing.xs, paddingBottom: insets.bottom + spacing.xxl, paddingHorizontal: spacing.lg, gap: spacing.xl }}
        refreshControl={<BrandRefreshControl refreshing={refreshing} onRefresh={refresh} progressViewOffset={insets.top} />}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: -spacing.xs }}>
          <IconButton icon={ChevronLeft} label={t('Volver')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} size={26} />
        </View>

        <Reveal style={{ gap: 4, marginTop: -spacing.md }}>
          <AppText variant="eyebrow">{t('Modo entrenamiento')}</AppText>
          <AppText variant="display" accessibilityRole="header">
            {t('Entrenamientos')}
          </AppText>
          <AppText variant="body" tone="muted">
            {t('Entrena, registra lo que ya hiciste y mira cómo avanzas.')}
          </AppText>
        </Reveal>

        {activeHydrated && active ? <InterruptedWorkoutCard /> : null}
        {activeHydrated && !active ? <ServerOpenWorkoutCard /> : null}

        {!active ? (
          <Reveal delay={60} style={{ gap: spacing.sm }}>
            <StartHero />
            <ListGroup>
              <ListRow icon={PenLine} label={t('Registrar actividad pasada')} description={t('Agrégala a mano: fecha, duración y distancia')} onPress={() => router.push(LOG_HREF)} />
              <ListRow
                icon={Radio}
                label={t('Seguir una carrera en vivo')}
                description={t('El día de tu carrera: tu gente te sigue en el mapa')}
                onPress={() => router.push(RACES_HREF)}
                divider={false}
              />
            </ListGroup>
          </Reveal>
        ) : null}

        <SyncStatus />

        <Reveal delay={110} style={{ gap: spacing.sm }}>
          <SectionHeader title={t('Tu progreso')} />
          <SegmentedControl options={periods} value={period} onChange={setPeriod} />
          {stats.isPending ? (
            <Skeleton height={72} radius={radius.lg} />
          ) : stats.isError ? (
            <ErrorState error={stats.error} onRetry={() => stats.refetch()} message={t('No pudimos cargar tu progreso.')} />
          ) : (
            <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.hairline, paddingVertical: spacing.sm }}>
              <StatStrip
                items={[
                  { label: t('Entrenamientos'), value: stats.data.totals.workouts },
                  { label: t('Tiempo'), value: stats.data.totals.duration_s > 0 ? durationLabel(stats.data.totals.duration_s) : NO_VALUE },
                  { label: t('Kilómetros'), value: stats.data.totals.distance_m > 0 ? formatKm(stats.data.totals.distance_m, getLocale()) : NO_VALUE },
                ]}
              />
            </View>
          )}
          {stats.data && stats.data.totals.manual > 0 ? (
            <AppText variant="caption" tone="subtle">
              {t('Incluye {count} registrados manualmente.', { count: stats.data.totals.manual })}
            </AppText>
          ) : null}
        </Reveal>

        <Reveal delay={140} style={{ gap: spacing.sm }}>
          <SectionHeader title={t('Tus récords')} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {recordTiles.map((tile) => (
              <PressableScale
                key={tile.label}
                disabled={!tile.uuid}
                onPress={() => tile.uuid && router.push(`/training/workouts/${tile.uuid}` as Href)}
                scaleTo={0.97}
                accessibilityRole={tile.uuid ? 'button' : 'text'}
                accessibilityLabel={`${tile.label}: ${tile.value}`}
                style={{ flexBasis: '47%', flexGrow: 1, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: tile.uuid ? colors.hairline : colors.hairline, padding: spacing.md, gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Trophy size={14} color={tile.uuid ? colors.accent : colors.subtle} />
                  <AppText variant="caption" tone="subtle" numberOfLines={1}>
                    {tile.label}
                  </AppText>
                </View>
                <AppText style={{ fontFamily: fontFamily.heading, fontSize: 20, color: colors.foreground, fontVariant: ['tabular-nums'] }} numberOfLines={1} adjustsFontSizeToFit>
                  {tile.value}
                </AppText>
              </PressableScale>
            ))}
          </View>
          <AppText variant="caption" tone="subtle">
            {t('Los récords solo cuentan entrenamientos en vivo medidos con GPS. Los de 5 y 10 km son tu tramo más rápido real dentro de una ruta.')}
          </AppText>
        </Reveal>

        <View style={{ gap: spacing.sm }}>
          <SectionHeader title={t('Últimos entrenamientos')} actionLabel={recent.length > 0 ? t('Ver todo') : undefined} onAction={recent.length > 0 ? () => router.push(HISTORY_HREF) : undefined} />
          {pendingRows.map((row) => (
            <WorkoutRow key={row.key} row={row} />
          ))}
          {history.isPending ? (
            <Skeleton height={76} radius={radius.lg} />
          ) : history.isError ? (
            pendingRows.length === 0 ? <ErrorState error={history.error} onRetry={() => history.refetch()} message={t('No pudimos cargar tus entrenamientos.')} /> : null
          ) : recent.length === 0 && pendingRows.length === 0 ? (
            <AppText variant="body" tone="muted">
              {t('Aún no tienes entrenamientos. Empieza uno o registra una actividad que ya hiciste.')}
            </AppText>
          ) : (
            recent.map((workout) => <WorkoutRow key={workout.uuid} row={workoutToRow(workout)} onPress={() => router.push(`/training/workouts/${workout.uuid}` as Href)} />)
          )}
        </View>

        <View style={{ gap: spacing.sm }}>
          <SectionHeader title={t('Mensajes de ánimo')} />
          <ListGroup>
            <ListRow
              icon={Headphones}
              label={t('Escuchar mis mensajes')}
              description={unheard > 0 ? t('{count} sin escuchar · suenan durante tu entrenamiento', { count: unheard }) : t('Suenan durante tu entrenamiento, incluso con la pantalla bloqueada')}
              onPress={() => router.push(MESSAGES_HREF)}
            />
            <ListRow label={t('Compartir mi enlace')} description={t('Tu familia te graba un audio sin necesidad de app')} onPress={() => router.push(SHARE_HREF)} divider={false} />
          </ListGroup>
        </View>
      </ScrollView>
      {/* Status-bar scrim: scrolled content must not run under the clock and icons. */}
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: colors.background }} />
    </View>
  );
}

/** `24:31` / `1:02:09` — a record time. */
function clock(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

function StartHero() {
  const { t } = useI18n();
  return (
    <PressableScale
      onPress={() => router.push(WORKOUT_HREF)}
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={t('Entrenar ahora')}
      accessibilityHint={t('Cronómetro, distancia con GPS al aire libre y los ánimos de tu equipo')}
      style={{ borderRadius: radius.xl, ...shadows.card }}>
      <LinearGradient
        colors={gradients.carbon}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: radius.xl, borderCurve: 'continuous', padding: spacing.lg, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <LinearGradient colors={gradients.goldGlow} start={{ x: 1, y: 0.5 }} end={{ x: 0.3, y: 0.5 }} style={{ position: 'absolute', right: -40, top: -40, bottom: -40, width: 220 }} pointerEvents="none" />
        <View style={{ flex: 1, gap: spacing.xs }}>
          <AppText variant="eyebrow" style={{ color: colors.gold }}>
            {t('En vivo')}
          </AppText>
          <AppText variant="subtitle" tone="onDark" style={{ fontSize: 22, lineHeight: 27 }}>
            {t('Entrenar ahora')}
          </AppText>
          <AppText variant="caption" tone="onDarkMuted">
            {t('Cronómetro, distancia con GPS al aire libre y los ánimos de tu equipo.')}
          </AppText>
        </View>
        <LinearGradient
          colors={gradients.gold}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', ...shadows.gold }}>
          <Play size={26} color={colors.onGold} fill={colors.onGold} strokeWidth={0} style={{ marginLeft: 4 }} />
        </LinearGradient>
      </LinearGradient>
    </PressableScale>
  );
}
