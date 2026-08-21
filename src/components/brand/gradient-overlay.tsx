import { LinearGradient } from 'expo-linear-gradient';
import type { ViewStyle } from 'react-native';

import { gradientLocations, gradients } from '@/theme/gradients';

const ABSOLUTE_FILL: ViewStyle = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 };

interface GradientOverlayProps {
  variant?: 'bottom' | 'full' | 'top';
}

/** Scrim over hero media so overlaid type always stays legible (AGENTS.md §16). */
export function GradientOverlay({ variant = 'bottom' }: GradientOverlayProps) {
  if (variant === 'top') {
    return <LinearGradient colors={gradients.topFade} style={[ABSOLUTE_FILL, { height: '30%' }]} pointerEvents="none" />;
  }
  if (variant === 'full') {
    return <LinearGradient colors={gradients.heroFull} style={ABSOLUTE_FILL} pointerEvents="none" />;
  }
  return (
    <LinearGradient
      colors={gradients.heroBottom}
      locations={gradientLocations.heroBottom}
      style={ABSOLUTE_FILL}
      pointerEvents="none"
    />
  );
}
