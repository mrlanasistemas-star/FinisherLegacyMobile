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
import { GoogleGlyph } from '@/components/ui/google-glyph';
import { OrDivider } from '@/components/ui/or-divider';
import { SocialButton } from '@/components/ui/social-button';
import { loginSchema, type LoginFormValues } from '@/schemas/auth';
import { useAuthStore } from '@/stores/authStore';
import { showToast } from '@/stores/toastStore';
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

  function handleGoogle() {
    showToast('Continuar con Google estará disponible próximamente.', 'default');
  }

  function handleForgotPassword() {
    showToast('La recuperación de contraseña estará disponible próximamente.', 'default');
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.black }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}>
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

          {/* Primary CTA sits directly after the fields it belongs to — not
              at the bottom of the screen, not behind glass (AGENTS.md §224). */}
          <Reveal delay={170} style={{ marginTop: spacing.xs }}>
            <AppButton label="ENTRAR A MI LEGACY" variant="legacy" onPress={handleSubmit(onSubmit)} loading={submitting} />
          </Reveal>

          {/*
           * Google sign-in has zero backend OAuth support today (verified
           * against composer.json/config/services.php/routes) — showing it
           * as a real, tappable production action would fake functionality
           * that doesn't exist (AGENTS.md §198/§230). Kept visible only in
           * dev builds so the UI can still be reviewed/iterated on.
           */}
          {__DEV__ ? (
            <Reveal delay={200} style={{ gap: spacing.sm, marginTop: spacing.xs }}>
              <OrDivider label="o continúa con" />
              <SocialButton label="Continuar con Google" icon={<GoogleGlyph />} onPress={handleGoogle} />
            </Reveal>
          ) : null}

          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.xxs, marginTop: spacing.lg }}>
            <AppText variant="body" tone="muted">
              ¿No tienes cuenta?
            </AppText>
            <AppLink label="Regístrate" onPress={() => router.replace('/register')} />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
