export const colors = {
  black: '#0A0A0C',
  graphite: '#19191C',
  graphiteLight: '#28282F',
  gold: '#C9A159',
  goldSoft: '#DFC08E',
  goldDim: '#8C7A54',
  background: '#0A0A0C',
  foreground: '#F5F5F5',
  card: '#19191C',
  border: '#2C2C31',
  muted: '#9B9BA3',
  destructive: '#E5473F',
  success: '#4FAE7D',
  white: '#FFFFFF',
  /** Hairline dividers between rows — quieter than `border`. */
  hairline: '#1F1F24',
  /** Near-black input fill — sits just above the canvas, never a grey box. */
  input: '#111114',
  inputBorder: '#26262C',
  /** Secondary text on dark that still passes 4.5:1 against `black`. */
  subtle: '#7C7C85',
  goldWash: 'rgba(201,161,89,0.10)',
  destructiveWash: 'rgba(229,71,63,0.10)',
} as const;

/** Form controls — one place for the input rhythm (44–48 high, 12 radius). */
export const control = {
  height: 48,
  compactHeight: 44,
  radius: 12,
  paddingX: 14,
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
  sm: 6,
  md: 10,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;

export const fontFamily = {
  regular: 'InstrumentSans_400Regular',
  medium: 'InstrumentSans_500Medium',
  semibold: 'InstrumentSans_600SemiBold',
  bold: 'InstrumentSans_700Bold',
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  display: 34,
  /** Editorial hero headline — scales down on compact widths via useResponsive(). */
  hero: 52,
  /** Big decorative/real numerals (Legacy stats, medal metrics). */
  metric: 72,
} as const;

/** Wide letter-spacing for small uppercase labels (eyebrows, tags, "LEGACY ID"). */
export const tracking = {
  tight: -0.5,
  normal: 0,
  wide: 1,
  wider: 2.5,
} as const;

export const surface = {
  /** Level 1 — base app background. */
  canvas: colors.black,
  /** Level 2 — elevated content (cards, sheets, inputs). */
  elevated: colors.graphite,
  elevatedLight: colors.graphiteLight,
  /** Level 3 — hero/media scrims, always paired with a gradient overlay. */
  scrim: 'rgba(10,10,12,0.55)',
  scrimStrong: 'rgba(10,10,12,0.82)',
  glassTint: 'rgba(25,25,28,0.55)',
} as const;

/**
 * Elevation kept deliberately low (2-3, not 6-8) across the board: Android's
 * `elevation` promotes a view to its own compositing layer with real shadow
 * casting, and at high values that layer visually paints over closely-spaced
 * siblings (medal/event cards in a grid, the scan button over the tab bar) —
 * a button/card's own edge showing through where a neighbor's text should
 * be. Confirmed on a real Android device. iOS shadow props (shadowOpacity/
 * shadowRadius) are unaffected and can stay soft/generous.
 */
export const shadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  gold: {
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 3,
  },
} as const;

export const motion = {
  fast: 160,
  base: 280,
  slow: 600,
  slowest: 1100,
} as const;

export const breakpoints = {
  compact: 360,
  regular: 400,
  wide: 480,
  tablet: 768,
} as const;

export const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 } as const;
