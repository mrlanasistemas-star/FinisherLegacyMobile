import { useEffect } from 'react';
import { TextInput, type StyleProp, type TextStyle } from 'react-native';
import Animated, { Easing, useAnimatedProps, useDerivedValue, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { colors, fontFamily } from '@/theme/tokens';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

interface AnimatedCounterProps {
  value: number;
  /** Count-up duration in ms. */
  duration?: number;
  style?: StyleProp<TextStyle>;
  /** Thousands separator (es-MX uses ","). */
  separator?: string;
  prefix?: string;
  suffix?: string;
  accessibilityLabel?: string;
}

function formatNumber(n: number, separator: string) {
  'worklet';
  const rounded = Math.round(n);
  const negative = rounded < 0;
  let digits = String(Math.abs(rounded));
  let out = '';
  while (digits.length > 3) {
    out = separator + digits.slice(-3) + out;
    digits = digits.slice(0, -3);
  }
  return (negative ? '-' : '') + digits + out;
}

/**
 * A number that counts up to `value` entirely on the UI thread (animated
 * TextInput `text` prop — no React re-render per frame). Reduce Motion shows
 * the final value immediately; screen readers always get the final value.
 */
export function AnimatedCounter({
  value,
  duration = 900,
  style,
  separator = ',',
  prefix = '',
  suffix = '',
  accessibilityLabel,
}: AnimatedCounterProps) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(reduceMotion ? value : 0);

  useEffect(() => {
    progress.value = reduceMotion ? value : withTiming(value, { duration, easing: Easing.out(Easing.cubic) });
  }, [value, duration, reduceMotion, progress]);

  const text = useDerivedValue(() => `${prefix}${formatNumber(progress.value, separator)}${suffix}`);
  // `text` is not in TextInput's public props type but is the documented
  // Reanimated pattern for UI-thread text updates.
  const animatedProps = useAnimatedProps(() => ({ text: text.value, defaultValue: text.value }) as object);

  const finalText = `${prefix}${formatNumber(value, separator)}${suffix}`;

  return (
    <AnimatedTextInput
      editable={false}
      underlineColorAndroid="transparent"
      defaultValue={finalText}
      animatedProps={animatedProps}
      accessible
      accessibilityLabel={accessibilityLabel ?? finalText}
      pointerEvents="none"
      maxFontSizeMultiplier={1.4}
      style={[{ color: colors.foreground, fontFamily: fontFamily.heading, padding: 0, margin: 0 }, style]}
    />
  );
}
