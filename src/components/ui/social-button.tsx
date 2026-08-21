import type { ReactNode } from 'react';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/app-text';

import { colors, radius, spacing } from '@/theme/tokens';

interface SocialButtonProps {
  label: string;
  icon: ReactNode;
  onPress: () => void;
  disabled?: boolean;
}

/**
 * Google's dark-theme button guidelines (white/tinted logo mark on a dark
 * neutral surface) — kept visually distinct from our gold CTAs so it never
 * competes with the primary action (AGENTS.md §82/§198).
 */
export function SocialButton({ label, icon, onPress, disabled }: SocialButtonProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        minHeight: 54,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: hovered && !disabled ? colors.goldDim : colors.border,
        backgroundColor: hovered && !disabled ? colors.graphiteLight : colors.graphite,
        opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        transform: [{ scale: pressed ? 0.985 : 1 }],
      })}>
      <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>{icon}</View>
      <AppText variant="bodyStrong">{label}</AppText>
    </Pressable>
  );
}
