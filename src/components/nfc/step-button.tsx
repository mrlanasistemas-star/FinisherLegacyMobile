import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import { colors, fontFamily, radius, springs } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';

type Variant = 'primary' | 'secondary' | 'plain';

interface StepButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  accessibilityHint?: string;
  style?: ViewStyle;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Refined 50pt control for the activation flow — iOS-like, light, gold
 * only as an accent: `primary` is carbon ink with a hairline gold edge,
 * `secondary` a quiet outline, `plain` a text action (still 44pt tall).
 */
export function StepButton({ label, onPress, variant = 'primary', disabled = false, loading = false, accessibilityHint, style }: StepButtonProps) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const inactive = disabled || loading;

  const fg = variant === 'primary' ? colors.onDark : variant === 'secondary' ? colors.foreground : colors.accent;

  return (
    <AnimatedPressable
      onPress={() => {
        haptics.light();
        onPress();
      }}
      disabled={inactive}
      onPressIn={() => {
        scale.set(withSpring(0.97, springs.press));
      }}
      onPressOut={() => {
        scale.set(withSpring(1, springs.release));
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={[styles.base, variant === 'primary' && styles.primary, variant === 'secondary' && styles.secondary, variant === 'plain' && styles.plain, inactive && styles.inactive, animated, style]}>
      <View style={styles.row}>
        {loading ? <ActivityIndicator size="small" color={fg} /> : null}
        <AppText style={[styles.label, { color: fg }]} numberOfLines={1}>
          {label}
        </AppText>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    borderRadius: radius.md + 2,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    alignSelf: 'stretch',
  },
  primary: {
    backgroundColor: colors.black,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
  },
  secondary: {
    backgroundColor: colors.surfaceMuted,
  },
  plain: {
    minHeight: 44,
    backgroundColor: 'transparent',
  },
  inactive: { opacity: 0.45 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontFamily: fontFamily.semibold, fontSize: 16, letterSpacing: 0.1 },
});
