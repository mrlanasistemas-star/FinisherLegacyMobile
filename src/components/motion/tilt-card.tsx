import type { ReactNode } from 'react';
import { Pressable, type GestureResponderEvent, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

import { springs } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface TiltCardProps {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /** Max tilt in degrees toward the touch point. */
  maxTilt?: number;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  haptic?: boolean;
}

/**
 * A card that leans toward your finger on press (perspective rotateX/Y) and
 * settles back on a spring — a "physical object" feel for medals, plates and
 * hero cards. Driven by the press location (not a pan gesture), so it never
 * fights the parent ScrollView. Reduce Motion: no tilt.
 */
export function TiltCard({ children, onPress, style, maxTilt = 6, accessibilityLabel, accessibilityHint, haptic = true }: TiltCardProps) {
  const reduceMotion = useReducedMotion();
  const width = useSharedValue(1);
  const height = useSharedValue(1);
  const rx = useSharedValue(0);
  const ry = useSharedValue(0);
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 800 },
      { rotateX: `${rx.value}deg` },
      { rotateY: `${ry.value}deg` },
      { scale: 1 - pressed.value * 0.02 },
    ],
  }));

  // Shared values are written via `.value` by design (UI-thread animation, not React state).
   
  function onLayout(event: LayoutChangeEvent) {
    width.value = Math.max(1, event.nativeEvent.layout.width);
    height.value = Math.max(1, event.nativeEvent.layout.height);
  }

  function onPressIn(event: GestureResponderEvent) {
    if (reduceMotion) return;
    const { locationX, locationY } = event.nativeEvent;
    const nx = locationX / width.value - 0.5;
    const ny = locationY / height.value - 0.5;
    ry.value = withSpring(nx * maxTilt * 2, springs.press);
    rx.value = withSpring(-ny * maxTilt * 2, springs.press);
    pressed.value = withSpring(1, springs.press);
  }

  function onPressOut() {
    rx.value = withSpring(0, springs.gentle);
    ry.value = withSpring(0, springs.gentle);
    pressed.value = withSpring(0, springs.release);
  }
   

  return (
    <AnimatedPressable
      onLayout={onLayout}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={
        onPress
          ? () => {
              if (haptic) haptics.light();
              onPress();
            }
          : undefined
      }
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={[animatedStyle, style]}>
      {children}
    </AnimatedPressable>
  );
}
