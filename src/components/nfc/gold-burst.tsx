import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming, type SharedValue } from 'react-native-reanimated';

import { colors } from '@/theme/tokens';

const PARTICLES = 18;

/**
 * Subtle success flourish: a few gold flecks drift outward from the center
 * and fade — once, no loop. Reduce Motion → nothing (the check carries it).
 */
export function GoldBurst({ size = 260 }: { size?: number }) {
  const reduceMotion = useReducedMotion();
  const t = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    t.value = withDelay(120, withTiming(1, { duration: 1500, easing: Easing.out(Easing.cubic) }));
  }, [reduceMotion, t]);

  const flecks = useMemo(
    () =>
      Array.from({ length: PARTICLES }, (_, i) => {
        const angle = (i / PARTICLES) * Math.PI * 2 + (i % 2 ? 0.18 : -0.12);
        const distance = size * (0.32 + ((i * 37) % 10) / 60);
        return { dx: Math.cos(angle) * distance, dy: Math.sin(angle) * distance, dot: 3 + (i % 3) * 1.5, light: i % 3 === 0 };
      }),
    [size],
  );

  if (reduceMotion) return null;

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]} accessible={false} importantForAccessibility="no-hide-descendants">
      {flecks.map((f, i) => (
        <Fleck key={i} t={t} {...f} />
      ))}
    </View>
  );
}

function Fleck({ t, dx, dy, dot, light }: { t: SharedValue<number>; dx: number; dy: number; dot: number; light: boolean }) {
  const style = useAnimatedStyle(() => ({
    opacity: t.value < 0.15 ? t.value / 0.15 : 1 - (t.value - 0.15) / 0.85,
    transform: [{ translateX: dx * t.value }, { translateY: dy * t.value + t.value * t.value * 18 }, { scale: 1 - t.value * 0.4 }],
  }));
  return <Animated.View style={[{ position: 'absolute', width: dot, height: dot, borderRadius: dot / 2, backgroundColor: light ? colors.goldSoft : colors.gold }, style]} />;
}
