import { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { Image } from 'expo-image';
import { colors, springs } from '@/theme/tokens';

export type TapPhase = 'idle' | 'searching' | 'working' | 'done' | 'error';

interface TapIllustrationProps {
  phase: TapPhase;
  /** `ios` puts the antenna at the top of the phone; Android near the middle of the back. */
  platform: 'ios' | 'android';
  /** Upper bound; the drawing also shrinks to fit short screens (~32% of the window height). */
  size?: number;
}

/**
 * "Acerca tu Finisher Legacy": a phone silhouette with the Tag drifting
 * up to its antenna and soft gold rings pulsing from the contact point.
 * Pure Views + Reanimated (UI thread). Reduce Motion → a still composition.
 */
export function TapIllustration({ phase, platform, size: maxSize = 220 }: TapIllustrationProps) {
  const { height: windowHeight } = useWindowDimensions();
  const size = Math.min(maxSize, Math.max(96, Math.round((windowHeight * 0.32) / 1.12)));
  const reduceMotion = useReducedMotion();
  const drift = useSharedValue(0);
  const r0 = useSharedValue(0);
  const r1 = useSharedValue(0);
  const r2 = useSharedValue(0);
  const glow = useSharedValue(0);

  const phoneW = size * 0.46;
  const phoneH = phoneW * 2.02;
  const antennaY = platform === 'ios' ? phoneH * 0.16 : phoneH * 0.42;
  const tagW = phoneW * 0.78;
  const tagH = tagW * 0.64;

  useEffect(() => {
    const rings = [r0, r1, r2];
    const animate = (phase === 'searching' || phase === 'working') && !reduceMotion;

    if (phase === 'idle' || phase === 'searching') {
      drift.value = reduceMotion
        ? 1
        : withRepeat(withSequence(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.cubic) }), withDelay(700, withTiming(0, { duration: 900, easing: Easing.inOut(Easing.cubic) }))), -1);
    } else {
      drift.value = withSpring(1, springs.gentle);
    }

    rings.forEach((ring, i) => {
      if (!animate) {
        ring.value = phase === 'done' ? 0 : 0.4;
        return;
      }
      const duration = phase === 'working' ? 1100 : 2000;
      ring.value = 0;
      ring.value = withDelay((duration / 3) * i, withRepeat(withTiming(1, { duration, easing: Easing.out(Easing.quad) }), -1));
    });

    glow.value = withTiming(phase === 'done' ? 1 : phase === 'working' ? 0.6 : 0, { duration: 420 });
  }, [phase, reduceMotion, drift, r0, r1, r2, glow]);

  const tagStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - drift.value) * size * 0.32 }, { rotate: `${(1 - drift.value) * -8}deg` }],
    opacity: 0.55 + drift.value * 0.45,
  }));

  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));

  const ringColor = phase === 'error' ? colors.destructive : colors.gold;

  return (
    <View style={{ width: size, height: size * 1.12, alignItems: 'center', justifyContent: 'center' }} accessible={false} importantForAccessibility="no-hide-descendants">
      {/* Phone */}
      <View style={[styles.phone, { width: phoneW, height: phoneH, borderRadius: phoneW * 0.2 }]}>
        <View style={[styles.island, { width: phoneW * 0.3, borderRadius: 6 }]} />
        <Animated.View style={[styles.screenGlow, { borderRadius: phoneW * 0.16 }, glowStyle]} />
      </View>

      {/* Rings from the antenna */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center' }]}>
        <View style={{ position: 'absolute', top: (size * 1.12 - phoneH) / 2 + antennaY - size * 0.3, width: size * 0.6, height: size * 0.6, alignItems: 'center', justifyContent: 'center' }}>
          <Ring progress={r0} size={size * 0.6} color={ringColor} />
          <Ring progress={r1} size={size * 0.6} color={ringColor} />
          <Ring progress={r2} size={size * 0.6} color={ringColor} />
        </View>
      </View>

      {/* Tag */}
      <Animated.View
        style={[
          styles.tag,
          {
            width: tagW,
            height: tagH,
            borderRadius: tagH * 0.18,
            top: (size * 1.12 - phoneH) / 2 + antennaY - tagH / 2,
          },
          tagStyle,
        ]}>
        <View style={styles.tagInner}>
          <View style={[styles.tagSlot, { width: tagW * 0.34, height: Math.max(4, tagH * 0.07) }]} />
          <Image source={require('@/assets/images/brand/fl-monograma.png')} style={{ width: tagW * 0.5, height: (tagW * 0.5) / (1024 / 462) }} contentFit="contain" />
        </View>
      </Animated.View>
    </View>
  );
}

function Ring({ progress, size, color }: { progress: SharedValue<number>; size: number; color: string }) {
  const style = useAnimatedStyle(() => ({
    opacity: (1 - progress.value) * 0.7,
    transform: [{ scale: 0.3 + progress.value * 0.85 }],
  }));
  return <Animated.View style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 1.5, borderColor: color }, style]} />;
}

const styles = StyleSheet.create({
  phone: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.foreground,
    alignItems: 'center',
    paddingTop: 8,
    shadowColor: '#2B2418',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 2,
  },
  island: { height: 10, backgroundColor: colors.black },
  screenGlow: { position: 'absolute', top: 6, left: 6, right: 6, bottom: 6, backgroundColor: colors.goldWash },
  tag: {
    position: 'absolute',
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.gold,
    shadowColor: '#2B2418',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 3,
  },
  tagInner: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  tagSlot: { borderRadius: 3, backgroundColor: colors.black },
});
