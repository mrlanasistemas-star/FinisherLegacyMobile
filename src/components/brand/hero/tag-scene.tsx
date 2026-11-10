import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Defs, Image as SvgImage, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import type { Tilt } from './hero-motion';

import { colors, palette } from '@/theme/tokens';

const MONOGRAM = require('@/assets/images/brand/fl-monograma.png');
const CYCLE = 4200;

interface TagSceneProps {
  size: number;
  active: boolean;
  tilt: Tilt;
}

/**
 * "Acércalo": the Finisher Legacy Tag drawn in SVG (≈1:2 vertical card,
 * horizontal slot near the top, black silicone loop, Blanco Hueso face, gold
 * hairline border, official monogram) floating with 3D tilt from the device
 * sensor. A minimal phone slides in; when it's close, NFC ripples expand from
 * the tag and the phone screen lights up. One master timeline on the UI
 * thread drives everything; static composition when inactive.
 */
export function TagScene({ size, active, tilt }: TagSceneProps) {
  const t = useSharedValue(active ? 0 : 0.45);
  const float = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      cancelAnimation(t);
      cancelAnimation(float);
      t.value = 0.45;
      float.value = 0;
      return;
    }
    t.value = 0;
    t.value = withRepeat(withTiming(1, { duration: CYCLE, easing: Easing.linear }), -1, false);
    float.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => {
      cancelAnimation(t);
      cancelAnimation(float);
    };
  }, [active, t, float]);

  const tagW = size * 0.34;
  const tagH = tagW * 2;
  const loopH = tagW * 0.55;
  const phoneW = size * 0.3;
  const phoneH = phoneW * 2.05;

  const tagStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 700 },
      { translateY: interpolate(float.value, [0, 1], [-6, 6]) },
      { rotateX: `${tilt.rx.value}deg` },
      { rotateY: `${tilt.ry.value - 8}deg` },
      { rotateZ: '-6deg' },
    ],
  }));

  // Phone: in (0–0.25), hold near the tag (0.25–0.7), out (0.7–0.9).
  const phoneStyle = useAnimatedStyle(() => {
    const p = interpolate(t.value, [0, 0.25, 0.7, 0.9, 1], [1, 0, 0, 1, 1], Extrapolation.CLAMP);
    return {
      opacity: interpolate(p, [0, 0.8, 1], [1, 1, 0]),
      transform: [{ translateX: p * size * 0.45 }, { rotateZ: `${8 + p * 6}deg` }],
    };
  });
  const screenStyle = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0.28, 0.36, 0.66, 0.74], [0, 1, 1, 0], Extrapolation.CLAMP),
  }));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {[0, 1, 2].map((i) => (
        <Ripple key={i} t={t} index={i} diameter={tagW * 1.6} />
      ))}

      <Animated.View style={[{ width: tagW, height: tagH + loopH, marginRight: size * 0.12 }, tagStyle]}>
        <TagArt width={tagW} height={tagH} loopH={loopH} />
      </Animated.View>

      <Animated.View
        style={[
          {
            position: 'absolute',
            right: size * 0.06,
            top: size * 0.5 - phoneH * 0.55,
            width: phoneW,
            height: phoneH,
            borderRadius: phoneW * 0.18,
            borderWidth: 2,
            borderColor: colors.foreground,
            backgroundColor: colors.card,
            padding: 4,
          },
          phoneStyle,
        ]}>
        <View style={{ alignSelf: 'center', width: phoneW * 0.3, height: 4, borderRadius: 2, backgroundColor: colors.foreground, marginTop: 2 }} />
        <Animated.View
          style={[
            { flex: 1, marginTop: 6, borderRadius: phoneW * 0.12, backgroundColor: colors.goldWash, alignItems: 'center', justifyContent: 'center' },
            screenStyle,
          ]}>
          <View style={{ width: phoneW * 0.32, height: phoneW * 0.32, borderRadius: phoneW * 0.16, backgroundColor: colors.gold, opacity: 0.85 }} />
          <View style={{ width: phoneW * 0.5, height: 3, borderRadius: 2, backgroundColor: colors.accent, marginTop: 8, opacity: 0.6 }} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

function Ripple({ t, index, diameter }: { t: SharedValue<number>; index: number; diameter: number }) {
  const style = useAnimatedStyle(() => {
    const start = 0.28 + index * 0.1;
    const p = interpolate(t.value, [start, start + 0.32], [0, 1], Extrapolation.CLAMP);
    return {
      opacity: p <= 0 || p >= 1 ? 0 : interpolate(p, [0, 0.15, 1], [0, 0.55, 0]),
      transform: [{ scale: 0.6 + p * 0.9 }],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', width: diameter, height: diameter, borderRadius: diameter / 2, borderWidth: 1.5, borderColor: colors.gold }, style]}
    />
  );
}

/** The tag itself — pure SVG, matches the real product silhouette. */
function TagArt({ width, height, loopH }: { width: number; height: number; loopH: number }) {
  const r = width * 0.16;
  const slotW = width * 0.46;
  const slotH = width * 0.09;
  const slotY = loopH + height * 0.08;
  const markW = width * 0.62;
  const markH = markW / (1024 / 462);
  const total = height + loopH;
  return (
    <Svg width={width} height={total}>
      <Defs>
        <LinearGradient id="tag-face" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor={palette.bone} />
        </LinearGradient>
        <LinearGradient id="tag-edge" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={palette.goldLight} />
          <Stop offset="0.5" stopColor={palette.gold} />
          <Stop offset="1" stopColor={palette.goldDeep} />
        </LinearGradient>
        <LinearGradient id="tag-loop" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#2A2A2E" />
          <Stop offset="0.5" stopColor={palette.carbon} />
          <Stop offset="1" stopColor="#2A2A2E" />
        </LinearGradient>
      </Defs>
      {/* Silicone loop: rises from behind the face and threads the slot. */}
      <Path
        d={`M ${width / 2 - slotW * 0.32} ${slotY + slotH / 2} C ${width / 2 - slotW * 0.5} ${loopH * 0.1}, ${width / 2 + slotW * 0.5} ${loopH * 0.1}, ${width / 2 + slotW * 0.32} ${slotY + slotH / 2}`}
        stroke="url(#tag-loop)"
        strokeWidth={width * 0.07}
        strokeLinecap="round"
        fill="none"
      />
      {/* Face with gold hairline border. */}
      <Rect x={1} y={loopH + 1} width={width - 2} height={height - 2} rx={r} fill="url(#tag-face)" stroke="url(#tag-edge)" strokeWidth={1.5} />
      <Rect x={width * 0.07} y={loopH + width * 0.07} width={width * 0.86} height={height - width * 0.14} rx={r * 0.7} fill="none" stroke={palette.gold} strokeOpacity={0.35} strokeWidth={0.75} />
      {/* Slot. */}
      <Rect x={(width - slotW) / 2} y={slotY} width={slotW} height={slotH} rx={slotH / 2} fill={palette.carbon} />
      <SvgImage href={MONOGRAM} x={(width - markW) / 2} y={loopH + height * 0.55 - markH / 2} width={markW} height={markH} preserveAspectRatio="xMidYMid meet" />
    </Svg>
  );
}
