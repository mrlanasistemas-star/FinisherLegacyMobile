import { View, type ViewStyle } from 'react-native';

import { colors } from '@/theme/tokens';

interface GoldGlowProps {
  size?: number;
  intensity?: number;
  style?: ViewStyle;
}

/**
 * Soft radial gold halo — RN has no native radial gradient, so this
 * layers concentric low-opacity circles with a shadow-based blur instead
 * of pulling in a heavier gradient/blur dependency for a purely decorative
 * effect. Absolutely positioned by the caller; this only renders the glow.
 */
export function GoldGlow({ size = 260, intensity = 1, style }: GoldGlowProps) {
  return (
    <View
      pointerEvents="none"
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: `rgba(201,161,89,${0.16 * intensity})`,
          shadowColor: colors.gold,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.55 * intensity,
          shadowRadius: size * 0.35,
          elevation: 0,
        },
        style,
      ]}
    />
  );
}
