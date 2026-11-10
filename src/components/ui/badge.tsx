import { View, type ViewStyle } from 'react-native';

import { AppText } from '@/components/app-text';

import { colors, radius, spacing } from '@/theme/tokens';

type BadgeVariant = 'neutral' | 'gold' | 'success' | 'warning' | 'destructive';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

const VARIANT_STYLE: Record<BadgeVariant, { bg: string; text: string }> = {
  neutral: { bg: colors.surfaceMuted, text: colors.muted },
  gold: { bg: colors.goldWash, text: colors.accent },
  success: { bg: colors.successWash, text: colors.success },
  warning: { bg: colors.goldWash, text: colors.accent },
  destructive: { bg: colors.destructiveWash, text: colors.destructive },
};

/** Discrete status label — always tied to real state/data, never decorative gamification. */
export function Badge({ label, variant = 'neutral', style }: BadgeProps) {
  const tone = VARIANT_STYLE[variant];
  return (
    <View
      style={[
        {
          alignSelf: 'flex-start',
          backgroundColor: tone.bg,
          borderRadius: radius.pill,
          paddingHorizontal: spacing.sm - 2,
          paddingVertical: 3,
        },
        style,
      ]}>
      <AppText variant="label" maxFontSizeMultiplier={1.3} style={{ color: tone.text, letterSpacing: 0.4 }}>
        {label}
      </AppText>
    </View>
  );
}
