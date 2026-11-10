/** Brand gradients — carbon/graphite/gold/bone only, never a rainbow (manual §5). */
export const gradients = {
  /** Bottom scrim over hero media so overlaid type stays legible. */
  heroBottom: ['transparent', 'rgba(11,11,12,0.55)', 'rgba(11,11,12,0.94)'] as const,
  /** Full-height scrim for text-over-photo sections (event/medal hero). */
  heroFull: ['rgba(11,11,12,0.15)', 'rgba(11,11,12,0.35)', 'rgba(11,11,12,0.92)'] as const,
  /** Subtle top fade so status bar content stays readable over media. */
  topFade: ['rgba(11,11,12,0.55)', 'transparent'] as const,
  /** Fade from media into the light canvas (hero → page content). */
  toCanvas: ['rgba(248,247,243,0)', 'rgba(248,247,243,0.85)', '#F8F7F3'] as const,
  /** Manual "Degradado oro": Oro Claro → Oro Legacy → Oro Profundo. */
  gold: ['#E6D1B5', '#C9AE8B', '#8C7454'] as const,
  goldSoft: ['#E6D1B5', '#C9AE8B'] as const,
  /** Carbon accent block (dark brand moments). */
  carbon: ['#1E1E21', '#0B0B0C'] as const,
  /** Soft gold glow used behind hero type / Legacy moments. */
  goldGlow: ['rgba(201,174,139,0.35)', 'rgba(201,174,139,0)'] as const,
  goldGlowStrong: ['rgba(201,174,139,0.55)', 'rgba(201,174,139,0)'] as const,
};

export const gradientLocations = {
  heroBottom: [0, 0.55, 1] as const,
};
