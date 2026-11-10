import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import { useI18n } from '@/i18n';
import { colors, springs } from '@/theme/tokens';

interface ActivationProgressProps {
  labels: readonly string[];
  /** Zero-based current step. */
  index: number;
}

/** Clean segmented progress: thin hairline track, the filled part springs to the current step. */
export function ActivationProgress({ labels, index }: ActivationProgressProps) {
  const { t } = useI18n();
  const total = labels.length;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withSpring((index + 1) / total, springs.gentle);
  }, [index, total, progress]);

  const fill = useAnimatedStyle(() => ({ width: `${Math.min(1, progress.value) * 100}%` as const }));

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('Paso {step} de {total}: {label}', { step: index + 1, total, label: labels[index] ?? '' })}
      accessibilityValue={{ min: 1, max: total, now: index + 1 }}
      style={styles.wrap}>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, fill]} />
      </View>
      <View style={styles.row}>
        <AppText variant="label" style={styles.step}>
          {t('PASO {step} DE {total}', { step: index + 1, total })}
        </AppText>
        <AppText variant="caption" style={styles.name}>
          {labels[index]}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  track: { height: 3, borderRadius: 2, backgroundColor: colors.hairline, overflow: 'hidden' },
  fill: { height: 3, borderRadius: 2, backgroundColor: colors.gold },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  step: { color: colors.accent, letterSpacing: 1.6 },
  name: { color: colors.muted },
});
