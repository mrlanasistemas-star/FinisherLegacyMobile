import * as Haptics from 'expo-haptics';
import type { PropsWithChildren } from 'react';
import { Pressable, type GestureResponderEvent, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressScaleProps extends PropsWithChildren {
  onPress?: (event: GestureResponderEvent) => void;
  scaleTo?: number;
  haptic?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  accessibilityRole?: 'button' | 'link' | 'imagebutton';
  accessibilityLabel?: string;
}

/** Weighted, confident press feedback — the one press interaction the whole app shares (AGENTS.md §48/§84). */
export function PressScale({
  children,
  onPress,
  scaleTo = 0.97,
  haptic = false,
  disabled,
  style,
  accessibilityRole,
  accessibilityLabel,
}: PressScaleProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  function handlePress(event: GestureResponderEvent) {
    if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress?.(event);
  }

  return (
    <AnimatedPressable
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      onPressIn={() => {
        // Reanimated shared values are mutated via `.value` by design —
        // this bypasses React's render cycle intentionally and is safe,
        // unlike mutating a normal render-scope variable.
        // eslint-disable-next-line react-hooks/immutability
        scale.value = withSpring(scaleTo, { damping: 16, stiffness: 260 });
      }}
      onPressOut={() => {
        // eslint-disable-next-line react-hooks/immutability
        scale.value = withSpring(1, { damping: 16, stiffness: 260 });
      }}
      onPress={handlePress}
      style={[animatedStyle, style]}>
      {children}
    </AnimatedPressable>
  );
}
