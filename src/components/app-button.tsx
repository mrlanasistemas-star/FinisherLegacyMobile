import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, type LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { AppText } from './app-text';
import { GlassSurface } from './brand/glass-surface';
import { PressableScale } from './motion/pressable-scale';

import { gradients } from '@/theme/gradients';
import { colors, fontFamily, fontSize, spacing, springs } from '@/theme/tokens';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'glass' | 'legacy';
type Size = 'sm' | 'md' | 'lg';

interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Optional leading icon (non-legacy variants). */
  icon?: LucideIcon;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** Light haptic on press — on by default; turn off for high-frequency buttons. */
  haptic?: boolean;
}

/**
 * Brand buttons (manual "Carbono + Oro"):
 * - `primary`  — Negro Carbono pill, bone label. The everyday CTA.
 * - `legacy`   — Oro gradient pill + carbon label + travelling arrow. Brand
 *                moments only (activate, claim, checkout) — gold stays rare.
 * - `secondary`— soft warm fill (iOS tinted button).
 * - `ghost`    — text button; `glass` — frosted, for use over media.
 * - `destructive` — solid red.
 * All share the spring press scale + haptic from PressableScale.
 */
export function AppButton({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  loading = false,
  disabled = false,
  fullWidth = true,
  style,
  icon: Icon,
  accessibilityLabel,
  accessibilityHint,
  haptic = true,
}: AppButtonProps) {
  const isDisabled = disabled || loading;
  const isLegacy = variant === 'legacy';
  const reduceMotion = useReducedMotion();
  // Arrow travels 4px on press/hover — a directional cue, not a bounce.
  const arrowX = useSharedValue(0);
  const arrowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: arrowX.value }] }));

  function nudgeArrow(to: number) {
    if (!isLegacy || isDisabled || reduceMotion) return;
    // eslint-disable-next-line react-hooks/immutability -- Reanimated shared value write (UI thread), not React state
    arrowX.value = to === 0 ? withTiming(0, { duration: 180 }) : withSpring(to, springs.snappy);
  }

  const textColor = TEXT_COLOR[variant];
  const labelSize = size === 'lg' ? fontSize.md : fontSize.sm + 1;

  const content = loading ? (
    <ActivityIndicator color={textColor} />
  ) : (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs }}>
      {Icon && !isLegacy ? <Icon size={size === 'sm' ? 16 : 18} color={textColor} strokeWidth={2.2} /> : null}
      <AppText
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
        maxFontSizeMultiplier={1.3}
        style={{ fontFamily: fontFamily.semibold, fontSize: labelSize, letterSpacing: 0, color: textColor, flexShrink: 1 }}>
        {label}
      </AppText>
      {isLegacy ? (
        <Animated.View style={[arrowStyle, { flexShrink: 0 }]}>
          <ArrowRight size={19} color={textColor} strokeWidth={2.5} />
        </Animated.View>
      ) : null}
    </View>
  );

  const sizeStyle = size === 'lg' || isLegacy ? styles.lg : size === 'sm' ? styles.sm : styles.md;

  let body;
  if (isLegacy) {
    body = (
      <LinearGradient colors={gradients.gold} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.base, sizeStyle, styles.pill]}>
        <LinearGradient
          colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0)']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '55%' }}
          pointerEvents="none"
        />
        {content}
      </LinearGradient>
    );
  } else if (variant === 'glass') {
    body = (
      <GlassSurface rounded={false} style={[styles.base, sizeStyle, styles.pill]}>
        {content}
      </GlassSurface>
    );
  } else {
    body = <View style={[styles.base, sizeStyle, styles.pill, VARIANT_STYLE[variant]]}>{content}</View>;
  }

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      onPressIn={() => nudgeArrow(4)}
      onPressOut={() => nudgeArrow(0)}
      onHoverIn={() => nudgeArrow(4)}
      onHoverOut={() => nudgeArrow(0)}
      haptic={haptic ? 'light' : 'none'}
      scaleTo={size === 'sm' ? 0.95 : 0.97}
      hitSlop={8}
      style={[
        fullWidth ? styles.fullWidth : styles.inline,
        (isLegacy || variant === 'primary') && !isDisabled ? (isLegacy ? styles.goldShadow : styles.carbonShadow) : null,
        isDisabled && !loading && styles.disabled,
        style,
      ]}>
      {body}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  pill: {
    // iOS-style continuous rounded rect (12–16pt), not a chunky capsule.
    borderRadius: 14,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  sm: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    minHeight: 34,
  },
  md: {
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  lg: {
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    minHeight: 50,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  inline: {
    alignSelf: 'flex-start',
  },
  carbonShadow: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    // 0 on Android: elevation ignores shadowColor and paints a grey halo.
    elevation: 0,
  },
  goldShadow: {
    shadowColor: colors.goldDim,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 0,
  },
  disabled: {
    opacity: 0.45,
  },
});

const VARIANT_STYLE: Record<Exclude<Variant, 'glass' | 'legacy'>, ViewStyle> = {
  primary: { backgroundColor: colors.black },
  secondary: { backgroundColor: colors.surfaceMuted },
  ghost: { backgroundColor: 'transparent' },
  destructive: { backgroundColor: colors.destructive },
};

const TEXT_COLOR: Record<Variant, string> = {
  primary: colors.onDark,
  secondary: colors.foreground,
  ghost: colors.accent,
  destructive: colors.white,
  glass: colors.foreground,
  legacy: colors.onGold,
};
