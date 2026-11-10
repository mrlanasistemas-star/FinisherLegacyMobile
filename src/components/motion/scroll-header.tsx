import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { colors, spacing, surface } from '@/theme/tokens';

/**
 * Scroll position as a shared value + a UI-thread scroll handler. Attach
 * `onScroll` to an `Animated.ScrollView` / `Animated.FlatList` (with
 * `scrollEventThrottle={16}`) and feed `scrollY` to `ScrollHeader` /
 * `useParallax`.
 */
export function useScrollY() {
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  return { scrollY, onScroll };
}

/** Parallax + pull-down stretch for a hero of height `height`. */
export function useParallax(scrollY: SharedValue<number>, height: number) {
  return useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(scrollY.value, [-height, 0, height], [-height / 2, 0, height * 0.4], Extrapolation.CLAMP) },
      { scale: interpolate(scrollY.value, [-height, 0], [1.6, 1], Extrapolation.CLAMP) },
    ],
  }));
}

interface ScrollHeaderProps {
  scrollY: SharedValue<number>;
  title?: string;
  /** Scroll distance at which the frosted bar is fully visible. */
  threshold?: number;
  left?: ReactNode;
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Collapsing header: transparent over the hero, then a frosted light bar
 * fades in with a hairline and the compact title slides into place as the
 * content scrolls under it. Absolutely positioned — render it as the last
 * child of the screen. All interpolation runs on the UI thread.
 */
export function ScrollHeader({ scrollY, title, threshold = 120, left, right, style }: ScrollHeaderProps) {
  const insets = useSafeAreaInsets();

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [threshold * 0.4, threshold], [0, 1], Extrapolation.CLAMP),
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [threshold * 0.7, threshold], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(scrollY.value, [threshold * 0.7, threshold], [8, 0], Extrapolation.CLAMP) }],
  }));

  return (
    <View pointerEvents="box-none" style={[{ position: 'absolute', top: 0, left: 0, right: 0, paddingTop: insets.top }, style]}>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, backdropStyle]}>
        {Platform.OS === 'android' ? (
          // Plain opaque bar: Android's BlurView ignores backgroundColor and lets the
          // content show through (hero titles bled under the compact title).
          <View style={{ flex: 1, backgroundColor: colors.background }} />
        ) : (
          <BlurView intensity={50} tint="light" style={{ flex: 1, backgroundColor: surface.glassTint }} />
        )}
        <View style={{ height: 1, backgroundColor: colors.hairline }} />
      </Animated.View>
      <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: spacing.sm }}>
        <View style={{ minWidth: 88, flexDirection: 'row', alignItems: 'center' }}>{left}</View>
        <Animated.View style={[{ flex: 1, alignItems: 'center' }, titleStyle]}>
          {title ? (
            <AppText variant="bodyStrong" numberOfLines={1} accessibilityRole="header">
              {title}
            </AppText>
          ) : null}
        </Animated.View>
        <View style={{ minWidth: 88, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }}>{right}</View>
      </View>
    </View>
  );
}
