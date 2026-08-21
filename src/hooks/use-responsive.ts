import { useWindowDimensions } from 'react-native';

import { breakpoints } from '@/theme/tokens';

export type WidthClass = 'compact' | 'regular' | 'wide' | 'tablet';
export type HeightClass = 'short' | 'regular' | 'tall';

export interface Responsive {
  width: number;
  height: number;
  widthClass: WidthClass;
  heightClass: HeightClass;
  isCompact: boolean;
  isTablet: boolean;
  isShort: boolean;
  /** Scales a base size down slightly on compact phones, up on tablets — for hero/metric type. */
  scale: (base: number) => number;
}

function classifyWidth(width: number): WidthClass {
  if (width >= breakpoints.tablet) return 'tablet';
  if (width >= breakpoints.wide) return 'wide';
  if (width >= breakpoints.regular) return 'regular';
  return 'compact';
}

/** Vertical space matters as much as width — a short device (SE-class, or any phone with a reduced usable height) needs a visibly more compact auth hero (AGENTS.md §194). */
function classifyHeight(height: number): HeightClass {
  if (height < 700) return 'short';
  if (height <= 850) return 'regular';
  return 'tall';
}

export function useResponsive(): Responsive {
  const { width, height } = useWindowDimensions();
  const widthClass = classifyWidth(width);
  const heightClass = classifyHeight(height);

  function scale(base: number) {
    switch (widthClass) {
      case 'compact':
        return Math.round(base * 0.8);
      case 'regular':
        return base;
      case 'wide':
        return Math.round(base * 1.05);
      case 'tablet':
        return Math.round(base * 1.2);
    }
  }

  return {
    width,
    height,
    widthClass,
    heightClass,
    isCompact: widthClass === 'compact',
    isTablet: widthClass === 'tablet',
    isShort: heightClass === 'short',
    scale,
  };
}
