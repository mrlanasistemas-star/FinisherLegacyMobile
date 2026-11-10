import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

import type { TrainingIcon } from '@/schemas/training';
import { colors } from '@/theme/tokens';

import { SenderAvatar } from './message-visuals';

/**
 * The full player's artwork: the sender's avatar inside a thin gold progress
 * ring, with soft gold rings that breathe outward while the message plays
 * (still when paused, and fully static with Reduce Motion). Everything runs
 * on the UI thread.
 */

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface PlayerArtworkProps {
  name: string;
  icon: TrainingIcon;
  playing: boolean;
  /** 0..1 */
  progress: number;
  size: number;
}

export function PlayerArtwork({ name, icon, playing, progress, size }: PlayerArtworkProps) {
  const reduceMotion = useReducedMotion();
  const animatedProgress = useSharedValue(progress);
  const pulse = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = reduceMotion ? progress : withTiming(progress, { duration: 260, easing: Easing.linear });
  }, [progress, animatedProgress, reduceMotion]);

  useEffect(() => {
    if (reduceMotion || !playing) {
      cancelAnimation(pulse);
      pulse.value = withTiming(0, { duration: 400 });
      return;
    }
    pulse.value = 0;
    pulse.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.out(Easing.quad) }), -1, false);
    return () => cancelAnimation(pulse);
  }, [playing, reduceMotion, pulse]);

  const ring = size * 0.78;
  const stroke = 3;
  const r = (ring - stroke) / 2;
  const circumference = 2 * Math.PI * r;

  const progressProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - Math.min(1, Math.max(0, animatedProgress.value))),
  }));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {[0, 1, 2].map((i) => (
        <PulseRing key={i} pulse={pulse} index={i} base={ring} max={size} still={reduceMotion || !playing} />
      ))}
      <View style={{ width: ring, height: ring, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={ring} height={ring} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
          <Defs>
            <SvgGradient id="flGold" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={colors.goldSoft} />
              <Stop offset="0.5" stopColor={colors.gold} />
              <Stop offset="1" stopColor={colors.goldDim} />
            </SvgGradient>
          </Defs>
          <Circle cx={ring / 2} cy={ring / 2} r={r} stroke={colors.surfaceMuted} strokeWidth={stroke} fill="none" />
          <AnimatedCircle
            cx={ring / 2}
            cy={ring / 2}
            r={r}
            stroke="url(#flGold)"
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            animatedProps={progressProps}
          />
        </Svg>
        <View
          style={{
            width: ring - 22,
            height: ring - 22,
            borderRadius: (ring - 22) / 2,
            backgroundColor: colors.card,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#2B2418',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.12,
            shadowRadius: 24,
            elevation: 3,
          }}>
          <SenderAvatar name={name} icon={icon} size={(ring - 22) * 0.62} highlight />
        </View>
      </View>
    </View>
  );
}

function PulseRing({ pulse, index, base, max, still }: { pulse: SharedValue<number>; index: number; base: number; max: number; still: boolean }) {
  const offset = index / 3;
  const style = useAnimatedStyle(() => {
    // Each ring is a phase-shifted copy of the same loop.
    const t = (pulse.value + offset) % 1;
    const scale = still ? 1 + index * 0.07 : interpolate(t, [0, 1], [1, max / base]);
    const opacity = still ? 0.18 - index * 0.04 : interpolate(t, [0, 0.15, 1], [0, 0.35, 0]);
    return { opacity, transform: [{ scale }] };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', width: base, height: base, borderRadius: base / 2, borderWidth: 1.5, borderColor: colors.gold }, style]}
    />
  );
}

