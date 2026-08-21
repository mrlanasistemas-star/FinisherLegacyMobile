import { forwardRef, useState } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';
import { Eye, EyeOff, type LucideIcon } from 'lucide-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, interpolateColor, interpolate } from 'react-native-reanimated';

import { AppText } from './app-text';

import { colors, fontFamily, fontSize, radius, spacing } from '@/theme/tokens';

interface FormInputProps extends TextInputProps {
  label: string;
  error?: string;
  secure?: boolean;
  icon?: LucideIcon;
}

const AnimatedView = Animated.createAnimatedComponent(View);

export const FormInput = forwardRef<TextInput, FormInputProps>(function FormInput(
  { label, error, secure, icon: Icon, style, onFocus, onBlur, ...rest },
  ref,
) {
  const [hidden, setHidden] = useState(!!secure);
  const [focused, setFocused] = useState(false);
  const focus = useSharedValue(0);

  const handleFocus: TextInputProps['onFocus'] = (event) => {
    focus.value = withTiming(1, { duration: 180 });
    setFocused(true);
    onFocus?.(event);
  };

  const handleBlur: TextInputProps['onBlur'] = (event) => {
    focus.value = withTiming(0, { duration: 180 });
    setFocused(false);
    onBlur?.(event);
  };

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: error
      ? colors.destructive
      : interpolateColor(focus.value, [0, 1], [colors.border, colors.gold]),
    backgroundColor: interpolateColor(focus.value, [0, 1], [colors.graphite, colors.graphiteLight]),
    shadowOpacity: error ? 0 : interpolate(focus.value, [0, 1], [0, 0.28]),
    shadowRadius: interpolate(focus.value, [0, 1], [0, 10]),
  }));

  const iconColor = error ? colors.destructive : focused ? colors.goldSoft : colors.muted;

  return (
    <View style={{ gap: spacing.xxs }}>
      <AppText variant="label" tone={focused ? 'gold' : 'muted'}>
        {label}
      </AppText>
      <AnimatedView
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1.5,
            borderRadius: radius.md,
            shadowColor: colors.gold,
            shadowOffset: { width: 0, height: 0 },
          },
          borderStyle,
        ]}>
        {Icon ? (
          <View style={{ paddingLeft: spacing.md }}>
            <Icon size={18} color={iconColor} />
          </View>
        ) : null}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.muted}
          secureTextEntry={secure ? hidden : rest.secureTextEntry}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={[
            {
              flex: 1,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              fontFamily: fontFamily.regular,
              fontSize: fontSize.md,
              color: colors.foreground,
              minHeight: 50,
            },
            style,
          ]}
          {...rest}
        />
        {secure && (
          <Pressable
            hitSlop={12}
            onPress={() => setHidden((prev) => !prev)}
            style={{ paddingHorizontal: spacing.sm }}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Mostrar contraseña' : 'Ocultar contraseña'}>
            {hidden ? <EyeOff size={20} color={iconColor} /> : <Eye size={20} color={iconColor} />}
          </Pressable>
        )}
      </AnimatedView>
      {error ? (
        <AppText variant="caption" tone="destructive">
          {error}
        </AppText>
      ) : null}
    </View>
  );
});
