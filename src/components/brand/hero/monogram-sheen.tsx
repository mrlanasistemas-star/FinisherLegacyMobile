import { useEffect } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Image as SvgImage, LinearGradient, Mask, Rect, Stop } from 'react-native-svg';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

const MONOGRAM = require('@/assets/images/brand/fl-monograma.png');
/** fl-monograma.png is 1024×462. */
export const MONOGRAM_RATIO = 1024 / 462;

interface MonogramSheenProps {
  /** Rendered width; height follows the artwork ratio. */
  width: number;
  /** Run the entrance + periodic sheen (false = static artwork). */
  active: boolean;
  /** Pause between sweeps (ms). */
  interval?: number;
  /** Spring the mark in (scale + fade) on mount. */
  entrance?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * The official FL monogram (original artwork, untouched) with a diagonal
 * light sheen sweeping across it every few seconds. The sheen is an SVG
 * gradient rect clipped by a luminance mask made from the artwork itself, so
 * light only travels over the gold strokes — never over transparent pixels
 * and never as a glow around the logo. Runs on the UI thread.
 */
export function MonogramSheen({ width, active, interval = 3600, entrance = true, style }: MonogramSheenProps) {
  const height = Math.round(width / MONOGRAM_RATIO);
  const band = width * 0.45;
  const x = useSharedValue(-band);
  const appear = useSharedValue(entrance && active ? 0 : 1);

  useEffect(() => {
    if (!active) {
      cancelAnimation(x);
      x.value = -band;
      appear.value = 1;
      return;
    }
    if (entrance) appear.value = withSpring(1, { damping: 16, stiffness: 120, mass: 0.9 });
    x.value = -band;
    x.value = withDelay(
      entrance ? 700 : 300,
      withRepeat(
        withSequence(withTiming(width + band, { duration: 1300, easing: Easing.inOut(Easing.cubic) }), withDelay(interval, withTiming(-band, { duration: 0 }))),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(x);
  }, [active, band, width, interval, entrance, x, appear]);

  const sheenProps = useAnimatedProps(() => ({ x: x.value }));
  const entranceStyle = useAnimatedStyle(() => ({
    opacity: appear.value,
    transform: [{ scale: 0.86 + appear.value * 0.14 }],
  }));

  return (
    <Animated.View style={[{ width, height }, entranceStyle, style]} accessible accessibilityRole="image" accessibilityLabel="Finisher Legacy">
      <View pointerEvents="none">
        <Svg width={width} height={height}>
          <Defs>
            <Mask id="fl-mask" x="0" y="0" width={width} height={height} maskUnits="userSpaceOnUse">
              <SvgImage href={MONOGRAM} x="0" y="0" width={width} height={height} preserveAspectRatio="xMidYMid meet" />
            </Mask>
            <LinearGradient id="fl-sheen" x1="0" y1="0" x2="1" y2="0.35">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
              <Stop offset="0.5" stopColor="#FFF8EC" stopOpacity="0.85" />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <SvgImage href={MONOGRAM} x="0" y="0" width={width} height={height} preserveAspectRatio="xMidYMid meet" />
          {active ? <AnimatedRect animatedProps={sheenProps} y="0" width={band} height={height} fill="url(#fl-sheen)" mask="url(#fl-mask)" /> : null}
        </Svg>
      </View>
    </Animated.View>
  );
}
