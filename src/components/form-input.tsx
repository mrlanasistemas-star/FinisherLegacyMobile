import { forwardRef, useState } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';

import { AppText } from './app-text';

import { colors, fontFamily, fontSize, radius, spacing } from '@/theme/tokens';

interface FormInputProps extends TextInputProps {
  label: string;
  error?: string;
  secure?: boolean;
}

export const FormInput = forwardRef<TextInput, FormInputProps>(function FormInput(
  { label, error, secure, style, ...rest },
  ref,
) {
  const [hidden, setHidden] = useState(!!secure);

  return (
    <View style={{ gap: spacing.xxs }}>
      <AppText variant="label" tone="muted">
        {label}
      </AppText>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: error ? colors.destructive : colors.border,
          borderRadius: radius.md,
          backgroundColor: colors.graphite,
        }}>
        <TextInput
          ref={ref}
          placeholderTextColor={colors.muted}
          secureTextEntry={secure ? hidden : rest.secureTextEntry}
          style={[
            {
              flex: 1,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              fontFamily: fontFamily.regular,
              fontSize: fontSize.md,
              color: colors.foreground,
              minHeight: 48,
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
            {hidden ? <EyeOff size={20} color={colors.muted} /> : <Eye size={20} color={colors.muted} />}
          </Pressable>
        )}
      </View>
      {error ? (
        <AppText variant="caption" tone="destructive">
          {error}
        </AppText>
      ) : null}
    </View>
  );
});
