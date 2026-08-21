import { BlurView } from 'expo-blur';
import type { PropsWithChildren } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, surface } from '@/theme/tokens';

interface GlassSurfaceProps extends PropsWithChildren {
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  rounded?: boolean;
}

const ABSOLUTE_FILL: ViewStyle = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 };

/**
 * Cross-platform frosted surface for floating controls (back buttons, tab
 * bar, scanner controls). Uses expo-blur's BlurView rather than
 * expo-glass-effect directly — that package only renders its liquid-glass
 * effect on iOS 26+ and silently falls back to a plain unstyled View
 * everywhere else, which would leave Android with no glass look at all.
 *
 * The BlurView sits as an absolutely-positioned sibling BEHIND `children`
 * (not a wrapping layer around them) so this View's size is driven purely
 * by `children`/`style` exactly like a normal View — no flex/absolute
 * trickery for callers to work around, whether they pass explicit
 * dimensions (icon buttons) or just padding (content-sized panels).
 */
export function GlassSurface({ children, style, intensity = 40, rounded = true }: GlassSurfaceProps) {
  return (
    <View
      style={[
        { overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
        rounded && { borderRadius: radius.pill },
        style,
      ]}>
      <BlurView
        intensity={intensity}
        tint="dark"
        blurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
        style={[ABSOLUTE_FILL, { backgroundColor: surface.glassTint }]}
      />
      {children}
    </View>
  );
}
