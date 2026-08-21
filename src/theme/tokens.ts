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

export const shadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  gold: {
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
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
