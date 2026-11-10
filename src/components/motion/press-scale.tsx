import type { PropsWithChildren } from 'react';
import type { GestureResponderEvent, StyleProp, ViewStyle } from 'react-native';

import { PressableScale } from './pressable-scale';

interface PressScaleProps extends PropsWithChildren {
  onPress?: (event: GestureResponderEvent) => void;
  scaleTo?: number;
  haptic?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityRole?: 'button' | 'link' | 'imagebutton';
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

/** Back-compat alias over `PressableScale` (kept so existing cards don't churn). */
export function PressScale({ haptic = false, ...props }: PressScaleProps) {
  return <PressableScale haptic={haptic ? 'light' : 'none'} {...props} />;
}
