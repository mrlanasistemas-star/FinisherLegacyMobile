import { Pressable, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { colors, fontFamily } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

/**
 * Native-feeling segmented control: a quiet track with a lifted active
 * segment. Gold is reserved for actions, so the selection reads through
 * contrast, not color.
 */
export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <View
      accessibilityRole="tablist"
      style={{ flexDirection: 'row', backgroundColor: colors.input, borderRadius: 12, padding: 3, borderWidth: 1, borderColor: colors.hairline }}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              if (active) return;
              haptics.selection();
              onChange(option.value);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={{
              flex: 1,
              minHeight: 38,
              borderRadius: 9,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: active ? colors.graphiteLight : 'transparent',
            }}>
            <AppText style={{ fontFamily: active ? fontFamily.semibold : fontFamily.medium, fontSize: 14, color: active ? colors.foreground : colors.muted }}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
