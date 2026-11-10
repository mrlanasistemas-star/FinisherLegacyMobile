import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import { colors, fontFamily, springs } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

const PAD = 3;

/**
 * iOS-style segmented control: warm track with a white thumb that springs
 * to the selected segment on the UI thread. Selection reads through
 * contrast + weight, never gold.
 */
export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const segment = options.length > 0 ? (width - PAD * 2) / options.length : 0;
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const x = useSharedValue(0);

  useEffect(() => {
    if (!segment) return;
    x.value = reduceMotion ? index * segment : withSpring(index * segment, springs.snappy);
  }, [index, segment, reduceMotion, x]);

  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View
      accessibilityRole="tablist"
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{ flexDirection: 'row', backgroundColor: colors.surfaceMuted, borderRadius: 11, borderCurve: 'continuous', padding: PAD }}>
      {segment ? (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              top: PAD,
              bottom: PAD,
              left: PAD,
              width: segment,
              borderRadius: 9,
              backgroundColor: colors.card,
              shadowColor: '#2B2418',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 1,
            },
            thumbStyle,
          ]}
        />
      ) : null}
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
            style={{ flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}>
            <AppText
              maxFontSizeMultiplier={1.3}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
              style={{ fontFamily: active ? fontFamily.semibold : fontFamily.medium, fontSize: 14, color: active ? colors.foreground : colors.muted }}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
