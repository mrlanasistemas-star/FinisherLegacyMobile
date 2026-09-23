import { router, useLocalSearchParams } from 'expo-router';
import { CircleCheck } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { resetPassword } from '@/api/account';
import { AppError } from '@/api/errors';
import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { FormInput } from '@/components/form-input';
import { InlineError } from '@/components/ui/inline-error';
import { TopBar } from '@/components/ui/top-bar';
import { colors, spacing } from '@/theme/tokens';

/**
 * New password from the reset email. Opened by the deep link
 * `finisherlegacy://reset-password?token=…&email=…`, or by pasting the
 * token from the email link.
 */
export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ token?: string; email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [token, setToken] = useState(params.token ?? '');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    setError(null);
    setFieldErrors({});
    if (password.length < 8) {
      setFieldErrors({ password: 'Usa al menos 8 caracteres.' });
      return;
    }
    if (password !== confirmation) {
      setFieldErrors({ password_confirmation: 'Las contraseñas no coinciden.' });
      return;
    }
    setSaving(true);
    try {
      await resetPassword({ token: token.trim(), email: email.trim().toLowerCase(), password, password_confirmation: confirmation });
      setDone(true);
    } catch (caught) {
      if (caught instanceof AppError && caught.fieldErrors) {
        const mapped: Record<string, string> = {};
        for (const [field, messages] of Object.entries(caught.fieldErrors)) mapped[field] = messages[0];
        setFieldErrors(mapped);
        if (mapped.email && !mapped.password) setError('El enlace ya no es válido o expiró. Pide uno nuevo.');
      } else {
        setError(caught instanceof AppError ? caught.message : 'No pudimos cambiar tu contraseña. Intenta otra vez.');
      }
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md }}>
        <CircleCheck size={56} color={colors.gold} />
        <AppText variant="title" align="center">
          Contraseña actualizada
        </AppText>
        <AppText variant="body" tone="muted" align="center">
          Por seguridad cerramos tu sesión en otros dispositivos. Entra con tu nueva contraseña.
        </AppText>
        <AppButton label="Iniciar sesión" onPress={() => router.replace('/login')} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.black }}>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <TopBar />
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl }}>
          <AppText variant="title" accessibilityRole="header">
            Crea una nueva contraseña
          </AppText>
          {!params.email ? <FormInput label="Correo electrónico" kind="email" value={email} onChangeText={setEmail} error={fieldErrors.email} /> : null}
          {!params.token ? (
            <FormInput label="Código del correo" hint="Está al final del enlace que te enviamos." autoCapitalize="none" autoCorrect={false} value={token} onChangeText={setToken} error={fieldErrors.token} />
          ) : null}
          <FormInput label="Nueva contraseña" kind="new-password" value={password} onChangeText={setPassword} error={fieldErrors.password} hint="Mínimo 8 caracteres." />
          <FormInput label="Confirma tu contraseña" kind="new-password" value={confirmation} onChangeText={setConfirmation} error={fieldErrors.password_confirmation} onSubmitEditing={submit} />
          <InlineError message={error} />
          <AppButton label="Guardar contraseña" onPress={submit} loading={saving} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
