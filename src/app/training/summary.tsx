/**
 * Resumen — right after "Terminar". Renders at once from the phone's copy
 * (works offline), then switches to the server's copy once the outbox
 * delivered the finish. Short encouragement (a real record only when the
 * route really beat the previous one), the numbers, the route, sync status
 * and "Compartir como Legacy Moment" (explicit, private by default).
 */
import { router, type Href } from 'expo-router';
import { Check, Share2 } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { Reveal } from '@/components/motion/reveal';
import { StatusBarScrim } from '@/components/ui/status-bar-scrim';
import { RouteShape } from '@/features/training/workout/components/route-shape';
import { ShareMomentSheet } from '@/features/training/workout/components/share-moment-sheet';
import { SyncStatus } from '@/features/training/workout/components/sync-status';
import { WorkoutStats } from '@/features/training/workout/components/workout-stats';
import { useFinishedWorkoutStore } from '@/features/training/workout/finished-store';
import { finishHeadline } from '@/features/training/workout/motivation';
import { useRefreshOnSync, useWorkout, useWorkoutStats } from '@/features/training/workout/use-workouts';
import { useWorkoutOutbox } from '@/features/training/workout/workout-outbox';
import { paceSecondsPerKm } from '@/features/training/workout/workout-math';
import { useI18n } from '@/i18n';
import { colors, spacing } from '@/theme/tokens';

export default function WorkoutSummaryScreen() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const finished = useFinishedWorkoutStore((s) => s.finished);
  const serverUuid = useWorkoutOutbox((s) => (finished ? (s.uuids[finished.clientUuid] ?? null) : null));
  const pending = useWorkoutOutbox((s) => (finished ? s.ops.some((op) => op.clientUuid === finished.clientUuid) : false));
  const synced = !!serverUuid && !pending;
  const server = useWorkout(synced ? serverUuid : null);
  const records = useWorkoutStats('all');
  const [shareOpen, setShareOpen] = useState(false);
  const [momentUuid, setMomentUuid] = useState<string | null>(null);
  useRefreshOnSync();

  // Nothing to summarize (e.g. app reopened on this route): back to the hub.
  useEffect(() => {
    if (!finished) router.replace('/training' as Href);
  }, [finished]);

  const newRecord = useMemo(() => {
    if (!finished) return null;
    const r = records.data?.records;
    const isOwn = (uuid: string | undefined) => !!uuid && uuid === serverUuid;
    const beats = (mine: number | null, record: { uuid: string; value: number } | null | undefined, lower: boolean) =>
      mine !== null && (record ? isOwn(record.uuid) || (lower ? mine < record.value : mine > record.value) : true);
    if (r && beats(finished.best10kS, r.best_10k, true)) return '10k' as const;
    if (r && beats(finished.best5kS, r.best_5k, true)) return '5k' as const;
    if (r && finished.distanceM && finished.distanceM >= 1000 && r.longest_distance && beats(finished.distanceM, r.longest_distance, false)) return 'distance' as const;
    return null;
  }, [finished, records.data, serverUuid]);

  if (!finished) return null;
  const w = server.data;
  const moving = finished.movingS && finished.movingS > 0 ? finished.movingS : finished.durationS;
  const pace = w?.avg_pace_s_per_km ?? (finished.usesGps ? paceSecondsPerKm(finished.distanceM, moving) : null);
  const speed = w?.avg_speed_mps ?? (finished.usesGps && pace && finished.distanceM ? finished.distanceM / moving : null);
  const moment = momentUuid ?? w?.moment?.uuid ?? null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + spacing.xl, paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + 160, gap: spacing.lg }}>
        <Reveal style={{ gap: spacing.xs, alignItems: 'center' }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center' }}>
            <Check size={28} color={colors.gold} />
          </View>
          <AppText variant="eyebrow">{finished.sport.name}</AppText>
          <AppText variant="title" align="center" accessibilityRole="header">
            {finishHeadline({ durationS: finished.durationS, newRecord })}
          </AppText>
        </Reveal>

        <SyncStatus compact />

        <WorkoutStats
          metric={finished.sport.metric}
          usesGps={finished.usesGps}
          durationS={w?.duration_s ?? finished.durationS}
          movingS={w?.moving_s ?? finished.movingS}
          distanceM={w?.distance_m ?? finished.distanceM}
          paceSecondsPerKm={pace}
          speedMps={speed}
          elevationGainM={w?.elevation_gain_m ?? finished.elevationGainM}
          best5kS={w?.best_5k_s ?? finished.best5kS}
          best10kS={w?.best_10k_s ?? finished.best10kS}
        />

        {finished.polyline ? <RouteShape polyline={finished.polyline} label={t('Tu recorrido')} /> : null}
      </ScrollView>
      <StatusBarScrim />

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: insets.bottom + spacing.md, gap: spacing.xs, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.hairline }}>
        {moment ? (
          <AppButton label={t('Ver mi momento')} variant="secondary" onPress={() => router.push(`/moments/${moment}` as Href)} />
        ) : (
          <AppButton
            label={synced ? t('Compartir como Legacy Moment') : t('Podrás compartirlo cuando se sincronice')}
            variant="secondary"
            icon={Share2}
            disabled={!synced}
            onPress={() => setShareOpen(true)}
          />
        )}
        <AppButton
          label={t('Listo')}
          onPress={() => {
            useFinishedWorkoutStore.getState().set(null);
            router.replace('/training' as Href);
          }}
        />
      </View>

      {serverUuid ? <ShareMomentSheet uuid={serverUuid} visible={shareOpen} onClose={() => setShareOpen(false)} onShared={setMomentUuid} /> : null}
    </View>
  );
}
