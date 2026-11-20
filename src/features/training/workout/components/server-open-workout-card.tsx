import { useQueryClient } from '@tanstack/react-query';
import { CloudAlert } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { discardWorkout, finishWorkout } from '@/api/workouts';
import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { useI18n } from '@/i18n';
import { showToast } from '@/stores/toastStore';
import { colors, radius, spacing } from '@/theme/tokens';
import { ensureOnline } from '@/utils/network';

import { durationLabel, workoutDateLabel } from '../format';
import { clearConflict, useWorkoutOutbox } from '../workout-outbox';
import { useServerActiveWorkout, workoutKeys } from '../use-workouts';

/**
 * A live workout open on the SERVER that this phone doesn't have (started
 * on another phone, or the app was reinstalled). It blocks starting a new
 * one (409), so the athlete resolves it here: finish it with the time the
 * server last heard, or discard it. Never resolved silently.
 */
export function ServerOpenWorkoutCard() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const blocked = useWorkoutOutbox((s) => s.blocked);
  const active = useServerActiveWorkout(true);
  const [busy, setBusy] = useState<'finish' | 'discard' | null>(null);
  const workout = active.data;

  // A workout this phone is still syncing isn't "open elsewhere".
  const localUuids = useWorkoutOutbox((s) => s.uuids);
  const ops = useWorkoutOutbox((s) => s.ops);
  if (!workout) return null;
  if (workout.client_uuid && (ops.some((op) => op.clientUuid === workout.client_uuid) || Object.values(localUuids).includes(workout.uuid)) && blocked !== 'conflict') return null;

  const resolve = async (action: 'finish' | 'discard') => {
    setBusy(action);
    try {
      await ensureOnline();
      if (action === 'finish') await finishWorkout(workout.uuid, { duration_s: workout.duration_s, ended_at: workout.last_heartbeat_at ?? new Date().toISOString() });
      else await discardWorkout(workout.uuid);
      await clearConflict();
      await queryClient.invalidateQueries({ queryKey: workoutKeys.all });
      showToast(action === 'finish' ? t('Entrenamiento guardado') : t('Entrenamiento descartado'), action === 'finish' ? 'success' : 'default');
    } catch (error) {
      showToast((error as Error).message, 'destructive');
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={{ backgroundColor: colors.card, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.gold, padding: spacing.lg, gap: spacing.md }}>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <CloudAlert size={22} color={colors.accent} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="bodyStrong">{t('Tienes un entrenamiento abierto en otro dispositivo')}</AppText>
          <AppText variant="caption" tone="muted">
            {t('{sport} · empezó {date} · {time} registrados', { sport: workout.sport?.name ?? t('Entrenamiento'), date: workoutDateLabel(workout.started_at), time: durationLabel(workout.duration_s) })}
          </AppText>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <AppButton label={t('Terminar y guardar')} variant="secondary" size="sm" onPress={() => resolve('finish')} loading={busy === 'finish'} disabled={!!busy} style={{ flex: 1 }} />
        <AppButton label={t('Descartar')} variant="ghost" size="sm" onPress={() => resolve('discard')} loading={busy === 'discard'} disabled={!!busy} style={{ flex: 1 }} />
      </View>
    </View>
  );
}
