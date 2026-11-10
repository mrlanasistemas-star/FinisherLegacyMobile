import { router } from 'expo-router';
import { Mail, MailCheck } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import Animated, { ZoomIn, useReducedMotion, FadeIn } from 'react-native-reanimated';

import { requestPasswordReset } from '@/api/account';
import { AppError } from '@/api/errors';
import { AppButton } from '@/components/app-button';
import { AuthFormError, AuthShell } from '@/components/auth/auth-shell';
import { FormInput } from '@/components/form-input';
import { colors, spacing } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';
import { useI18n } from '@/i18n';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Sends the same reset email the website sends. The answer is identical
 * whether or not the account exists (no account enumeration).
 */
export default function ForgotPasswordScreen() {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    setError(null);
    if (!EMAIL.test(email.trim())) {
      setError(t('Escribe un correo válido.'));
      return;
    }
    setSending(true);
    try {
      await requestPasswordReset(email.trim().toLowerCase());
      haptics.success();
      setSent(true);
    } catch (caught) {
      setError(caught instanceof AppError ? caught.message : t('No pudimos enviar el correo. Intenta otra vez.'));
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <AuthShell
        eyebrow={t('Correo enviado')}
        title={t('Revisa tu correo')}
        subtitle={t('Si existe una cuenta con {email}, te enviamos un enlace para crear una nueva contraseña. Puede tardar un par de minutos; revisa también spam.', { email: email.trim() })}
        footer={
          <>
            <AppButton label={t('Volver a iniciar sesión')} onPress={() => router.replace('/login')} />
            <AppButton label={t('Ya tengo mi código')} variant="ghost" size="md" onPress={() => router.push(`/reset-password?email=${encodeURIComponent(email.trim())}`)} />
          </>
        }>
        <Animated.View entering={reduceMotion ? FadeIn : ZoomIn.springify().damping(14)} style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
          <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: colors.goldWash, alignItems: 'center', justifyContent: 'center' }}>
            <MailCheck size={38} color={colors.accent} strokeWidth={1.6} />
          </View>
        </Animated.View>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow={t('Recuperar acceso')}
      title={t('¿Olvidaste tu contraseña?')}
      subtitle={t('Escribe el correo de tu cuenta y te enviaremos un enlace para crear una nueva.')}
      footer={<AppButton label={t('Enviar enlace')} onPress={submit} loading={sending} />}>
      <AuthFormError message={error} />
      <FormInput
        label={t('Correo electrónico')}
        icon={Mail}
        kind="email"
        placeholder="tu@correo.com"
        value={email}
        onChangeText={setEmail}
        returnKeyType="send"
        onSubmitEditing={submit}
        autoFocus
      />
    </AuthShell>
  );
}
