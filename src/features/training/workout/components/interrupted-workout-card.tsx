import { router, type Href } from 'expo-router';
import { AlertCircle } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { elapsedMs, formatClock } from '@/features/training/session-clock';
import { useI18n } from '@/i18n';
import { showToast } from '@/stores/toastStore';
import { colors, radius, spacing } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';

import { continueInterruptedWorkout, discardLiveWorkout, finishLiveWorkout } from '../workout-controller';
import { useActiveWorkoutStore } from '../workout-storage';
import { workoutDateLabel } from '../format';

export const WORKOUT_HREF = '/training/workout' as Href;
export const SUMMARY_HREF = '/training/summary' as Href;

/**
 * Shown on the training home when a live workout is still open on this
 * phone (the app was closed or killed mid-workout): continue it, finish it
 * with what was recorded, or discard it. Nothing is decided for the athlete
 * — the server also closes it on its own after 12 h without activity.
 */
export function InterruptedWorkoutCard() {
  const { t } = useI18n();
  const workout = useActiveWorkoutStore((s) => s.workout);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [busy, setBusy] = useState<'finish' | 'discard' | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!workout) return null;
  const elapsed = formatClock(elapsedMs(workout.clock, now));
  const paused = workout.clock.pausedAt !== null;

  const onContinue = async () => {
    haptics.light();
    await continueInterruptedWorkout().catch(() => {});
    router.push(WORKOUT_HREF);
  };

  const onFinish = async () => {
    setBusy('finish');
    try {
      await finishLiveWorkout();
      haptics.success();
      router.push(SUMMARY_HREF);
    } catch {
      showToast(t('No pudimos terminar el entrenamiento. Intenta de nuevo.'), 'destructive');
    } finally {
      setBusy(null);
    }
  };

  return (
    <View
      accessibilityRole="summary"
      style={{ backgroundColor: colors.card, borderRadius: radius.xl, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.gold, padding: spacing.lg, gap: spacing.md }}>
      <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
        <AlertCircle size={22} color={colors.accent} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="bodyStrong">{paused ? t('Tienes un entrenamiento en pausa') : t('Tienes un entrenamiento en curso')}</AppText>
          <AppText variant="caption" tone="muted">
            {t('{sport} · empezó {date} · {time} registrados', { sport: workout.sport.name, date: workoutDateLabel(workout.startedAt), time: elapsed })}
          </AppText>
        </View>
      </View>
      <AppButton label={t('Continuar entrenamiento')} onPress={onContinue} size="md" />
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <AppButton label={t('Terminar y guardar')} variant="secondary" size="sm" onPress={onFinish} loading={busy === 'finish'} style={{ flex: 1 }} />
        <AppButton label={t('Descartar')} variant="ghost" size="sm" onPress={() => setConfirmDiscard(true)} style={{ flex: 1 }} />
      </View>

      <ConfirmDialog
        visible={confirmDiscard}
        title={t('¿Descartar este entrenamiento?')}
        description={t('No se guardará nada de este entrenamiento.')}
        confirmLabel={t('Descartar')}
        destructive
        loading={busy === 'discard'}
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={async () => {
          setBusy('discard');
          await discardLiveWorkout().catch(() => {});
          setBusy(null);
          setConfirmDiscard(false);
          showToast(t('Entrenamiento descartado'));
        }}
      />
    </View>
  );
}
