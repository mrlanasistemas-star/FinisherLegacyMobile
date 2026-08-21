import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { ArrowRight } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { AppText } from './app-text';
import { GlassSurface } from './brand/glass-surface';

import { colors, fontFamily, fontSize, radius, spacing, tracking } from '@/theme/tokens';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'glass' | 'legacy';
type Size = 'md' | 'lg';

interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

/** Solid-color variants get a faint top highlight so they read as lit metal, not a flat fill (AGENTS.md §109/§196). */
const HIGHLIGHT_VARIANTS: Variant[] = ['destructive'];
const BUTTON_RADIUS = radius.lg;
/** True capsule/pill (AGENTS.md §220): `radius.pill` always clamps to exactly
 * half the button's rendered height, so it stays a perfect stadium shape at
 * any size instead of a rounded rectangle. */
const LEGACY_RADIUS = radius.pill;

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  loading = false,
  disabled = false,
  fullWidth = true,
  style,
}: AppButtonProps) {
  const isDisabled = disabled || loading;
  const [hovered, setHovered] = useState(false);
  const isLegacy = variant === 'legacy';
  // `primary` renders through the same gradient-fill branch as `legacy` —
  // both are solid gold CTAs and both need the same insurance against a flat
  // `backgroundColor` rendering as a flat gray/dark surface.
  const isGoldFill = isLegacy || variant === 'primary';
  // Arrow travels 4px on press/hover — a directional cue, not a bounce
  // (AGENTS.md §221). Declared unconditionally; only driven for `legacy`.
  const arrowX = useSharedValue(0);
  const arrowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: arrowX.value }] }));

  function handlePress() {
    if (isDisabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  }

  function handlePressIn() {
    // eslint-disable-next-line react-hooks/immutability -- Reanimated shared value mutation is the documented API (not React state)
    if (isLegacy && !isDisabled) arrowX.value = withTiming(4, { duration: 100 });
  }

  function handlePressOut() {
    // eslint-disable-next-line react-hooks/immutability -- Reanimated shared value mutation is the documented API (not React state)
    if (isLegacy && !isDisabled) arrowX.value = withTiming(hovered ? 4 : 0, { duration: 150 });
  }

  const buttonRadius = isLegacy ? LEGACY_RADIUS : BUTTON_RADIUS;
  const textColor = TEXT_COLOR[variant];

  const content = loading ? (
    <ActivityIndicator color={variant === 'primary' || isLegacy ? colors.black : colors.gold} />
  ) : isLegacy ? (
    <>
      <AppText
        variant="bodyStrong"
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.88}
        style={{
          fontFamily: fontFamily.bold,
          fontSize: fontSize.md,
          letterSpacing: tracking.normal,
          color: textColor,
          flexShrink: 1,
        }}>
        {label}
      </AppText>
      <Animated.View style={[arrowStyle, { flexShrink: 0 }]}>
        <ArrowRight size={20} color={textColor} strokeWidth={2.5} />
      </Animated.View>
    </>
  ) : (
    <AppText variant="bodyStrong" style={{ fontFamily: fontFamily.semibold, fontSize: fontSize.md, color: textColor }}>
      {label}
    </AppText>
  );

  const sizeStyle = isLegacy ? styles.legacy : size === 'lg' ? styles.lg : styles.md;
  // Pointer devices only (tablet trackpad, Expo Web) — onHoverIn/Out never
  // fire from a touch press, so this is purely additive (AGENTS.md §110/§202).
  const hoverHandlers = {
    onHoverIn: () => {
      setHovered(true);
      // eslint-disable-next-line react-hooks/immutability -- Reanimated shared value mutation is the documented API (not React state)
      if (isLegacy && !isDisabled) arrowX.value = withTiming(4, { duration: 180 });
    },
    onHoverOut: () => {
      setHovered(false);
      // eslint-disable-next-line react-hooks/immutability -- Reanimated shared value mutation is the documented API (not React state)
      if (isLegacy && !isDisabled) arrowX.value = withTiming(0, { duration: 200 });
    },
  };

  if (isGoldFill) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        disabled={isDisabled}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        hitSlop={8}
        {...hoverHandlers}
        style={({ pressed }) => [
          { borderRadius: buttonRadius },
          fullWidth && styles.fullWidth,
          !disabled && styles.goldGlow,
          hovered && !isDisabled && !pressed && HOVER_STYLE[variant],
          pressed && !isDisabled && styles.pressed,
          disabled && styles.disabled,
          style,
        ]}>
        {/* Real two-stop gradient fill, not a flat color: makes the gold
            impossible to mistake for a flat gray/dark surface, and directly
            delivers the "gold blended with another tone" look requested. */}
        <LinearGradient
          colors={[colors.goldSoft, colors.gold]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.base, isLegacy && styles.legacyContent, sizeStyle, { borderRadius: buttonRadius, overflow: 'hidden' }]}>
          <LinearGradient
            colors={['rgba(255,255,255,0.32)', 'rgba(255,255,255,0)']}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '55%' }}
            pointerEvents="none"
          />
          {content}
        </LinearGradient>
      </Pressable>
    );
  }

  if (variant === 'glass') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        disabled={isDisabled}
        onPress={handlePress}
        hitSlop={8}
        {...hoverHandlers}
        style={({ pressed }) => [fullWidth && styles.fullWidth, disabled && styles.disabled, pressed && !isDisabled && styles.pressed, style]}>
        <GlassSurface rounded={false} style={[{ borderRadius: BUTTON_RADIUS }, hovered && !isDisabled && styles.glassHovered]}>
          <View style={[styles.base, sizeStyle]}>{content}</View>
        </GlassSurface>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      hitSlop={8}
      {...hoverHandlers}
      style={({ pressed }) => [
        styles.base,
        { borderRadius: buttonRadius },
        VARIANT_STYLE[variant],
        sizeStyle,
        fullWidth && styles.fullWidth,
        hovered && !isDisabled && !pressed && HOVER_STYLE[variant],
        pressed && !isDisabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}>
      {HIGHLIGHT_VARIANTS.includes(variant) && !disabled ? (
        <LinearGradient
          colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '55%', borderTopLeftRadius: buttonRadius, borderTopRightRadius: buttonRadius }}
          pointerEvents="none"
        />
      ) : null}
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  md: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    minHeight: 46,
  },
  lg: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minHeight: 56,
  },
  legacy: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 60,
  },
  legacyContent: {
    // Grouped as one centered unit (label + arrow together), not spread to
    // the two edges — `space-between` with a single child (the loading
    // spinner) collapsed to the left edge instead of centering, and with
    // both children it read as the label jammed against the left border.
    justifyContent: 'center',
    gap: spacing.sm,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  goldGlow: {
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    // 0, not a small positive value: Android's elevation shadow ignores
    // shadowColor and always renders as a flat grey/black halo — against
    // the pure-black app background that halo read as a dirty smudge around
    // the gold shape. The gold glow only needs to exist on iOS, where
    // shadowColor is actually honored.
    elevation: 0,
  },
  glassHovered: {
    borderColor: colors.goldDim,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }, { translateY: 1 }],
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 1,
  },
  disabled: {
    opacity: 0.5,
  },
});

const VARIANT_STYLE: Record<Exclude<Variant, 'glass'>, ViewStyle> = {
  // Unused: `primary` and `legacy` render their own gradient fill in a
  // dedicated branch above (kept here only so this record stays exhaustive).
  primary: { backgroundColor: colors.gold },
  secondary: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.gold },
  ghost: { backgroundColor: 'transparent' },
  destructive: { backgroundColor: colors.destructive },
  legacy: { backgroundColor: colors.gold },
};

const HOVER_STYLE: Record<Exclude<Variant, 'glass'>, ViewStyle> = {
  primary: { transform: [{ translateY: -1 }] },
  secondary: { backgroundColor: 'rgba(201,161,89,0.1)', borderColor: colors.goldSoft },
  ghost: { backgroundColor: 'rgba(245,245,245,0.06)' },
  destructive: { transform: [{ translateY: -1 }] },
  legacy: { transform: [{ translateY: -1 }] },
};

const TEXT_COLOR: Record<Variant, string> = {
  primary: colors.black,
  secondary: colors.gold,
  ghost: colors.foreground,
  destructive: colors.white,
  glass: colors.foreground,
  legacy: colors.black,
};
