import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors, radius, spacing } from '@/theme/tokens';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Loading placeholder with a soft light sweep (UI-thread translateX loop).
 * Reduce Motion: a static warm block — no shimmer.
 */
export function Skeleton({ width = '100%', height = 16, radius: cornerRadius = radius.sm, style }: SkeletonProps) {
  const reduceMotion = useReducedMotion();
  const [measured, setMeasured] = useState(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion || measured === 0) return;
    progress.value = 0;
    progress.value = withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.quad) }), -1, false);
    return () => cancelAnimation(progress);
  }, [progress, reduceMotion, measured]);

  const sweepWidth = Math.max(80, measured * 0.6);
  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -sweepWidth + progress.value * (measured + sweepWidth * 2) }],
  }));

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={(event) => setMeasured(event.nativeEvent.layout.width)}
      style={[{ width, height, borderRadius: cornerRadius, backgroundColor: colors.surfaceMuted, overflow: 'hidden' }, style]}>
      {!reduceMotion && measured > 0 ? (
        <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, width: sweepWidth }, sweepStyle]}>
          <LinearGradient
            colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.75)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ flex: 1 }}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

/** A card-shaped skeleton (media block + two text lines) for lists and grids. */
export function SkeletonCard({ mediaHeight = 160, style }: { mediaHeight?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.hairline, overflow: 'hidden' }, style]}>
      <Skeleton height={mediaHeight} radius={0} />
      <View style={{ padding: spacing.md, gap: spacing.xs }}>
        <Skeleton width="70%" height={16} />
        <Skeleton width="40%" height={12} />
      </View>
    </View>
  );
}

/** A list-row skeleton (avatar/icon + two lines). */
export function SkeletonRow({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm }, style]}>
      <Skeleton width={44} height={44} radius={22} />
      <View style={{ flex: 1, gap: spacing.xs }}>
        <Skeleton width="60%" height={14} />
        <Skeleton width="35%" height={12} />
      </View>
    </View>
  );
}
