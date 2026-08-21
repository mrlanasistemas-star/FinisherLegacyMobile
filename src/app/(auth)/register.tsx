import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { registerRequest } from '@/api/auth';
import { AppError } from '@/api/errors';
import { tokenStorage } from '@/api/secureStore';
import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { GoldGlow } from '@/components/brand/gold-glow';
import { FormInput } from '@/components/form-input';
import { Screen } from '@/components/screen';
import { registerSchema, type RegisterFormValues } from '@/schemas/auth';
import { useAuthStore } from '@/stores/authStore';
import { colors, radius, spacing } from '@/theme/tokens';

const FIELD_NAMES = ['first_name', 'last_name', 'email', 'password', 'password_confirmation'] as const;

export default function RegisterScreen() {
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      password_confirmation: '',
    },
  });

  async function onSubmit(values: RegisterFormValues) {
    setFormError(null);
    setSubmitting(true);
    try {
      const { user, token } = await registerRequest(values);
      await tokenStorage.set(token);
      useAuthStore.getState().setSession(user, token);
    } catch (error) {
      if (error instanceof AppError) {
        if (error.fieldErrors) {
          for (const [field, messages] of Object.entries(error.fieldErrors)) {
            if ((FIELD_NAMES as readonly string[]).includes(field)) {
              setError(field as (typeof FIELD_NAMES)[number], { message: messages[0] });
            }
          }
        }
        setFormError(error.message);
      } else {
        setFormError('Algo salió mal. Intenta nuevamente.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen scroll padded={false}>
        <View
          style={{
            height: 120,
            marginBottom: spacing.lg,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}>
          <GoldGlow size={200} style={{ position: 'absolute' }} />
          <View style={{ width: 56, height: 56, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.goldDim, alignItems: 'center', justifyContent: 'center' }}>
            <AppText variant="subtitle" tone="gold">
              FL
            </AppText>
          </View>
        </View>

        <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.xl }}>
          <AppText variant="title">Crea tu cuenta</AppText>
          <AppText variant="body" tone="muted" style={{ marginTop: spacing.xxs }}>
            Tu Legacy comienza aquí.
          </AppText>
        </View>

        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
          {formError ? (
            <AppText variant="caption" tone="destructive">
              {formError}
            </AppText>
          ) : null}

          <Controller
            control={control}
            name="first_name"
            render={({ field }) => (
              <FormInput
                label="Nombre"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.first_name?.message}
                autoComplete="given-name"
                returnKeyType="next"
              />
            )}
          />

          <Controller
            control={control}
            name="last_name"
            render={({ field }) => (
              <FormInput
                label="Apellido"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.last_name?.message}
                autoComplete="family-name"
                returnKeyType="next"
              />
            )}
          />

          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <FormInput
                label="Correo electrónico"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.email?.message}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                returnKeyType="next"
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <FormInput
                label="Contraseña"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.password?.message}
                secure
                autoComplete="password-new"
                returnKeyType="next"
              />
            )}
          />

          <Controller
            control={control}
            name="password_confirmation"
            render={({ field }) => (
              <FormInput
                label="Confirmar contraseña"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.password_confirmation?.message}
                secure
                autoComplete="password-new"
                returnKeyType="done"
                onSubmitEditing={handleSubmit(onSubmit)}
              />
            )}
          />

          <AppButton
            label="Crear cuenta"
            onPress={handleSubmit(onSubmit)}
            loading={submitting}
            style={{ marginTop: spacing.sm }}
          />
          <AppButton label="Ya tengo cuenta" variant="ghost" onPress={() => router.replace('/login')} />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
