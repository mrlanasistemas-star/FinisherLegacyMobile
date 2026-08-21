import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { AppText } from './app-text';
import { GlassSurface } from './brand/glass-surface';

import { colors, fontFamily, fontSize, radius, spacing } from '@/theme/tokens';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'glass';
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
const HIGHLIGHT_VARIANTS: Variant[] = ['primary', 'destructive'];
const BUTTON_RADIUS = radius.lg;

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

  function handlePress() {
    if (isDisabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  }

  const content = loading ? (
    <ActivityIndicator color={variant === 'primary' ? colors.black : colors.gold} />
  ) : (
    <AppText variant="bodyStrong" style={{ fontFamily: fontFamily.semibold, fontSize: fontSize.md, color: TEXT_COLOR[variant] }}>
      {label}
    </AppText>
  );

  const sizeStyle = size === 'lg' ? styles.lg : styles.md;
  // Pointer devices only (tablet trackpad, Expo Web) — onHoverIn/Out never
  // fire from a touch press, so this is purely additive (AGENTS.md §110/§202).
  const hoverHandlers = { onHoverIn: () => setHovered(true), onHoverOut: () => setHovered(false) };

  if (variant === 'glass') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        disabled={isDisabled}
        onPress={handlePress}
        hitSlop={8}
        {...hoverHandlers}
        style={({ pressed }) => [fullWidth && styles.fullWidth, isDisabled && styles.disabled, pressed && !isDisabled && styles.pressed, style]}>
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
      hitSlop={8}
      {...hoverHandlers}
      style={({ pressed }) => [
        styles.base,
        VARIANT_STYLE[variant],
        variant === 'primary' && !isDisabled && styles.primaryGlow,
        sizeStyle,
        fullWidth && styles.fullWidth,
        hovered && !isDisabled && !pressed && HOVER_STYLE[variant],
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}>
      {HIGHLIGHT_VARIANTS.includes(variant) && !isDisabled ? (
        <LinearGradient
          colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '55%', borderTopLeftRadius: BUTTON_RADIUS, borderTopRightRadius: BUTTON_RADIUS }}
          pointerEvents="none"
        />
      ) : null}
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: BUTTON_RADIUS,
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
  fullWidth: {
    alignSelf: 'stretch',
  },
  primaryGlow: {
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    // Kept deliberately low: Android's `elevation` promotes the view to its
    // own compositing layer with real shadow casting — at high values (was
    // 8) that layer visually painted over closely-spaced siblings below it
    // (a button's own border showing through where the next control's text
    // should be). A small elevation still reads as "lifted" without eating
    // neighboring content.
    elevation: 2,
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
  primary: { backgroundColor: colors.gold },
  secondary: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.gold },
  ghost: { backgroundColor: 'transparent' },
  destructive: { backgroundColor: colors.destructive },
};

const HOVER_STYLE: Record<Exclude<Variant, 'glass'>, ViewStyle> = {
  primary: { transform: [{ translateY: -1 }] },
  secondary: { backgroundColor: 'rgba(201,161,89,0.1)', borderColor: colors.goldSoft },
  ghost: { backgroundColor: 'rgba(245,245,245,0.06)' },
  destructive: { transform: [{ translateY: -1 }] },
};

const TEXT_COLOR: Record<Variant, string> = {
  primary: colors.black,
  secondary: colors.gold,
  ghost: colors.foreground,
  destructive: colors.white,
  glass: colors.foreground,
};
