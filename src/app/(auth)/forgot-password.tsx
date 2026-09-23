import { router } from 'expo-router';
import { MailCheck } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { requestPasswordReset } from '@/api/account';
import { AppError } from '@/api/errors';
import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { FormInput } from '@/components/form-input';
import { InlineError } from '@/components/ui/inline-error';
import { TopBar } from '@/components/ui/top-bar';
import { colors, spacing } from '@/theme/tokens';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Sends the same reset email the website sends. The answer is identical
 * whether or not the account exists (no account enumeration).
 */
export default function ForgotPasswordScreen() {
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
      setSent(true);
    } catch (caught) {
      setError(caught instanceof AppError ? caught.message : 'No pudimos enviar el correo. Intenta otra vez.');
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.black }}>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <TopBar />
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl }}>
          {sent ? (
            <View style={{ alignItems: 'center', gap: spacing.md, marginTop: spacing.xl }}>
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.goldWash, alignItems: 'center', justifyContent: 'center' }}>
                <MailCheck size={32} color={colors.gold} />
              </View>
              <AppText variant="title" align="center">
                Revisa tu correo
              </AppText>
              <AppText variant="body" tone="muted" align="center">
                Si existe una cuenta con {email.trim()}, te enviamos un enlace para crear una nueva contraseña. Puede tardar un par de minutos; revisa también spam.
              </AppText>
              <AppButton label="Ya tengo mi código" variant="secondary" size="md" onPress={() => router.push(`/reset-password?email=${encodeURIComponent(email.trim())}`)} />
              <AppButton label="Volver a iniciar sesión" variant="ghost" size="md" onPress={() => router.replace('/login')} />
            </View>
          ) : (
            <>
              <AppText variant="title" accessibilityRole="header">
                ¿Olvidaste tu contraseña?
              </AppText>
              <AppText variant="body" tone="muted">
                Escribe el correo de tu cuenta y te enviaremos un enlace para crear una nueva.
              </AppText>
              <FormInput label="Correo electrónico" kind="email" placeholder="tú@correo.com" value={email} onChangeText={setEmail} returnKeyType="send" onSubmitEditing={submit} autoFocus />
              <InlineError message={error} />
              <AppButton label="Enviar enlace" onPress={submit} loading={sending} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
