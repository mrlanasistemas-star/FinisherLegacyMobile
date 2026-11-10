import type { PropsWithChildren } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { PressableScale } from '@/components/motion/pressable-scale';
import { colors, radius, shadows, spacing } from '@/theme/tokens';

interface CardProps extends PropsWithChildren {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /** `dark` = carbon accent block (brand moments); default white card. */
  tone?: 'light' | 'dark';
  accessibilityLabel?: string;
}

export function Card({ children, onPress, style, tone = 'light', accessibilityLabel }: CardProps) {
  const base: ViewStyle = {
    backgroundColor: tone === 'dark' ? colors.black : colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: tone === 'dark' ? colors.graphiteLight : colors.hairline,
    padding: spacing.md,
    ...shadows.soft,
  };

  if (onPress) {
    return (
      <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} style={[base, style]}>
        {children}
      </PressableScale>
    );
  }

  return <View style={[base, style]}>{children}</View>;
}
