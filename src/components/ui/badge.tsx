import { View, type ViewStyle } from 'react-native';

import { AppText } from '@/components/app-text';

import { colors, radius, spacing } from '@/theme/tokens';

type BadgeVariant = 'neutral' | 'gold' | 'success' | 'warning' | 'destructive';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

const VARIANT_STYLE: Record<BadgeVariant, { bg: string; border: string; text: string }> = {
  neutral: { bg: colors.graphiteLight, border: colors.border, text: colors.foreground },
  gold: { bg: 'rgba(201,161,89,0.12)', border: colors.goldDim, text: colors.gold },
  success: { bg: 'rgba(79,174,125,0.14)', border: colors.success, text: colors.success },
  warning: { bg: 'rgba(201,161,89,0.12)', border: colors.goldDim, text: colors.goldSoft },
  destructive: { bg: 'rgba(229,71,63,0.14)', border: colors.destructive, text: colors.destructive },
};

/** Discrete status label — always tied to real state/data, never decorative gamification (AGENTS.md §138/§171). */
export function Badge({ label, variant = 'neutral', style }: BadgeProps) {
  const tone = VARIANT_STYLE[variant];
  return (
    <View
      style={[
        {
          alignSelf: 'flex-start',
          backgroundColor: tone.bg,
          borderWidth: 1,
          borderColor: tone.border,
          borderRadius: radius.pill,
          paddingHorizontal: spacing.sm,
          paddingVertical: 3,
        },
        style,
      ]}>
      <AppText variant="label" style={{ color: tone.text }}>
        {label}
      </AppText>
    </View>
  );
}
