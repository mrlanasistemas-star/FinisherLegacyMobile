import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Lock, Mail } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { loginRequest } from '@/api/auth';
import { AppError } from '@/api/errors';
import { tokenStorage } from '@/api/secureStore';
import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { MascotGuideBubble } from '@/components/brand/mascot-guide-bubble';
import { FormInput } from '@/components/form-input';
import { Reveal } from '@/components/motion/reveal';
import { Screen } from '@/components/screen';
import { AppLink } from '@/components/ui/app-link';
import { GoogleGlyph } from '@/components/ui/google-glyph';
import { SocialButton } from '@/components/ui/social-button';
import { loginSchema, type LoginFormValues } from '@/schemas/auth';
import { useAuthStore } from '@/stores/authStore';
import { showToast } from '@/stores/toastStore';
import { colors, spacing } from '@/theme/tokens';

export default function LoginScreen() {
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

  function handleGoogle() {
    showToast('Continuar con Google estará disponible próximamente.', 'default');
  }

  function handleForgotPassword() {
    showToast('La recuperación de contraseña estará disponible próximamente.', 'default');
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen scroll padded={false} keyboardShouldPersistTaps="handled">
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
          <Reveal>
            <AppText variant="title">Qué bueno verte otra vez.</AppText>
          </Reveal>
          <Reveal delay={40} style={{ marginTop: spacing.md }}>
            <MascotGuideBubble messages={['Tu Legacy sigue aquí, tal como lo dejaste.']} portraitSize={44} />
          </Reveal>
        </View>

        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md, marginTop: spacing.xl }}>
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
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
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
                  secure
                  autoComplete="password"
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit(onSubmit)}
                />
              )}
            />
          </Reveal>

          <Reveal delay={140} style={{ alignSelf: 'flex-end' }}>
            <AppLink label="¿Olvidaste tu contraseña?" onPress={handleForgotPassword} small />
          </Reveal>

          {/* CTA sits directly under the fields — never hundreds of pixels
              further down (AGENTS.md §188). */}
          <Reveal delay={170}>
            <AppButton label="ENTRAR A MI LEGACY" onPress={handleSubmit(onSubmit)} loading={submitting} />
          </Reveal>

          <Reveal delay={200} style={{ gap: spacing.sm, marginTop: spacing.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.xs }}>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
              <AppText variant="caption" tone="muted">
                o continúa con
              </AppText>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
            </View>

            <SocialButton label="Continuar con Google" icon={<GoogleGlyph />} onPress={handleGoogle} />
          </Reveal>

          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.xxs, marginTop: spacing.lg, marginBottom: spacing.xl }}>
            <AppText variant="body" tone="muted">
              ¿No tienes cuenta?
            </AppText>
            <AppLink label="Regístrate" onPress={() => router.replace('/register')} />
          </View>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
