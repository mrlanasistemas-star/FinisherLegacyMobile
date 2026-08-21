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
            style={{
              flex: 1,
              paddingVertical: spacing.xs,
              borderRadius: radius.pill,
              alignItems: 'center',
              backgroundColor: active ? colors.gold : 'transparent',
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}>
            <AppText variant="bodyStrong" style={{ color: active ? colors.black : colors.muted }}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
