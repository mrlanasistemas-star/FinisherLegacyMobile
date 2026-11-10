import { LinearGradient } from 'expo-linear-gradient';
import type { PropsWithChildren } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { withAlpha } from '@/features/commerce/tag-design';
import { colors, palette } from '@/theme/tokens';

interface TagStageProps extends PropsWithChildren {
  /** Collection accent (hex); tints the glow behind the tag. */
  accent?: string | null;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  /** Hairline border — on for cards, off for full-bleed heroes. */
  bordered?: boolean;
}

/**
 * The soft light "studio" a tag sits on: white → Blanco Hueso with a
 * barely-there accent glow behind the piece. Light product, gold accent.
 */
export function TagStage({ accent, radius = 0, style, bordered = true, children }: TagStageProps) {
  const tint = accent ?? palette.gold;
  return (
    <View
      style={[
        { overflow: 'hidden', borderRadius: radius, borderCurve: 'continuous', backgroundColor: colors.card },
        bordered ? { borderWidth: 1, borderColor: colors.hairline } : null,
        style,
      ]}>
      <LinearGradient
        pointerEvents="none"
        colors={['#FFFFFF', palette.bone, withAlpha(tint, 0.2)]}
        locations={[0, 0.55, 1]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <Svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
        <Defs>
          <RadialGradient id="fl-stage-glow" cx="50%" cy="46%" rx="58%" ry="42%">
            <Stop offset="0" stopColor={tint} stopOpacity={0.22} />
            <Stop offset="1" stopColor={tint} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#fl-stage-glow)" />
      </Svg>
      {children}
    </View>
  );
}
