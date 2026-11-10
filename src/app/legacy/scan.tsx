import { router, type Href } from 'expo-router';
import { KeyRound, X } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';

import { extractLegacyCode, normalizeManualCode } from '@/api/legacyCodes';
import { AppText } from '@/components/app-text';
import { ActivationShell } from '@/components/nfc/activation-shell';
import { StepButton } from '@/components/nfc/step-button';
import { TapIllustration, type TapPhase } from '@/components/nfc/tap-illustration';
import { failureCopy } from '@/features/nfc/activation-copy';
import { readTagOnce } from '@/features/nfc/activation-session';
import { nativeNfcDriver } from '@/features/nfc/nfc-driver';
import type { ActivationFailure } from '@/features/nfc/nfc-errors';
import { webOrigin } from '@/features/nfc/use-activation';
import { classifyFlUrl } from '@/features/nfc/url-policy';
import { useI18n } from '@/i18n';
import { colors, fontFamily, radius, spacing } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';

const PLATFORM: 'ios' | 'android' = Platform.OS === 'ios' ? 'ios' : 'android';

type ReadNotice = { title: string; body: string; action?: 'activate' | 'settings' } | null;

/**
 * "Leer mi Finisher Legacy" — the in-app scan entry (route kept as
 * `/legacy/scan` for old links). Reads a chip with the phone's NFC and
 * routes by what it carries — it never writes:
 *   /t/{code} → /nfc/t/{code} · /n/{token} → /nfc/{token} · /l/{code} → /legacy/{code}
 *   blank chip → offer the activation wizard.
 * Printed codes from earlier plates/products still work by typing them.
 */
export default function ScanScreen() {
  const { t } = useI18n();
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [phase, setPhase] = useState<TapPhase>('idle');
  const [notice, setNotice] = useState<ReadNotice>(null);

  function close() {
    if (router.canGoBack()) router.back();
    else router.replace('/legacy');
  }

  function showFailure(failure: ActivationFailure) {
    if (failure.kind === 'cancelled') {
      setPhase('idle');
      return;
    }
    const copy = failureCopy(failure);
    setNotice({ title: copy.title, body: copy.body, action: copy.action === 'settings' ? 'settings' : undefined });
    setPhase('error');
  }

  async function read() {
    if (reading) return;
    setReading(true);
    setNotice(null);
    setPhase('searching');
    try {
      const outcome = await readTagOnce(nativeNfcDriver());
      if (outcome.type === 'failed') {
        if (outcome.failure.kind !== 'cancelled') haptics.error();
        showFailure(outcome.failure);
        return;
      }
      for (const uri of outcome.uris) {
        const link = classifyFlUrl(uri, webOrigin);
        if (!link) continue;
        haptics.success();
        setPhase('done');
        const href = (link.kind === 'tag' ? `/nfc/t/${link.code}` : link.kind === 'nfc_token' ? `/nfc/${link.token}` : `/legacy/${link.code}`) as Href;
        router.replace(href);
        return;
      }
      haptics.warning();
      setPhase('idle');
      setNotice(
        outcome.blank
          ? { title: t('Este Finisher Legacy aún no está activado'), body: t('Actívalo con el código de la tarjeta que venía en tu empaque.'), action: 'activate' }
          : { title: t('No es un Finisher Legacy'), body: t('Este chip tiene información de otra app o servicio. Acerca el tag que venía en tu empaque.') },
      );
    } finally {
      setReading(false);
    }
  }

  function submitCode() {
    const normalized = extractLegacyCode(code) ?? normalizeManualCode(code);
    if (normalized.length < 4) {
      setCodeError(t('Escribe el código completo, tal como aparece impreso.'));
      return;
    }
    haptics.success();
    setCodeError(null);
    if (/^AST[A-Z0-9]+$/.test(normalized)) router.replace({ pathname: '/gear/claim', params: { code: normalized } });
    else router.replace(`/legacy/${normalized}` as Href);
  }

  return (
    <ActivationShell
      stepKey="scan"
      title={t('Leer mi Finisher Legacy')}
      leading={{ icon: X, label: t('Cerrar'), onPress: close }}
      footer={
        <>
          {notice?.action === 'activate' ? <StepButton label={t('Activar mi Finisher Legacy')} onPress={() => router.replace('/activate' as Href)} /> : null}
          {notice?.action === 'settings' ? <StepButton label={t('Abrir ajustes de NFC')} onPress={() => nativeNfcDriver().openSettings()} /> : null}
          <StepButton
            label={reading ? (PLATFORM === 'android' ? t('Cancelar lectura') : t('Buscando…')) : t('Leer con NFC')}
            variant={notice?.action || reading ? 'secondary' : 'primary'}
            loading={reading && PLATFORM === 'ios'}
            onPress={reading ? () => nativeNfcDriver().endSession() : read}
            accessibilityHint={reading ? t('Cancela la lectura') : t('Activa el lector NFC del teléfono')}
          />
        </>
      }>
      <View style={{ alignItems: 'center' }}>
        <TapIllustration phase={phase} platform={PLATFORM} size={200} />
      </View>

      <View style={{ gap: spacing.xs }} accessibilityLiveRegion="polite">
        <AppText variant="title" accessibilityRole="header">
          {notice?.title ?? (reading ? t('Acerca tu Finisher Legacy') : t('Acerca tu teléfono al tag'))}
        </AppText>
        <AppText variant="body" tone="muted">
          {notice?.body ??
            (PLATFORM === 'ios'
              ? t('Toca “Leer con NFC” y acerca el tag a la parte superior de tu iPhone.')
              : t('Toca “Leer con NFC” y acerca el tag al centro de la parte trasera del teléfono.'))}
        </AppText>
      </View>

      <View style={styles.divider} />

      <View style={{ gap: spacing.xs }}>
        <AppText variant="bodyStrong">{t('¿Tu pieza trae un código impreso?')}</AppText>
        <AppText variant="caption" tone="muted">
          {t('Legacy Plates y productos anteriores se conectan escribiendo su código.')}
        </AppText>
        <View style={[styles.field, codeError ? { borderColor: colors.destructive } : null]}>
          <KeyRound size={18} color={colors.accent} strokeWidth={1.8} />
          <TextInput
            value={code}
            onChangeText={(text) => {
              setCode(text.toUpperCase());
              if (codeError) setCodeError(null);
            }}
            placeholder={t('Ej. Q8K2MX7P')}
            placeholderTextColor={colors.subtle}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            returnKeyType="go"
            onSubmitEditing={submitCode}
            accessibilityLabel={t('Código impreso')}
            style={styles.input}
          />
        </View>
        {codeError ? (
          <AppText variant="caption" tone="destructive">
            {codeError}
          </AppText>
        ) : null}
        <StepButton label={t('Usar código')} variant="secondary" onPress={submitCode} disabled={code.trim().length < 4} />
      </View>
    </ActivationShell>
  );
}

const styles = StyleSheet.create({
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.hairline, marginVertical: spacing.xs },
  field: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.input,
  },
  input: { flex: 1, minHeight: 46, fontFamily: fontFamily.medium, fontSize: 16, letterSpacing: 1, color: colors.foreground, paddingVertical: 0 },
});
