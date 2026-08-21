import type { PropsWithChildren } from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';

import { colors, fontFamily, fontSize } from '@/theme/tokens';

type Variant = 'display' | 'title' | 'subtitle' | 'body' | 'bodyStrong' | 'caption' | 'label';
type Tone = 'default' | 'muted' | 'gold' | 'inverse' | 'destructive';

interface AppTextProps extends TextProps, PropsWithChildren {
  variant?: Variant;
  tone?: Tone;
  align?: TextStyle['textAlign'];
}

const VARIANT_STYLES: Record<Variant, TextStyle> = {
  display: { fontFamily: fontFamily.bold, fontSize: fontSize.display, lineHeight: fontSize.display * 1.15 },
  title: { fontFamily: fontFamily.bold, fontSize: fontSize.xxl, lineHeight: fontSize.xxl * 1.2 },
  subtitle: { fontFamily: fontFamily.semibold, fontSize: fontSize.lg, lineHeight: fontSize.lg * 1.3 },
  body: { fontFamily: fontFamily.regular, fontSize: fontSize.md, lineHeight: fontSize.md * 1.4 },
  bodyStrong: { fontFamily: fontFamily.medium, fontSize: fontSize.md, lineHeight: fontSize.md * 1.4 },
  caption: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, lineHeight: fontSize.sm * 1.4 },
  label: { fontFamily: fontFamily.semibold, fontSize: fontSize.xs, letterSpacing: 0.4 },
};

const TONE_COLORS: Record<Tone, string> = {
  default: colors.foreground,
  muted: colors.muted,
  gold: colors.gold,
  inverse: colors.black,
  destructive: colors.destructive,
};

export function AppText({ variant = 'body', tone = 'default', align, style, children, ...rest }: AppTextProps) {
  return (
    <Text
      style={[VARIANT_STYLES[variant], { color: TONE_COLORS[tone], textAlign: align }, style]}
      {...rest}>
      {children}
    </Text>
  );
}
