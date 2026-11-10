import type { ReactNode } from 'react';
import { Pressable, type GestureResponderEvent, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { springs } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Haptic = 'none' | 'selection' | 'light';

export interface PressableScaleProps extends Omit<PressableProps, 'style' | 'children'> {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Pressed scale. 0.97 for cards, 0.94 for small controls. */
  scaleTo?: number;
  /** Physical feedback on press (fire-and-forget; no-ops without a taptic engine). */
  haptic?: Haptic | boolean;
  /** Lift a little on pointer hover (tablet trackpad / web). Never required to discover the action. */
  hoverLift?: boolean;
  /** Dim slightly while pressed, on top of the scale. */
  dim?: boolean;
}

/**
 * The one press interaction the whole app shares: a weighted spring scale on
 * the UI thread + optional haptic + hover lift for pointer devices. With
 * Reduce Motion on it falls back to a short opacity dip (no scaling).
 */
export function PressableScale({
  children,
  style,
  scaleTo = 0.97,
  haptic = 'none',
  hoverLift = true,
  dim = false,
  onPress,
  onPressIn,
  onPressOut,
  onHoverIn,
  onHoverOut,
  disabled,
  ...rest
}: PressableScaleProps) {
  const reduceMotion = useReducedMotion();
  const pressed = useSharedValue(0);
  const hovered = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    if (reduceMotion) return { opacity: 1 - pressed.value * 0.25 };
    const scale = 1 - pressed.value * (1 - scaleTo);
    return {
      opacity: dim ? 1 - pressed.value * 0.12 : 1,
      transform: [{ translateY: -hovered.value * 2 }, { scale }],
    };
  });

  const hapticKind: Haptic = haptic === true ? 'light' : haptic === false ? 'none' : haptic;

  function handlePress(event: GestureResponderEvent) {
    if (hapticKind === 'light') haptics.light();
    else if (hapticKind === 'selection') haptics.selection();
    onPress?.(event);
  }

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPress={handlePress}
      onPressIn={(event) => {
        // Shared values are mutated via `.value` by design (UI-thread animation, not React state).
         
        pressed.value = reduceMotion ? withTiming(1, { duration: 80 }) : withSpring(1, springs.press);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
         
        pressed.value = reduceMotion ? withTiming(0, { duration: 120 }) : withSpring(0, springs.release);
        onPressOut?.(event);
      }}
      onHoverIn={(event) => {
         
        if (hoverLift && !disabled) hovered.value = withTiming(1, { duration: 160 });
        onHoverIn?.(event);
      }}
      onHoverOut={(event) => {
         
        hovered.value = withTiming(0, { duration: 180 });
        onHoverOut?.(event);
      }}
      style={[animatedStyle, style]}>
      {children}
    </AnimatedPressable>
  );
}
