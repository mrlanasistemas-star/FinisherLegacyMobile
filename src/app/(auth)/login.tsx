import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';

import { loginRequest } from '@/api/auth';
import { AppError } from '@/api/errors';
import { tokenStorage } from '@/api/secureStore';
import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { AuthFormError, AuthShell } from '@/components/auth/auth-shell';
import { FieldGroup, FloatingField } from '@/components/auth/floating-field';
import { Reveal } from '@/components/motion/reveal';
import { AppLink } from '@/components/ui/app-link';
import { loginSchema, type LoginFormValues } from '@/schemas/auth';
import { useAuthStore } from '@/stores/authStore';
import { spacing } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';

export default function LoginScreen() {
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: LoginFormValues) {
    setFormError(null);
    setSubmitting(true);
    try {
      const { user, token } = await loginRequest(values);
      await tokenStorage.set(token);
      haptics.success();
      useAuthStore.getState().setSession(user, token);
    } catch (error) {
      haptics.error();
      if (error instanceof AppError) {
        if (error.fieldErrors) {
          for (const [field, messages] of Object.entries(error.fieldErrors)) {
            if (field === 'email' || field === 'password') {
              setError(field, { message: messages[0] });
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
      eyebrow="Bienvenido de vuelta"
      title="Tu historia sigue aquí."
      subtitle="Entra con tu correo para ver tus recuerdos, tu comunidad y tus piezas Finisher Legacy."
      footer={
        <>
          <AppButton label="Entrar" onPress={handleSubmit(onSubmit)} loading={submitting} />
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.xxs, flexWrap: 'wrap' }}>
            <AppText variant="body" tone="muted">
              ¿No tienes cuenta?
            </AppText>
            <AppLink label="Crea una" onPress={() => router.replace('/register')} />
          </View>
        </>
      }>
      <AuthFormError message={formError} />

      <Reveal delay={120}>
        <FieldGroup>
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
          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <FloatingField
                ref={field.ref}
                label="Contraseña"
                kind="password"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.password?.message}
                returnKeyType="done"
                onSubmitEditing={handleSubmit(onSubmit)}
              />
            )}
          />
        </FieldGroup>
      </Reveal>

      <Reveal delay={210} style={{ alignSelf: 'flex-end' }}>
        <AppLink label="¿Olvidaste tu contraseña?" onPress={() => router.push('/forgot-password')} small />
      </Reveal>
    </AuthShell>
  );
}
