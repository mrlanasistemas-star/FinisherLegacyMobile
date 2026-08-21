import type { PropsWithChildren, ReactNode } from 'react';
import type { ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { motion } from '@/theme/tokens';

interface RevealProps extends PropsWithChildren {
  delay?: number;
  style?: ViewStyle;
}

/** Standard entrance for hero/section content — weighted fade + rise, no bounce. */
export function Reveal({ children, delay = 0, style }: RevealProps) {
  return (
    <Animated.View entering={FadeInDown.duration(motion.slow).delay(delay).springify().damping(18)} style={style}>
      {children}
    </Animated.View>
  );
}

interface StaggerProps {
  children: ReactNode[];
  gap?: number;
  style?: ViewStyle;
}

/** Staggers a list of already-built children with Reveal — for card grids/carousels entrances. */
export function Stagger({ children, gap = 60, style }: StaggerProps) {
  return (
    <>
      {children.map((child, index) => (
        <Reveal key={index} delay={index * gap} style={style}>
          {child}
        </Reveal>
      ))}
    </>
  );
}
