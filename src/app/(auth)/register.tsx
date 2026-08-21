import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Lock, Mail, User } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { registerRequest } from '@/api/auth';
import { AppError } from '@/api/errors';
import { tokenStorage } from '@/api/secureStore';
import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { GlassSurface } from '@/components/brand/glass-surface';
import { MascotGuideBubble } from '@/components/brand/mascot-guide-bubble';
import { FormInput } from '@/components/form-input';
import { Reveal } from '@/components/motion/reveal';
import { AppLink } from '@/components/ui/app-link';
import { GoogleGlyph } from '@/components/ui/google-glyph';
import { SocialButton } from '@/components/ui/social-button';
import { registerSchema, type RegisterFormValues } from '@/schemas/auth';
import { useAuthStore } from '@/stores/authStore';
import { showToast } from '@/stores/toastStore';
import { colors, spacing } from '@/theme/tokens';

const FIELD_NAMES = ['first_name', 'last_name', 'email', 'password', 'password_confirmation'] as const;
const STICKY_BAR_HEIGHT = 84;

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
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

  function handleGoogle() {
    showToast('Continuar con Google estará disponible próximamente.', 'default');
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.black }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ flex: 1 }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: STICKY_BAR_HEIGHT + insets.bottom + spacing.lg }}>
          <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
            <Reveal>
              <AppText variant="title">Crea tu cuenta</AppText>
            </Reveal>
            <Reveal delay={40} style={{ marginTop: spacing.md }}>
              <MascotGuideBubble
                messages={['Vamos a crear tu Legacy. Sólo necesito unos datos para empezar.']}
                portraitSize={44}
              />
            </Reveal>
          </View>

          <Reveal delay={80} style={{ paddingHorizontal: spacing.lg, gap: spacing.sm, marginTop: spacing.xl, marginBottom: spacing.lg }}>
            <SocialButton label="Regístrate con Google" icon={<GoogleGlyph />} onPress={handleGoogle} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs }}>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
              <AppText variant="caption" tone="muted">
                o con tu correo
              </AppText>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
            </View>
          </Reveal>

          <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
            <Reveal delay={120}>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Controller
                  control={control}
                  name="first_name"
                  render={({ field }) => (
                    <View style={{ flex: 1 }}>
                      <FormInput
                        label="Nombre"
                        icon={User}
                        placeholder="Tu nombre"
                        value={field.value}
                        onChangeText={field.onChange}
                        onBlur={field.onBlur}
                        error={errors.first_name?.message}
                        autoComplete="given-name"
                        returnKeyType="next"
                      />
                    </View>
                  )}
                />
                <Controller
                  control={control}
                  name="last_name"
                  render={({ field }) => (
                    <View style={{ flex: 1 }}>
                      <FormInput
                        label="Apellido"
                        icon={User}
                        placeholder="Tu apellido"
                        value={field.value}
                        onChangeText={field.onChange}
                        onBlur={field.onBlur}
                        error={errors.last_name?.message}
                        autoComplete="family-name"
                        returnKeyType="next"
                      />
                    </View>
                  )}
                />
              </View>
            </Reveal>

            <Reveal delay={150}>
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

            <Reveal delay={180}>
              <Controller
                control={control}
                name="password"
                render={({ field }) => (
                  <FormInput
                    label="Contraseña"
                    icon={Lock}
                    placeholder="Mínimo 8 caracteres"
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
            </Reveal>

            <Reveal delay={210}>
              <Controller
                control={control}
                name="password_confirmation"
                render={({ field }) => (
                  <FormInput
                    label="Confirmar contraseña"
                    icon={Lock}
                    placeholder="Repite tu contraseña"
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
            </Reveal>

            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.xxs, marginTop: spacing.lg }}>
              <AppText variant="body" tone="muted">
                ¿Ya tienes cuenta?
              </AppText>
              <AppLink label="Inicia sesión" onPress={() => router.replace('/login')} />
            </View>
          </View>
        </ScrollView>

        {/* Sticky — the primary CTA is always reachable, never hidden below
            the fold on a long form (AGENTS.md §188/§212). */}
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
          <GlassSurface rounded={false} intensity={70} style={{ borderColor: colors.border }}>
            <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: insets.bottom + spacing.sm }}>
              {formError ? (
                <AppText variant="caption" tone="destructive" align="center" style={{ marginBottom: spacing.xs }}>
                  {formError}
                </AppText>
              ) : null}
              <AppButton label="CREAR MI CUENTA" onPress={handleSubmit(onSubmit)} loading={submitting} />
            </View>
          </GlassSurface>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
