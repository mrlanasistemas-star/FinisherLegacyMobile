import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useI18n } from '@/i18n';

const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;

interface ZoomableProductImageProps {
  url: string;
  alt: string;
  width: number;
  height: number;
  /** Reset the zoom when the slide leaves the screen. */
  active: boolean;
  /** Lets the pager lock horizontal paging while the image is zoomed. */
  onZoomChange?: (zoomed: boolean) => void;
}

/**
 * Pinch to zoom (1×–4×), pan while zoomed, double tap to toggle. Panning is
 * clamped to the image bounds so the product never drifts off-screen.
 */
export function ZoomableProductImage({ url, alt, width, height, active, onZoomChange }: ZoomableProductImageProps) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  const { t } = useI18n();
  const [zoomed, setZoomed] = useState(false);
  const notify = (next: boolean) => {
    setZoomed(next);
    onZoomChange?.(next);
  };

  const clampTranslation = (value: number, size: number, currentScale: number) => {
    'worklet';
    const limit = (size * (currentScale - 1)) / 2;
    return Math.min(Math.max(value, -limit), limit);
  };

  const reset = () => {
    'worklet';
    scale.value = withTiming(1, { duration: 220 });
    x.value = withTiming(0, { duration: 220 });
    y.value = withTiming(0, { duration: 220 });
    savedScale.value = 1;
    savedX.value = 0;
    savedY.value = 0;
  };

  const pinch = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = Math.min(Math.max(savedScale.value * event.scale, 1), MAX_SCALE);
    })
    .onEnd(() => {
      if (scale.value <= 1.02) {
        reset();
        runOnJS(notify)(false);
        return;
      }
      savedScale.value = scale.value;
      x.value = withTiming(clampTranslation(x.value, width, scale.value));
      y.value = withTiming(clampTranslation(y.value, height, scale.value));
      savedX.value = x.value;
      savedY.value = y.value;
      runOnJS(notify)(true);
    });

  const pan = Gesture.Pan()
    .enabled(zoomed && active)
    .averageTouches(true)
    .onUpdate((event) => {
      if (savedScale.value <= 1) return;
      x.value = clampTranslation(savedX.value + event.translationX, width, scale.value);
      y.value = clampTranslation(savedY.value + event.translationY, height, scale.value);
    })
    .onEnd(() => {
      savedX.value = x.value;
      savedY.value = y.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (savedScale.value > 1) {
        reset();
        runOnJS(notify)(false);
      } else {
        scale.value = withTiming(DOUBLE_TAP_SCALE, { duration: 220 });
        savedScale.value = DOUBLE_TAP_SCALE;
        runOnJS(notify)(true);
      }
    });

  useEffect(() => {
    if (!active) {
      scale.value = 1;
      savedScale.value = 1;
      x.value = 0;
      y.value = 0;
      savedX.value = 0;
      savedY.value = 0;
    }
  }, [active, scale, savedScale, x, y, savedX, savedY]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }],
  }));

  // Pan is only enabled while zoomed — otherwise the pager keeps the swipe.
  const gesture = Gesture.Simultaneous(pinch, doubleTap, pan);

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[{ width, height, overflow: 'hidden' }, style]} accessible accessibilityRole="image" accessibilityLabel={alt} accessibilityHint={t('Pellizca o toca dos veces para acercar')}>
        <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} contentFit="contain" transition={150} />
      </Animated.View>
    </GestureDetector>
  );
}
