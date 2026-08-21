import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
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

/** Solid-color variants get a faint top highlight so they read as lit metal, not a flat fill (AGENTS.md §109). */
const HIGHLIGHT_VARIANTS: Variant[] = ['primary', 'destructive'];

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

  if (variant === 'glass') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        disabled={isDisabled}
        onPress={handlePress}
        hitSlop={8}
        style={({ pressed }) => [fullWidth && styles.fullWidth, isDisabled && styles.disabled, pressed && !isDisabled && styles.pressed, style]}>
        <GlassSurface rounded={false} style={{ borderRadius: radius.md }}>
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
      style={({ pressed }) => [
        styles.base,
        VARIANT_STYLE[variant],
        sizeStyle,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}>
      {HIGHLIGHT_VARIANTS.includes(variant) ? (
        <LinearGradient
          colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0)']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '55%', borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md }}
          pointerEvents="none"
        />
      ) : null}
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  md: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    minHeight: 44,
  },
  lg: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minHeight: 52,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
  disabled: {
    opacity: 0.45,
  },
});

const VARIANT_STYLE: Record<Exclude<Variant, 'glass'>, ViewStyle> = {
  primary: { backgroundColor: colors.gold },
  secondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.gold },
  ghost: { backgroundColor: 'transparent' },
  destructive: { backgroundColor: colors.destructive },
};

const TEXT_COLOR: Record<Variant, string> = {
  primary: colors.black,
  secondary: colors.gold,
  ghost: colors.foreground,
  destructive: colors.white,
  glass: colors.foreground,
};
