import type { PropsWithChildren, ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';

import { motion } from '@/theme/tokens';

/**
 * Entering animation for the n-th item of a list: fade + rise on a spring,
 * staggered by `motion.stagger`, capped at `motion.staggerMax` so rows far
 * down a long list don't wait. Pass `reduceMotion` from `useReducedMotion()`.
 * Layout animations run on the UI thread.
 */
export function listEntering(index: number, reduceMotion = false) {
  if (reduceMotion) return FadeIn.duration(motion.fast);
  const step = Math.min(index, motion.staggerMax);
  return FadeInDown.delay(step * motion.stagger).springify().damping(20).stiffness(170).mass(0.8);
}

interface RevealProps extends PropsWithChildren {
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

/** Standard entrance for hero/section content — weighted fade + rise, no bounce. */
export function Reveal({ children, delay = 0, style }: RevealProps) {
  const reduceMotion = useReducedMotion();
  const entering = reduceMotion
    ? FadeIn.duration(motion.fast)
    : FadeInDown.delay(delay).springify().damping(20).stiffness(160).mass(0.9);
  return (
    <Animated.View entering={entering} style={style}>
      {children}
    </Animated.View>
  );
}

interface StaggerProps {
  children: ReactNode[];
  gap?: number;
  style?: StyleProp<ViewStyle>;
}

/** Staggers a list of already-built children with Reveal — for card grids/carousels entrances. */
export function Stagger({ children, gap = motion.stagger, style }: StaggerProps) {
  return (
    <>
      {children.map((child, index) => (
        <Reveal key={index} delay={Math.min(index, motion.staggerMax) * gap} style={style}>
          {child}
        </Reveal>
      ))}
    </>
  );
}

interface StaggerItemProps extends PropsWithChildren {
  index: number;
  style?: StyleProp<ViewStyle>;
}

/** One row of a FlatList/map that enters with the shared staggered spring. */
export function StaggerItem({ index, style, children }: StaggerItemProps) {
  const reduceMotion = useReducedMotion();
  return (
    <Animated.View entering={listEntering(index, reduceMotion)} style={style}>
      {children}
    </Animated.View>
  );
}
