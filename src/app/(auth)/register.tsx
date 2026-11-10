import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';

import { registerRequest } from '@/api/auth';
import { AppError } from '@/api/errors';
import { tokenStorage } from '@/api/secureStore';
import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { AuthFormError, AuthShell } from '@/components/auth/auth-shell';
import { FieldGroup, FloatingField } from '@/components/auth/floating-field';
import { Reveal } from '@/components/motion/reveal';
import { AppLink } from '@/components/ui/app-link';
import { registerSchema, type RegisterFormValues } from '@/schemas/auth';
import { useAuthStore } from '@/stores/authStore';
import { spacing } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';

const FIELD_NAMES = ['first_name', 'last_name', 'email', 'password', 'password_confirmation'] as const;

export default function RegisterScreen() {
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    setError,
    setFocus,
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
      haptics.success();
      useAuthStore.getState().setSession(user, token);
    } catch (error) {
      haptics.error();
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
    <AuthShell
      eyebrow="Crea tu cuenta"
      title="Empieza tu legado."
      subtitle="Una cuenta para activar tus piezas, guardar cada carrera y compartirla con tu comunidad."
      footer={
        <>
          <AppButton label="Crear mi cuenta" onPress={handleSubmit(onSubmit)} loading={submitting} />
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.xxs, flexWrap: 'wrap' }}>
            <AppText variant="body" tone="muted">
              ¿Ya tienes cuenta?
            </AppText>
            <AppLink label="Inicia sesión" onPress={() => router.replace('/login')} />
          </View>
        </>
      }>
      <AuthFormError message={formError} />

      <Reveal delay={120}>
        <FieldGroup>
          <Controller
            control={control}
            name="first_name"
            render={({ field }) => (
              <FloatingField
                ref={field.ref}
                label="Nombre"
                kind="name"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.first_name?.message}
                autoComplete="given-name"
                textContentType="givenName"
                returnKeyType="next"
                onSubmitEditing={() => setFocus('last_name')}
              />
            )}
          />
          <Controller
            control={control}
            name="last_name"
            render={({ field }) => (
              <FloatingField
                ref={field.ref}
                label="Apellido"
                kind="name"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.last_name?.message}
                autoComplete="family-name"
                textContentType="familyName"
                returnKeyType="next"
                onSubmitEditing={() => setFocus('email')}
              />
            )}
          />
          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <FloatingField
                ref={field.ref}
                label="Correo electrónico"
                kind="email"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.email?.message}
                returnKeyType="next"
                onSubmitEditing={() => setFocus('password')}
              />
            )}
          />
        </FieldGroup>
      </Reveal>

      <Reveal delay={180}>
        <FieldGroup footer="Usa al menos 8 caracteres.">
          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <FloatingField
                ref={field.ref}
                label="Contraseña"
                kind="new-password"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.password?.message}
                returnKeyType="next"
                onSubmitEditing={() => setFocus('password_confirmation')}
              />
            )}
          />
          <Controller
            control={control}
            name="password_confirmation"
            render={({ field }) => (
              <FloatingField
                ref={field.ref}
                label="Confirmar contraseña"
                kind="new-password"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.password_confirmation?.message}
                returnKeyType="done"
                onSubmitEditing={handleSubmit(onSubmit)}
              />
            )}
          />
        </FieldGroup>
      </Reveal>
    </AuthShell>
  );
}
