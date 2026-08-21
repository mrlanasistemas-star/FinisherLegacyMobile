import type { PropsWithChildren } from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';

import { useResponsive } from '@/hooks/use-responsive';
import { colors, fontFamily, fontSize, tracking } from '@/theme/tokens';

type Variant = 'hero' | 'display' | 'title' | 'subtitle' | 'body' | 'bodyStrong' | 'caption' | 'label';
type Tone = 'default' | 'muted' | 'gold' | 'inverse' | 'destructive';

interface AppTextProps extends TextProps, PropsWithChildren {
  variant?: Variant;
  tone?: Tone;
  align?: TextStyle['textAlign'];
}

/** Sizes that shrink slightly on compact phones and grow on tablets (AGENTS.md §56/§57) — everything else stays fixed. */
const RESPONSIVE_VARIANTS: Variant[] = ['hero', 'display', 'title'];

const VARIANT_STYLES: Record<Variant, TextStyle> = {
  hero: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.hero,
    lineHeight: fontSize.hero * 1.02,
    letterSpacing: tracking.tight,
    textTransform: 'uppercase',
  },
  display: { fontFamily: fontFamily.bold, fontSize: fontSize.display, lineHeight: fontSize.display * 1.15 },
  title: { fontFamily: fontFamily.bold, fontSize: fontSize.xxl, lineHeight: fontSize.xxl * 1.2 },
  subtitle: { fontFamily: fontFamily.semibold, fontSize: fontSize.lg, lineHeight: fontSize.lg * 1.3 },
  body: { fontFamily: fontFamily.regular, fontSize: fontSize.md, lineHeight: fontSize.md * 1.4 },
  bodyStrong: { fontFamily: fontFamily.medium, fontSize: fontSize.md, lineHeight: fontSize.md * 1.4 },
  caption: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, lineHeight: fontSize.sm * 1.4 },
  label: { fontFamily: fontFamily.semibold, fontSize: fontSize.xs, letterSpacing: tracking.wide },
};

const TONE_COLORS: Record<Tone, string> = {
  default: colors.foreground,
  muted: colors.muted,
  gold: colors.gold,
  inverse: colors.black,
  destructive: colors.destructive,
};

export function AppText({ variant = 'body', tone = 'default', align, style, children, ...rest }: AppTextProps) {
  const { scale } = useResponsive();
  const base = VARIANT_STYLES[variant];
  const responsiveStyle = RESPONSIVE_VARIANTS.includes(variant) && typeof base.fontSize === 'number'
    ? { fontSize: scale(base.fontSize), lineHeight: base.lineHeight ? scale(Number(base.lineHeight)) : undefined }
    : null;

  return (
    <Text style={[base, responsiveStyle, { color: TONE_COLORS[tone], textAlign: align }, style]} {...rest}>
      {children}
    </Text>
  );
}
