/** Brand gradients — always black/graphite/gold, never a rainbow (AGENTS.md §50). */
export const gradients = {
  /** Bottom scrim over hero media so overlaid type stays legible. */
  heroBottom: ['transparent', 'rgba(10,10,12,0.55)', 'rgba(10,10,12,0.96)'] as const,
  /** Full-height scrim for text-over-photo sections (event/medal hero). */
  heroFull: ['rgba(10,10,12,0.15)', 'rgba(10,10,12,0.35)', 'rgba(10,10,12,0.95)'] as const,
  /** Subtle top fade so status bar content stays readable over media. */
  topFade: ['rgba(10,10,12,0.6)', 'transparent'] as const,
  /** Soft gold radial-feeling glow used behind hero type / Legacy Code moments. */
  goldGlow: ['rgba(201,161,89,0.35)', 'rgba(201,161,89,0)'] as const,
  goldGlowStrong: ['rgba(201,161,89,0.55)', 'rgba(201,161,89,0)'] as const,
};

export const gradientLocations = {
  heroBottom: [0, 0.55, 1] as const,
};
