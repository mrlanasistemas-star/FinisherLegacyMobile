import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import type { Tilt } from './hero-motion';

import { colors, palette } from '@/theme/tokens';

interface MemoryStackProps {
  size: number;
  active: boolean;
  tilt: Tilt;
}

/** Abstract warm gradients — placeholders for a memory, never fake photos or names. */
const CARDS = [
  { colors: ['#EFE6D8', '#D9C4A6'] as const, angle: -12, dx: -0.2 },
  { colors: ['#E9DCC8', '#BFA27C'] as const, angle: 10, dx: 0.2 },
  { colors: ['#F6EFE4', '#CDB290'] as const, angle: 0, dx: 0 },
];

const PARTICLES = [
  { x: 0.18, delay: 0, r: 3 },
  { x: 0.34, delay: 1400, r: 2 },
  { x: 0.62, delay: 700, r: 2.5 },
  { x: 0.78, delay: 2100, r: 3 },
  { x: 0.5, delay: 2900, r: 2 },
];

/**
 * "Revive y comparte": three rounded memory cards that fan out on springs,
 * each with a thin gold timeline, plus a few soft gold particles drifting up.
 */
export function MemoryStack({ size, active, tilt }: MemoryStackProps) {
  const fan = useSharedValue(active ? 0 : 1);

  useEffect(() => {
    if (!active) {
      fan.value = 1;
      return;
    }
    fan.value = 0;
    fan.value = withDelay(250, withSpring(1, { damping: 12, stiffness: 90, mass: 0.9 }));
  }, [active, fan]);

  const groupStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 800 }, { rotateX: `${tilt.rx.value * 0.6}deg` }, { rotateY: `${tilt.ry.value * 0.6}deg` }],
  }));

  const cardW = size * 0.5;
  const cardH = cardW * 1.3;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {active ? PARTICLES.map((p, i) => <Particle key={i} size={size} x={p.x} r={p.r} delay={p.delay} />) : null}
      <Animated.View style={[{ width: cardW, height: cardH }, groupStyle]}>
        {CARDS.map((card, i) => (
          <FanCard key={i} index={i} fan={fan} width={cardW} height={cardH} spread={size} {...card} />
        ))}
      </Animated.View>
    </View>
  );
}

function FanCard({
  index,
  fan,
  width,
  height,
  spread,
  colors: gradient,
  angle,
  dx,
}: {
  index: number;
  fan: SharedValue<number>;
  width: number;
  height: number;
  spread: number;
  colors: readonly [string, string];
  angle: number;
  dx: number;
}) {
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(fan.value, [0, 1], [0, dx * spread * 0.55]) },
      { translateY: interpolate(fan.value, [0, 1], [0, index === 2 ? -4 : 6]) },
      { rotateZ: `${interpolate(fan.value, [0, 1], [0, angle])}deg` },
    ],
  }));
  const front = index === 2;
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width,
          height,
          borderRadius: 18,
          borderCurve: 'continuous',
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: front ? 'rgba(201,174,139,0.7)' : colors.hairline,
          shadowColor: '#2B2418',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: front ? 0.14 : 0.06,
          shadowRadius: 16,
        },
        style,
      ]}>
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} />
      {/* Soft light bloom so the gradient reads as a blurred photo, not a flat swatch. */}
      <View style={{ position: 'absolute', top: -width * 0.2, left: -width * 0.1, width: width * 0.9, height: width * 0.9, borderRadius: width, backgroundColor: 'rgba(255,255,255,0.35)' }} />
      <View style={{ position: 'absolute', left: 14, right: 14, bottom: 16, gap: 6 }}>
        <View style={{ height: 2, borderRadius: 1, backgroundColor: palette.goldDeep, opacity: 0.55 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {[0, 1, 2, 3].map((d) => (
            <View key={d} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: d === 2 ? palette.goldDeep : 'rgba(140,116,84,0.35)' }} />
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

function Particle({ size, x, r, delay }: { size: number; x: number; r: number; delay: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration: 5200, easing: Easing.inOut(Easing.quad) }), -1, false));
    return () => cancelAnimation(t);
  }, [delay, t]);
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.2, 0.8, 1], [0, 0.55, 0.4, 0]),
    transform: [{ translateY: interpolate(t.value, [0, 1], [size * 0.38, -size * 0.42]) }, { translateX: Math.sin(t.value * Math.PI * 2) * 6 }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', left: size * x, top: size / 2, width: r * 2, height: r * 2, borderRadius: r, backgroundColor: colors.gold }, style]}
    />
  );
}
