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
 * On Android, `blurMethod` is intentionally left at its default (`'none'`)
 * — the real blur methods (`dimezisBlurView`/`...Sdk31Plus`) require a
 * `blurTarget` ref to a `BlurTargetView` wrapping whatever should be
 * blurred, which our floating controls (over arbitrary photos/video, not a
 * single known view) don't have a stable target for. Without it those
 * methods just log a warning and don't blur anyway, so `'none'` — a plain
 * translucent tint — is the honest, warning-free choice here (confirmed
 * against the SDK 57 docs), not a workaround.
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
        intensity={Platform.OS === 'android' ? 0 : intensity}
        tint="dark"
        style={[ABSOLUTE_FILL, { backgroundColor: surface.glassTint }]}
      />
      {children}
    </View>
  );
}
