import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/app-text';

import { colors, radius, spacing } from '@/theme/tokens';

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.graphite,
        borderRadius: radius.pill,
        padding: 3,
        borderWidth: 1,
        borderColor: colors.border,
      }}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={{ flex: 1, borderRadius: radius.pill, overflow: 'hidden' }}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}>
            {active ? (
              // Gradient fill, not a flat color: a flat gold pill here was
              // as prone to rendering gray/dark as any other gold surface.
              <LinearGradient
                colors={[colors.goldSoft, colors.gold]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ paddingVertical: spacing.xs, alignItems: 'center' }}>
                <AppText variant="bodyStrong" style={{ color: colors.black }}>
                  {option.label}
                </AppText>
              </LinearGradient>
            ) : (
              <View style={{ paddingVertical: spacing.xs, alignItems: 'center' }}>
                <AppText variant="bodyStrong" style={{ color: colors.muted }}>
                  {option.label}
                </AppText>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
