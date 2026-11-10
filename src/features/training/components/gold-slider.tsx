import { useEffect, useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { colors, springs } from '@/theme/tokens';

/**
 * The player's thin slider (scrubber and volume): a hairline track that
 * thickens while you drag, gold fill, carbon thumb that grows under the
 * finger — all on the UI thread. Tap anywhere to jump. Screen readers get
 * an `adjustable` control with increment/decrement steps.
 */

interface GoldSliderProps {
  /** 0..1 */
  value: number;
  /** Live while dragging (e.g. preview time). */
  onChange?: (value: number) => void;
  /** Once, when the finger lifts. */
  onCommit: (value: number) => void;
  accessibilityLabel: string;
  accessibilityValueText: string;
  /** Keyboard / screen-reader step. */
  step?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const TOUCH_HEIGHT = 32;

export function GoldSlider({ value, onChange, onCommit, accessibilityLabel, accessibilityValueText, step = 0.05, disabled, style }: GoldSliderProps) {
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const trackWidth = useSharedValue(0);
  const progress = useSharedValue(clamp(value));
  const dragging = useSharedValue(0);

  useEffect(() => {
    if (dragging.value === 0) progress.value = clamp(value);
  }, [value, progress, dragging]);

  useEffect(() => {
    trackWidth.value = width;
  }, [width, trackWidth]);

  const emitChange = (v: number) => onChange?.(v);
  const emitCommit = (v: number) => onCommit(v);

  const pan = Gesture.Pan()
    .enabled(!disabled)
    .minDistance(0)
    .hitSlop({ top: 10, bottom: 10 })
    .onBegin((event) => {
      const w = trackWidth.value || 1;
      // eslint-disable-next-line react-hooks/immutability -- shared value written on the UI thread (worklet)
      dragging.value = reduceMotion ? 1 : withSpring(1, springs.snappy);
      // eslint-disable-next-line react-hooks/immutability -- shared value written on the UI thread (worklet)
      progress.value = Math.min(1, Math.max(0, event.x / w));
      runOnJS(emitChange)(progress.value);
    })
    .onUpdate((event) => {
      const w = trackWidth.value || 1;
      // eslint-disable-next-line react-hooks/immutability -- shared value written on the UI thread (worklet)
      progress.value = Math.min(1, Math.max(0, event.x / w));
      runOnJS(emitChange)(progress.value);
    })
    .onFinalize(() => {
      // eslint-disable-next-line react-hooks/immutability -- shared value written on the UI thread (worklet)
      dragging.value = reduceMotion ? 0 : withTiming(0, { duration: 180 });
      runOnJS(emitCommit)(progress.value);
    });

  const fillStyle = useAnimatedStyle(() => ({ width: progress.value * trackWidth.value }));
  const trackStyle = useAnimatedStyle(() => ({ height: 4 + dragging.value * 3, borderRadius: 4 }));
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * trackWidth.value - 7 }, { scale: 1 + dragging.value * 0.45 }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ text: accessibilityValueText }}
        accessibilityState={{ disabled: !!disabled }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(event) => {
          const delta = event.nativeEvent.actionName === 'increment' ? step : -step;
          onCommit(clamp(value + delta));
        }}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        style={[{ height: TOUCH_HEIGHT, justifyContent: 'center', opacity: disabled ? 0.45 : 1 }, style]}>
        <Animated.View style={[{ backgroundColor: colors.surfaceMuted, overflow: 'hidden' }, trackStyle]}>
          <Animated.View style={[{ position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: colors.gold }, fillStyle]} />
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              left: 0,
              width: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: colors.foreground,
              borderWidth: 2,
              borderColor: colors.card,
              shadowColor: '#2B2418',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.2,
              shadowRadius: 3,
              elevation: 2,
            },
            thumbStyle,
          ]}
        />
      </View>
    </GestureDetector>
  );
}

function clamp(v: number) {
  'worklet';
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0;
}
