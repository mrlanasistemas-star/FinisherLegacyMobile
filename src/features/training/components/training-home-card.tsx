import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import { ChevronRight, Timer } from 'lucide-react-native';
import { useEffect } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { PressableScale } from '@/components/motion/pressable-scale';
import { useI18n } from '@/i18n';
import { gradients } from '@/theme/gradients';
import { colors, fontFamily, radius, shadows, spacing } from '@/theme/tokens';

import { useTrainingMessages } from '../use-training';
import { bootstrapWorkouts } from '../workout/workout-controller';
import { useActiveWorkoutStore } from '../workout/workout-storage';

const TRAINING_HREF = '/training' as Href;
const WORKOUT_HREF = '/training/workout' as Href;

/**
 * "Entrenamientos" entry on Inicio (training has no tab of its own). Opens
 * the Modo entrenamiento hub; while a live workout is running (or was left
 * open when the app closed) it says so and goes straight back to it. Also
 * boots the workout outbox, so a finish recorded offline syncs as soon as
 * the app is opened with signal. The new-messages badge is a real count.
 */
export function TrainingHomeCard() {
  const { t, tc } = useI18n();
  const messages = useTrainingMessages('all');
  const active = useActiveWorkoutStore((s) => s.workout);
  const unheard = messages.data?.pages[0]?.meta.unheard_count ?? 0;

  useEffect(() => {
    bootstrapWorkouts().catch(() => {});
  }, []);

  const line = active
    ? active.clock.pausedAt !== null
      ? t('{sport} · en pausa. Toca para continuar.', { sport: active.sport.name })
      : t('{sport} · en curso. Toca para volver.', { sport: active.sport.name })
    : unheard > 0
      ? tc('Entrena con {count} mensaje nuevo de tu equipo|Entrena con {count} mensajes nuevos de tu equipo', unheard)
      : t('Entrena en vivo, registra actividades y mira tu progreso');

  return (
    <PressableScale
      onPress={() => router.push(active ? WORKOUT_HREF : TRAINING_HREF)}
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={t('Entrenamientos. {line}', { line })}
      style={{
        backgroundColor: colors.card,
        borderRadius: radius.xl,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: active || unheard > 0 ? colors.gold : colors.hairline,
        padding: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        ...shadows.card,
      }}>
      <LinearGradient colors={gradients.gold} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' }}>
        <Timer size={24} color={colors.onGold} strokeWidth={2} />
      </LinearGradient>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="eyebrow">{active ? t('Entrenamiento en curso') : t('Modo entrenamiento')}</AppText>
        <AppText variant="subtitle" style={{ fontSize: 18 }}>
          {t('Entrenamientos')}
        </AppText>
        <AppText variant="caption" tone="muted" numberOfLines={2}>
          {line}
        </AppText>
      </View>
      {!active && unheard > 0 ? (
        <View style={{ minWidth: 26, height: 26, paddingHorizontal: 7, borderRadius: 13, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center' }}>
          <AppText style={{ fontFamily: fontFamily.bold, fontSize: 12, color: colors.gold }} maxFontSizeMultiplier={1.2}>
            {unheard > 99 ? '99+' : unheard}
          </AppText>
        </View>
      ) : (
        <ChevronRight size={20} color={colors.subtle} />
      )}
    </PressableScale>
  );
}
