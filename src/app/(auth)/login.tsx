import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Lock, Mail } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { loginRequest } from '@/api/auth';
import { AppError } from '@/api/errors';
import { tokenStorage } from '@/api/secureStore';
import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { MascotGuideBubble } from '@/components/brand/mascot-guide-bubble';
import { FormInput } from '@/components/form-input';
import { Reveal } from '@/components/motion/reveal';
import { AppLink } from '@/components/ui/app-link';
import { SocialSignInButtons } from '@/features/auth/social-sign-in';
import { loginSchema, type LoginFormValues } from '@/schemas/auth';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing } from '@/theme/tokens';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    setError,
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
      useAuthStore.getState().setSession(user, token);
    } catch (error) {
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

  function handleForgotPassword() {
    router.push('/forgot-password');
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.black }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.lg }}>
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: insets.top + spacing.lg }}>
          <Reveal>
            <AppText variant="title">Qué bueno verte de nuevo.</AppText>
          </Reveal>
          <Reveal delay={40} style={{ marginTop: spacing.sm }}>
            <MascotGuideBubble messages={['Tu historia sigue aquí.']} portraitSize={38} compact />
          </Reveal>
        </View>

        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md, marginTop: spacing.lg }}>
          {formError ? (
            <AppText variant="caption" tone="destructive">
              {formError}
            </AppText>
          ) : null}

          <Reveal delay={80}>
            <Controller
              control={control}
              name="email"
              render={({ field }) => (
                <FormInput
                  label="Correo electrónico"
                  icon={Mail}
                  placeholder="tú@correo.com"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.email?.message}
                  kind="email"
                  returnKeyType="next"
                />
              )}
            />
          </Reveal>

          <Reveal delay={120}>
            <Controller
              control={control}
              name="password"
              render={({ field }) => (
                <FormInput
                  label="Contraseña"
                  icon={Lock}
                  placeholder="••••••••"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.password?.message}
                  kind="password"
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit(onSubmit)}
                />
              )}
            />
          </Reveal>

          <Reveal delay={140} style={{ alignSelf: 'flex-end' }}>
            <AppLink label="¿Olvidaste tu contraseña?" onPress={handleForgotPassword} small />
          </Reveal>
        </View>
      </ScrollView>

      {/* CTA pinned to the true bottom of the screen — solid black, matching
          the page background, so it reads as the screen's natural floor
          rather than a dark strip or glass overlay. */}
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: insets.bottom + spacing.md, backgroundColor: colors.black }}>
        <Reveal delay={170}>
          <AppButton label="ENTRAR A MI LEGACY" variant="legacy" onPress={handleSubmit(onSubmit)} loading={submitting} />
        </Reveal>

        {/* Only providers actually configured render (Apple on iOS; Google
            when its client id is set) — see features/auth/social-sign-in. */}
        <Reveal delay={200} style={{ marginTop: spacing.md }}>
          <SocialSignInButtons />
        </Reveal>

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.xxs, marginTop: spacing.md }}>
          <AppText variant="body" tone="muted">
            ¿No tienes cuenta?
          </AppText>
          <AppLink label="Regístrate" onPress={() => router.replace('/register')} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
