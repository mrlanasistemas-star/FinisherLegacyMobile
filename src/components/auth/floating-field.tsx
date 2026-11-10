import { Eye, EyeOff } from 'lucide-react-native';
import { Children, forwardRef, isValidElement, useEffect, useState, type ReactNode } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';
import Animated, { interpolate, interpolateColor, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import { colors, fontFamily, radius, shadows, spacing } from '@/theme/tokens';
import { useI18n } from '@/i18n';

type Kind = 'text' | 'email' | 'password' | 'new-password' | 'name';

interface FloatingFieldProps extends Omit<TextInputProps, 'style' | 'placeholder'> {
  label: string;
  error?: string;
  kind?: Kind;
}

const KIND_PROPS: Record<Kind, TextInputProps> = {
  text: {},
  name: { autoCapitalize: 'words', autoCorrect: false },
  email: { keyboardType: 'email-address', autoCapitalize: 'none', autoCorrect: false, autoComplete: 'email', textContentType: 'emailAddress' },
  password: { autoCapitalize: 'none', autoCorrect: false, autoComplete: 'password', textContentType: 'password' },
  'new-password': { autoCapitalize: 'none', autoCorrect: false, autoComplete: 'password-new', textContentType: 'newPassword' },
};

const ROW_HEIGHT = 58;

/**
 * iOS-style row for an inset grouped form: the label rests inside the row
 * and floats up (smaller, muted → deep gold) on focus or when filled; a gold
 * focus ring fades in around the row. Animations run on the UI thread;
 * Reduce Motion makes them instant.
 */
export const FloatingField = forwardRef<TextInput, FloatingFieldProps>(function FloatingField(
  { label, error, kind = 'text', value, onFocus, onBlur, editable = true, ...rest },
  ref,
) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const isPassword = kind === 'password' || kind === 'new-password';
  const raised = useSharedValue(value ? 1 : 0);
  const focus = useSharedValue(0);

  useEffect(() => {
    const d = reduceMotion ? 0 : 180;
    raised.value = withTiming(focused || !!value ? 1 : 0, { duration: d });
    focus.value = withTiming(focused ? 1 : 0, { duration: d });
  }, [focused, value, reduceMotion, raised, focus]);

  const labelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(raised.value, [0, 1], [0, -11]) }, { scale: interpolate(raised.value, [0, 1], [1, 0.78]) }],
    color: error ? colors.destructive : (interpolateColor(focus.value, [0, 1], [colors.subtle, colors.accent]) as string),
  }));
  const ringStyle = useAnimatedStyle(() => ({ opacity: error ? 1 : focus.value }));

  return (
    <View>
      <View style={{ minHeight: ROW_HEIGHT, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, opacity: editable ? 1 : 0.6 }}>
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              top: 2,
              bottom: 2,
              left: 2,
              right: 2,
              borderRadius: radius.md,
              borderWidth: 1.5,
              borderColor: error ? colors.destructive : colors.gold,
            },
            ringStyle,
          ]}
        />
        <View style={{ flex: 1, justifyContent: 'center', minHeight: ROW_HEIGHT }}>
          <Animated.Text
            pointerEvents="none"
            numberOfLines={1}
            style={[{ position: 'absolute', left: 0, transformOrigin: 'left center', fontFamily: fontFamily.medium, fontSize: 16 }, labelStyle]}
            maxFontSizeMultiplier={1.4}>
            {label}
          </Animated.Text>
          <TextInput
            ref={ref}
            value={value}
            editable={editable}
            accessibilityLabel={label}
            accessibilityHint={error}
            placeholderTextColor={colors.subtle}
            selectionColor={colors.accent}
            cursorColor={colors.accent}
            secureTextEntry={isPassword ? hidden : undefined}
            maxFontSizeMultiplier={1.4}
            onFocus={(event) => {
              setFocused(true);
              onFocus?.(event);
            }}
            onBlur={(event) => {
              setFocused(false);
              onBlur?.(event);
            }}
            {...KIND_PROPS[kind]}
            {...rest}
            style={{ fontFamily: fontFamily.regular, fontSize: 16, color: colors.foreground, paddingTop: 18, paddingBottom: 4, minHeight: ROW_HEIGHT - 4 }}
          />
        </View>
        {isPassword ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={8}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -10 }}
            accessibilityRole="button"
            accessibilityLabel={hidden ? t('Mostrar contraseña') : t('Ocultar contraseña')}>
            {hidden ? <EyeOff size={18} color={colors.subtle} /> : <Eye size={18} color={colors.subtle} />}
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <AppText variant="caption" tone="destructive" accessibilityLiveRegion="polite" style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.xs, fontSize: 13 }}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
});

/** Inset grouped section (Settings-style): one white rounded card, hairline separators between rows. */
export function FieldGroup({ children, footer }: { children: ReactNode; footer?: string }) {
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View style={{ gap: spacing.xs }}>
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: radius.lg,
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: colors.hairline,
          ...shadows.soft,
        }}>
        {rows.map((row, i) => (
          <View key={i}>
            {i > 0 ? <View style={{ height: 1, backgroundColor: colors.hairline, marginLeft: spacing.md }} /> : null}
            {row}
          </View>
        ))}
      </View>
      {footer ? (
        <AppText variant="caption" tone="subtle" style={{ paddingHorizontal: spacing.md }}>
          {footer}
        </AppText>
      ) : null}
    </View>
  );
}
