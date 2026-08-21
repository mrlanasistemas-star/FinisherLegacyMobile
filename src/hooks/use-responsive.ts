import { useWindowDimensions } from 'react-native';

import { breakpoints } from '@/theme/tokens';

export type WidthClass = 'compact' | 'regular' | 'wide' | 'tablet';

export interface Responsive {
  width: number;
  height: number;
  widthClass: WidthClass;
  isCompact: boolean;
  isTablet: boolean;
  /** Scales a base size down slightly on compact phones, up on tablets — for hero/metric type. */
  scale: (base: number) => number;
}

function classify(width: number): WidthClass {
  if (width >= breakpoints.tablet) return 'tablet';
  if (width >= breakpoints.wide) return 'wide';
  if (width >= breakpoints.regular) return 'regular';
  return 'compact';
}

export function useResponsive(): Responsive {
  const { width, height } = useWindowDimensions();
  const widthClass = classify(width);

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

  return { width, height, widthClass, isCompact: widthClass === 'compact', isTablet: widthClass === 'tablet', scale };
}
