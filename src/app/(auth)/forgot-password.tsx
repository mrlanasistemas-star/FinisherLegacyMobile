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

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Sends the same reset email the website sends. The answer is identical
 * whether or not the account exists (no account enumeration).
 */
export default function ForgotPasswordScreen() {
  const reduceMotion = useReducedMotion();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    setError(null);
    if (!EMAIL.test(email.trim())) {
      setError('Escribe un correo válido.');
      return;
    }
    setSending(true);
    try {
      await requestPasswordReset(email.trim().toLowerCase());
      haptics.success();
      setSent(true);
    } catch (caught) {
      setError(caught instanceof AppError ? caught.message : 'No pudimos enviar el correo. Intenta otra vez.');
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <AuthShell
        eyebrow="Correo enviado"
        title="Revisa tu correo"
        subtitle={`Si existe una cuenta con ${email.trim()}, te enviamos un enlace para crear una nueva contraseña. Puede tardar un par de minutos; revisa también spam.`}
        footer={
          <>
            <AppButton label="Volver a iniciar sesión" onPress={() => router.replace('/login')} />
            <AppButton label="Ya tengo mi código" variant="ghost" size="md" onPress={() => router.push(`/reset-password?email=${encodeURIComponent(email.trim())}`)} />
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
      eyebrow="Recuperar acceso"
      title="¿Olvidaste tu contraseña?"
      subtitle="Escribe el correo de tu cuenta y te enviaremos un enlace para crear una nueva."
      footer={<AppButton label="Enviar enlace" onPress={submit} loading={sending} />}>
      <AuthFormError message={error} />
      <FormInput
        label="Correo electrónico"
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
