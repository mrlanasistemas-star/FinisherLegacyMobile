/** fl-monograma.png is 1024×462. */
export const MONOGRAM_RATIO = 462 / 1024;

export type TagSide = 'front' | 'back';
export type TagSize = 'xs' | 'sm' | 'md' | 'lg';

/** Body widths (pt). xs = cart thumbnail, sm = grid card, md = carousel, lg = detail hero. */
export const TAG_WIDTHS: Record<TagSize, number> = { xs: 34, sm: 76, md: 112, lg: 172 };

/**
 * Geometry of the drawn tag for a body width, in points. The body is the
 * deck's ≈1:2 rounded card (pp. 6–8); the silicone loop rises above it.
 * Everything scales with `u` (1/100 of the width) so every size matches.
 */
export function tagGeometry(width: number) {
  const u = width / 100;
  const loopH = 30 * u;
  const bodyH = 200 * u;
  return {
    u,
    width,
    loopH,
    bodyH,
    height: loopH + bodyH,
    radius: 11 * u,
    slot: { top: 10 * u, width: 34 * u, height: 7 * u },
    strap: { width: 6 * u, left: 40 * u, right: 60 * u },
    monogram: { width: 30 * u, height: 30 * u * MONOGRAM_RATIO },
  };
}

export type TagGeometry = ReturnType<typeof tagGeometry>;
