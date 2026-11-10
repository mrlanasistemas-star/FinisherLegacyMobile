import type { PropsWithChildren } from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';

import { useResponsive } from '@/hooks/use-responsive';
import { colors, fontFamily, fontSize, tracking } from '@/theme/tokens';

type Variant =
  | 'hero'
  | 'display'
  | 'title'
  | 'subtitle'
  | 'body'
  | 'bodyStrong'
  | 'caption'
  | 'label'
  /** Small uppercase kicker above a heading (Manrope, wide tracking). */
  | 'eyebrow'
  /** Syncopate Bold, uppercase only — brand moments (manual §4.1). Never the logo. */
  | 'brand';
type Tone = 'default' | 'muted' | 'subtle' | 'gold' | 'accent' | 'inverse' | 'onDark' | 'onDarkMuted' | 'destructive' | 'success';

interface AppTextProps extends TextProps, PropsWithChildren {
  variant?: Variant;
  tone?: Tone;
  align?: TextStyle['textAlign'];
}

/** Sizes that shrink slightly on compact phones and grow on tablets — everything else stays fixed. */
const RESPONSIVE_VARIANTS: Variant[] = ['hero', 'display', 'title'];

/** Large display type caps its Dynamic Type growth so layouts never explode; body text scales freely. */
const FONT_SCALE_CAP: Partial<Record<Variant, number>> = { hero: 1.3, display: 1.4, title: 1.5, brand: 1.3 };

const VARIANT_STYLES: Record<Variant, TextStyle> = {
  hero: {
    fontFamily: fontFamily.headingBlack,
    fontSize: fontSize.hero,
    lineHeight: fontSize.hero * 1.04,
    letterSpacing: tracking.tight,
    textTransform: 'uppercase',
  },
  display: { fontFamily: fontFamily.heading, fontSize: fontSize.display, lineHeight: fontSize.display * 1.15, letterSpacing: -0.4 },
  title: { fontFamily: fontFamily.heading, fontSize: fontSize.xxl, lineHeight: fontSize.xxl * 1.2, letterSpacing: -0.3 },
  subtitle: { fontFamily: fontFamily.headingSemibold, fontSize: fontSize.lg, lineHeight: fontSize.lg * 1.3 },
  body: { fontFamily: fontFamily.regular, fontSize: fontSize.md, lineHeight: fontSize.md * 1.5 },
  bodyStrong: { fontFamily: fontFamily.semibold, fontSize: fontSize.md, lineHeight: fontSize.md * 1.45 },
  caption: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, lineHeight: fontSize.sm * 1.45 },
  label: { fontFamily: fontFamily.semibold, fontSize: fontSize.xs, letterSpacing: tracking.wide },
  eyebrow: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    letterSpacing: tracking.wider,
    textTransform: 'uppercase',
  },
  brand: {
    fontFamily: fontFamily.brand,
    fontSize: 12,
    letterSpacing: tracking.wider,
    textTransform: 'uppercase',
  },
};

const TONE_COLORS: Record<Tone, string> = {
  default: colors.foreground,
  muted: colors.muted,
  subtle: colors.subtle,
  // `gold` text on the light product reads through Oro Profundo — Oro Legacy
  // is reserved for fills (it fails contrast as small text on white/bone).
  gold: colors.accent,
  accent: colors.accent,
  inverse: colors.black,
  onDark: colors.onDark,
  onDarkMuted: colors.onDarkMuted,
  destructive: colors.destructive,
  success: colors.success,
};

export function AppText({ variant = 'body', tone, align, style, children, ...rest }: AppTextProps) {
  const { scale } = useResponsive();
  const base = VARIANT_STYLES[variant];
  const responsiveStyle =
    RESPONSIVE_VARIANTS.includes(variant) && typeof base.fontSize === 'number'
      ? { fontSize: scale(base.fontSize), lineHeight: base.lineHeight ? scale(Number(base.lineHeight)) : undefined }
      : null;
  const resolvedTone: Tone = tone ?? (variant === 'eyebrow' ? 'accent' : 'default');

  return (
    <Text
      maxFontSizeMultiplier={FONT_SCALE_CAP[variant]}
      style={[base, responsiveStyle, { color: TONE_COLORS[resolvedTone], textAlign: align }, style]}
      {...rest}>
      {children}
    </Text>
  );
}
