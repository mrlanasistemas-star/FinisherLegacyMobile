/**
 * ¿Olvidaste tu NIP? Re-authenticate with the account password — or, for
 * accounts that never had one, a 6-digit code emailed to the account —
 * then create a new PIN. Protected items stay protected; every unlock is
 * revoked server-side and a security email goes out.
 */

import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { resetContentPin, sendContentPinRecoveryCode } from '@/api/contentPin';
import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { FormInput } from '@/components/form-input';
import { PinEntry } from '@/components/pin/pin-entry';
import { InlineError } from '@/components/ui/inline-error';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { TopBar } from '@/components/ui/top-bar';
import { pinErrorMessage } from '@/features/content-pin/use-content-pin';
import { useI18n } from '@/i18n';
import { useAuthStore } from '@/stores/authStore';
import { useContentPinStore } from '@/stores/contentPinStore';
import { showToast } from '@/stores/toastStore';
import { colors, fontFamily, spacing } from '@/theme/tokens';
import { ensureOnline } from '@/utils/network';

type Method = 'password' | 'code';
type Step = 'verify' | 'new' | 'confirm';

export default function PinRecoveryScreen() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const email = useAuthStore((s) => s.user?.email ?? null);
  const [method, setMethod] = useState<Method>('password');
  const [step, setStep] = useState<Step>('verify');
  const [secret, setSecret] = useState('');
  const [newPin, setNewPin] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode() {
    setSending(true);
    setError(null);
    try {
      await ensureOnline();
      await sendContentPinRecoveryCode();
      setCodeSent(true);
      showToast(email ? t('Te enviamos un código a {email}.', { email }) : t('Te enviamos un código a tu correo.'), 'success');
    } catch (caught) {
      setError(pinErrorMessage(caught, t('No pudimos enviar el código. Intenta otra vez.')));
    } finally {
      setSending(false);
    }
  }

  function continueVerify() {
    setError(null);
    if (method === 'password' && !secret) {
      setError(t('Escribe tu contraseña.'));
      return;
    }
    if (method === 'code' && !/^\d{6}$/.test(secret)) {
      setError(t('El código tiene 6 números.'));
      return;
    }
    setStep('new');
  }

  async function confirm(pin: string) {
    if (pin !== newPin) {
      setError(t('Los NIP no coinciden. Escríbelo de nuevo.'));
      setStep('new');
      setNewPin('');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await ensureOnline();
      await resetContentPin({ ...(method === 'password' ? { password: secret } : { code: secret }), pin: newPin, pin_confirmation: pin });
      setSecret('');
      setNewPin('');
      // The reset revoked every grant server-side.
      useContentPinStore.getState().lock();
      showToast(t('Listo. Tu NIP nuevo ya está activo.'), 'success');
      router.back();
    } catch (caught) {
      // Wrong password / code: back to the first step.
      setStep('verify');
      setNewPin('');
      setError(pinErrorMessage(caught, t('No pudimos restablecer tu NIP. Intenta otra vez.')));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <TopBar title={t('Restablecer NIP')} />
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: insets.bottom + spacing.xl, gap: spacing.md }}>
        {step === 'verify' ? (
          <View style={{ gap: spacing.md, maxWidth: 480, width: '100%', alignSelf: 'center' }}>
            <AppText style={{ fontFamily: fontFamily.heading, fontSize: 22 }}>{t('Confirma que eres tú')}</AppText>
            <AppText variant="body" tone="muted">
              {t('Usa la contraseña de tu cuenta o un código que te enviamos por correo. Tu contenido sigue protegido mientras tanto.')}
            </AppText>
            <SegmentedControl
              options={[
                { value: 'password', label: t('Contraseña') },
                { value: 'code', label: t('Código por correo') },
              ]}
              value={method}
              onChange={(value) => {
                setMethod(value as Method);
                setSecret('');
                setError(null);
              }}
            />
            {method === 'password' ? (
              <FormInput label={t('Tu contraseña')} kind="password" value={secret} onChangeText={setSecret} />
            ) : (
              <>
                <AppButton label={codeSent ? t('Enviar otro código') : t('Enviarme un código')} variant="secondary" size="md" loading={sending} onPress={sendCode} />
                {codeSent ? (
                  <FormInput label={t('Código de 6 números')} keyboardType="number-pad" maxLength={6} autoComplete="one-time-code" textContentType="oneTimeCode" value={secret} onChangeText={(v) => setSecret(v.replace(/\D/g, ''))} />
                ) : null}
              </>
            )}
            <InlineError message={error} />
            <AppButton label={t('Continuar')} size="md" disabled={method === 'code' && !codeSent} onPress={continueVerify} />
          </View>
        ) : step === 'new' ? (
          <PinEntry
            key="new"
            title={t('Crea tu NIP nuevo')}
            hint={t('De 4 a 6 números. Evita fechas o números obvios.')}
            error={error}
            onSubmit={(pin) => {
              setError(null);
              setNewPin(pin);
              setStep('confirm');
            }}
          />
        ) : (
          <PinEntry key="confirm" title={t('Confirma tu NIP nuevo')} error={error} loading={saving} submitLabel={t('Guardar NIP')} onSubmit={confirm} />
        )}
      </ScrollView>
    </View>
  );
}
