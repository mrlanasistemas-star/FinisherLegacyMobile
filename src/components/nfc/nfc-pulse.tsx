import { Nfc } from 'lucide-react-native';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { colors } from '@/theme/tokens';

const RING_COUNT = 3;
const DURATION = 2200;

/**
 * The "phone meets product" moment: concentric gold rings expanding out of
 * a brushed-steel disc. Pure Reanimated (UI thread); with Reduce Motion on
 * the rings stay still at a soft opacity — the icon alone carries the meaning.
 */
export function NfcPulse({ size = 168, active = true }: { size?: number; active?: boolean }) {
  const reduceMotion = useReducedMotion();
  const p0 = useSharedValue(0);
  const p1 = useSharedValue(0);
  const p2 = useSharedValue(0);

  useEffect(() => {
    const rings = [p0, p1, p2];
    rings.forEach((ring, index) => {
      if (!active || reduceMotion) {
        ring.value = 0.35;
        return;
      }
      ring.value = 0;
      ring.value = withDelay((DURATION / RING_COUNT) * index, withRepeat(withTiming(1, { duration: DURATION, easing: Easing.out(Easing.quad) }), -1));
    });
  }, [active, reduceMotion, p0, p1, p2]);

  const disc = size * 0.42;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessible={false} importantForAccessibility="no-hide-descendants">
      <Ring progress={p0} size={size} />
      <Ring progress={p1} size={size} />
      <Ring progress={p2} size={size} />
      <View
        style={{
          width: disc,
          height: disc,
          borderRadius: disc / 2,
          backgroundColor: colors.graphiteLight,
          borderWidth: 1,
          borderColor: colors.goldDim,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: colors.gold,
          shadowOpacity: 0.35,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 0 },
          elevation: 0,
        }}>
        <Nfc size={disc * 0.46} color={colors.goldSoft} strokeWidth={1.8} />
      </View>
    </View>
  );
}

function Ring({ progress, size }: { progress: SharedValue<number>; size: number }) {
  const style = useAnimatedStyle(() => ({
    opacity: 0.7 * (1 - progress.value),
    transform: [{ scale: 0.42 + progress.value * 0.58 }],
  }));

  return (
    <Animated.View
      style={[
        { position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 1.5, borderColor: colors.gold },
        style,
      ]}
    />
  );
}
