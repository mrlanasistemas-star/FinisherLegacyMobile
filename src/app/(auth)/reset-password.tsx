import { router, useLocalSearchParams } from 'expo-router';
import { CircleCheck, Lock } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, ZoomIn, useReducedMotion } from 'react-native-reanimated';

import { resetPassword } from '@/api/account';
import { AppError } from '@/api/errors';
import { AppButton } from '@/components/app-button';
import { AuthFormError, AuthShell } from '@/components/auth/auth-shell';
import { FormInput } from '@/components/form-input';
import { colors, spacing } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';

/**
 * New password from the reset email. Opened by the deep link
 * `finisherlegacy://reset-password?token=…&email=…`, or by pasting the
 * token from the email link.
 */
export default function ResetPasswordScreen() {
  const reduceMotion = useReducedMotion();
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
      haptics.success();
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
      <AuthShell
        back={false}
        eyebrow="Listo"
        title="Contraseña actualizada"
        subtitle="Por seguridad cerramos tu sesión en otros dispositivos. Entra con tu nueva contraseña."
        footer={<AppButton label="Iniciar sesión" onPress={() => router.replace('/login')} />}>
        <Animated.View entering={reduceMotion ? FadeIn : ZoomIn.springify().damping(14)} style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
          <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: colors.successWash, alignItems: 'center', justifyContent: 'center' }}>
            <CircleCheck size={40} color={colors.success} strokeWidth={1.6} />
          </View>
        </Animated.View>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Recuperar acceso"
      title="Crea una nueva contraseña"
      footer={<AppButton label="Guardar contraseña" onPress={submit} loading={saving} />}>
      <AuthFormError message={error} />
      {!params.email ? <FormInput label="Correo electrónico" kind="email" placeholder="tu@correo.com" value={email} onChangeText={setEmail} error={fieldErrors.email} /> : null}
      {!params.token ? (
        <FormInput label="Código del correo" hint="Está al final del enlace que te enviamos." autoCapitalize="none" autoCorrect={false} value={token} onChangeText={setToken} error={fieldErrors.token} />
      ) : null}
      <FormInput label="Nueva contraseña" icon={Lock} kind="new-password" value={password} onChangeText={setPassword} error={fieldErrors.password} hint="Mínimo 8 caracteres." />
      <FormInput
        label="Confirma tu contraseña"
        icon={Lock}
        kind="new-password"
        value={confirmation}
        onChangeText={setConfirmation}
        error={fieldErrors.password_confirmation}
        returnKeyType="done"
        onSubmitEditing={submit}
      />
    </AuthShell>
  );
}
