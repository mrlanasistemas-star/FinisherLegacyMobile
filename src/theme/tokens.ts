/**
 * Finisher Legacy design tokens — aligned to the Manual de Identidad 2026
 * (MAKE IT LAST). The product is LIGHT end to end (Blanco Hueso canvas, white
 * cards) with elegant dark accents (Negro Carbono / Grafito) and discreet
 * gold. Gold is an accent, never a base color, and gold *text* on a light
 * surface always uses `accent` (Oro Profundo) so it stays legible.
 */

/** Raw brand palette (manual §5.2). Screens use the semantic `colors.*`. */
export const palette = {
  carbon: '#0B0B0C',
  graphite: '#1E1E21',
  gold: '#C9AE8B',
  goldLight: '#E6D1B5',
  goldDeep: '#8C7454',
  bone: '#F8F7F3',
  white: '#FFFFFF',
} as const;

export const colors = {
  // ── Brand raw (dark accents, on-gold ink) ────────────────────────────────
  /** Negro Carbono — ink on gold, dark accent blocks, media backdrops. */
  black: palette.carbon,
  /** Grafito — secondary dark accent surface. */
  graphite: palette.graphite,
  /** Lifted graphite for borders/fills *inside* dark accent blocks. */
  graphiteLight: '#2A2A2E',
  /** Oro Legacy — fills, rings, indicators. Not for small text on light. */
  gold: palette.gold,
  /** Oro Claro — highlight end of the gold gradient; gold text on dark. */
  goldSoft: palette.goldLight,
  /** Oro Profundo — shadow end of the gold gradient. */
  goldDim: palette.goldDeep,
  white: palette.white,

  // ── Semantic (light product) ─────────────────────────────────────────────
  /** Blanco Hueso — app canvas. */
  background: palette.bone,
  /** Primary text / icons. */
  foreground: palette.carbon,
  /** Cards, sheets, inputs. */
  card: palette.white,
  /** Quiet warm fill for chips, skeletons, placeholders (never cold grey). */
  surfaceMuted: '#EFECE5',
  /** Gold text/icons on light surfaces (Oro Profundo, ~4.5:1 on white). */
  accent: palette.goldDeep,
  /** Ink placed on top of gold fills. */
  onGold: palette.carbon,
  /** Text on dark accent blocks / media. */
  onDark: palette.bone,
  onDarkMuted: 'rgba(248,247,243,0.72)',
  border: '#E3DED4',
  /** Hairline dividers between rows — quieter than `border`. */
  hairline: '#ECE8E0',
  muted: '#5E5B55',
  /** Tertiary text that still passes 4.5:1 on white. */
  subtle: '#6F6B63',
  input: palette.white,
  inputBorder: '#DCD6CB',
  destructive: '#C2362E',
  success: '#2F7D55',
  goldWash: 'rgba(201,174,139,0.16)',
  destructiveWash: 'rgba(194,54,46,0.08)',
  successWash: 'rgba(47,125,85,0.10)',
  /** Modal / sheet backdrop. */
  backdrop: 'rgba(11,11,12,0.45)',
} as const;

/** Form controls — one place for the input rhythm. */
export const control = {
  height: 52,
  compactHeight: 44,
  radius: 14,
  paddingX: 16,
  fontSize: 16,
  labelSize: 13,
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

/**
 * Manual §4: Manrope for UI/body, Montserrat for headings, Syncopate Bold
 * (uppercase only) for brand moments. The FL monogram and MAKE IT LAST are
 * drawn artwork (assets/images/brand) — never typed with these fonts.
 */
export const fontFamily = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  heading: 'Montserrat_700Bold',
  headingSemibold: 'Montserrat_600SemiBold',
  headingBlack: 'Montserrat_800ExtraBold',
  brand: 'Syncopate_700Bold',
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  display: 32,
  /** Editorial hero headline — scales down on compact widths via useResponsive(). */
  hero: 44,
  /** Big decorative/real numerals (Legacy stats, medal metrics). */
  metric: 64,
} as const;

/** Wide letter-spacing for small uppercase labels (eyebrows, tags, "LEGACY ID"). */
export const tracking = {
  tight: -0.5,
  normal: 0,
  wide: 1.2,
  wider: 2.5,
} as const;

export const surface = {
  /** Level 1 — base app background. */
  canvas: colors.background,
  /** Level 2 — elevated content (cards, sheets, inputs). */
  elevated: colors.card,
  elevatedLight: colors.surfaceMuted,
  /** Dark accent block (hero cards, Legacy moments). */
  dark: colors.black,
  /** Level 3 — hero/media scrims, always paired with a gradient overlay. */
  scrim: 'rgba(11,11,12,0.55)',
  scrimStrong: 'rgba(11,11,12,0.82)',
  glassTint: 'rgba(248,247,243,0.84)',
  glassTintDark: 'rgba(11,11,12,0.55)',
} as const;

/**
 * Soft warm shadows for a light UI. Android elevation kept low (1-3): high
 * values promote a view to its own compositing layer that paints over
 * closely-spaced siblings (confirmed on a real device).
 */
export const shadows = {
  card: {
    shadowColor: '#2B2418',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 2,
  },
  soft: {
    shadowColor: '#2B2418',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
  },
  gold: {
    shadowColor: palette.goldDeep,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 3,
  },
} as const;

export const motion = {
  fast: 160,
  base: 280,
  slow: 520,
  slowest: 1000,
  /** Stagger step for list entrances. */
  stagger: 55,
  /** Items beyond this index enter together, so long lists never lag. */
  staggerMax: 8,
} as const;

/** Spring presets — weighted and quick, never cartoon bounce. */
export const springs = {
  press: { damping: 18, stiffness: 340, mass: 0.6 },
  release: { damping: 14, stiffness: 260, mass: 0.7 },
  gentle: { damping: 20, stiffness: 180 },
  snappy: { damping: 22, stiffness: 300 },
} as const;

export const breakpoints = {
  compact: 360,
  regular: 400,
  wide: 480,
  tablet: 768,
} as const;

export const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 } as const;
