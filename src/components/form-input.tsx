import { Eye, EyeOff, Search, X, type LucideIcon } from 'lucide-react-native';
import { forwardRef, useState, type ReactNode } from 'react';
import { Pressable, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';

import { AppText } from './app-text';

import { colors, control, fontFamily, spacing } from '@/theme/tokens';

/**
 * Presets that set the right keyboard, autofill and capitalization for a
 * field — so a screen asks for `kind="email"` instead of repeating five
 * props (and getting one wrong).
 */
export type InputKind = 'text' | 'email' | 'password' | 'new-password' | 'username' | 'number' | 'decimal' | 'phone' | 'search' | 'name';

const KIND_PROPS: Record<InputKind, Partial<TextInputProps>> = {
  text: {},
  name: { autoCapitalize: 'words', autoComplete: 'name', textContentType: 'name' },
  email: {
    keyboardType: 'email-address',
    autoCapitalize: 'none',
    autoCorrect: false,
    autoComplete: 'email',
    textContentType: 'emailAddress',
  },
  password: { autoCapitalize: 'none', autoCorrect: false, autoComplete: 'password', textContentType: 'password' },
  'new-password': { autoCapitalize: 'none', autoCorrect: false, autoComplete: 'new-password', textContentType: 'newPassword' },
  username: { autoCapitalize: 'none', autoCorrect: false, autoComplete: 'username', textContentType: 'username' },
  number: { keyboardType: 'number-pad' },
  decimal: { keyboardType: 'decimal-pad' },
  phone: { keyboardType: 'phone-pad', autoComplete: 'tel', textContentType: 'telephoneNumber' },
  search: { autoCapitalize: 'none', autoCorrect: false, returnKeyType: 'search', clearButtonMode: 'never' },
};

export interface FormInputProps extends TextInputProps {
  label?: string;
  /** Short helper under the field (hidden while an error is shown). */
  hint?: string;
  error?: string;
  kind?: InputKind;
  /** @deprecated use `kind="password"` — kept for existing call sites. */
  secure?: boolean;
  /** Leading icon. */
  icon?: LucideIcon;
  /** Custom trailing element (e.g. a unit, a button). */
  trailing?: ReactNode;
  /** Shows an ✕ to clear a non-empty value (defaults on for `search`). */
  clearable?: boolean;
  containerStyle?: ViewStyle;
}

/**
 * Minimal, native-feeling input: 48pt tall, 1px border, 12 radius, near-
 * black fill. Focus is a subtle gold border — no glow, no shadow. Error is a
 * red border plus one short line underneath.
 */
export const FormInput = forwardRef<TextInput, FormInputProps>(function FormInput(
  {
    label,
    hint,
    error,
    kind = 'text',
    secure,
    icon,
    trailing,
    clearable,
    containerStyle,
    style,
    onFocus,
    onBlur,
    multiline,
    editable = true,
    value,
    onChangeText,
    ...rest
  },
  ref,
) {
  const isPassword = secure || kind === 'password' || kind === 'new-password';
  const [hidden, setHidden] = useState(true);
  const [focused, setFocused] = useState(false);

  const LeadingIcon = icon ?? (kind === 'search' ? Search : undefined);
  const showClear = (clearable ?? kind === 'search') && !!value && editable && !multiline;
  const borderColor = error ? colors.destructive : focused ? colors.gold : colors.inputBorder;
  const iconColor = error ? colors.destructive : focused ? colors.goldSoft : colors.subtle;

  return (
    <View style={[{ gap: 6 }, containerStyle]}>
      {label ? (
        <AppText
          style={{ fontFamily: fontFamily.medium, fontSize: control.labelSize, color: error ? colors.destructive : colors.muted }}
          accessibilityElementsHidden
          importantForAccessibility="no">
          {label}
        </AppText>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          alignItems: multiline ? 'flex-start' : 'center',
          minHeight: multiline ? 96 : control.height,
          borderWidth: 1,
          borderColor,
          borderRadius: control.radius,
          backgroundColor: colors.input,
          opacity: editable ? 1 : 0.6,
        }}>
        {LeadingIcon ? (
          <View style={{ paddingLeft: control.paddingX, paddingTop: multiline ? 14 : 0 }}>
            <LeadingIcon size={18} color={iconColor} />
          </View>
        ) : null}

        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          editable={editable}
          multiline={multiline}
          accessibilityLabel={label ?? rest.placeholder}
          accessibilityHint={error ?? hint}
          placeholderTextColor={colors.subtle}
          selectionColor={colors.gold}
          cursorColor={colors.gold}
          secureTextEntry={isPassword ? hidden : rest.secureTextEntry}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          {...KIND_PROPS[isPassword && kind === 'text' ? 'password' : kind]}
          {...rest}
          style={[
            {
              flex: 1,
              paddingHorizontal: LeadingIcon ? 10 : control.paddingX,
              paddingVertical: multiline ? 12 : 0,
              minHeight: multiline ? 96 : control.height - 2,
              fontFamily: fontFamily.regular,
              fontSize: control.fontSize,
              color: colors.foreground,
              textAlignVertical: multiline ? 'top' : 'center',
            },
            style,
          ]}
        />

        {showClear ? (
          <Pressable
            onPress={() => onChangeText?.('')}
            hitSlop={10}
            style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
            accessibilityRole="button"
            accessibilityLabel="Borrar texto">
            <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: colors.graphiteLight, alignItems: 'center', justifyContent: 'center' }}>
              <X size={12} color={colors.foreground} strokeWidth={2.5} />
            </View>
          </Pressable>
        ) : null}

        {isPassword ? (
          <Pressable
            onPress={() => setHidden((prev) => !prev)}
            hitSlop={8}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Mostrar contraseña' : 'Ocultar contraseña'}>
            {hidden ? <EyeOff size={18} color={iconColor} /> : <Eye size={18} color={iconColor} />}
          </Pressable>
        ) : null}

        {trailing ? <View style={{ paddingRight: spacing.sm }}>{trailing}</View> : null}
      </View>

      {error ? (
        <AppText variant="caption" tone="destructive" accessibilityLiveRegion="polite" style={{ fontSize: 13 }}>
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" style={{ color: colors.subtle, fontSize: 13 }}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
});
