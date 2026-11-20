/**
 * Ajustes → Seguridad → Protección con NIP. Optional: nothing is protected
 * until the athlete creates a PIN and marks memories, moments or photos.
 * Activate (create + confirm), change (current → new → confirm), lock now,
 * recover, and deactivate (PIN or account password — the items lose the
 * mark but stay private). The PIN only lives in component state while typed.
 */

import { useQueryClient } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { KeyRound, Lock, LockOpen, ShieldCheck, ShieldOff } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { changeContentPin, disableContentPin, enableContentPin } from '@/api/contentPin';
import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { ErrorState } from '@/components/error-state';
import { FormInput } from '@/components/form-input';
import { PinEntry } from '@/components/pin/pin-entry';
import { Skeleton } from '@/components/skeleton';
import { InlineError } from '@/components/ui/inline-error';
import { ListGroup, ListRow } from '@/components/ui/list-row';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Sheet } from '@/components/ui/sheet';
import { LargeTitleScroll, TopBar } from '@/components/ui/top-bar';
import {
  contentPinKeys,
  formatCountdown,
  lockContentNow,
  lockoutUntil,
  openContentUnlock,
  pinErrorMessage,
  useContentPinStatus,
  useCountdown,
} from '@/features/content-pin/use-content-pin';
import { useI18n } from '@/i18n';
import { useContentPinStore, useIsContentUnlocked } from '@/stores/contentPinStore';
import { showToast } from '@/stores/toastStore';
import { colors, fontFamily, spacing } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';
import { ensureOnline } from '@/utils/network';

type Mode = 'overview' | 'create' | 'create-confirm' | 'change-current' | 'change-new' | 'change-confirm';

export default function ContentPinScreen() {
  const { t, tc } = useI18n();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const status = useContentPinStatus();
  const unlocked = useIsContentUnlocked();

  const [mode, setMode] = useState<Mode>('overview');
  const [currentPin, setCurrentPin] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const seconds = useCountdown(lockedUntil);

  const [disableOpen, setDisableOpen] = useState(false);
  const [disableWith, setDisableWith] = useState<'pin' | 'password'>('pin');
  const [disableSecret, setDisableSecret] = useState('');
  const [disabling, setDisabling] = useState(false);

  const data = status.data;

  function reset(next: Mode = 'overview') {
    setMode(next);
    setCurrentPin('');
    setFirstPin('');
    setError(null);
  }

  function afterSave(message: string) {
    void queryClient.invalidateQueries({ queryKey: contentPinKeys.status });
    void haptics.success();
    showToast(message, 'success');
    reset();
  }

  async function save(confirmation: string) {
    if (confirmation !== firstPin) {
      setError(t('Los NIP no coinciden. Escríbelo de nuevo.'));
      setFirstPin('');
      setMode(mode === 'create-confirm' ? 'create' : 'change-new');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await ensureOnline();
      if (mode === 'create-confirm') {
        await enableContentPin(firstPin, confirmation);
        afterSave(t('Protección con NIP activada.'));
      } else {
        await changeContentPin(currentPin, firstPin, confirmation);
        // A new PIN revokes every unlock.
        useContentPinStore.getState().lock();
        afterSave(t('Tu NIP se actualizó.'));
      }
    } catch (caught) {
      void haptics.error();
      const until = lockoutUntil(caught);
      if (until) setLockedUntil(until);
      // A wrong current PIN sends the change back to its first step.
      setMode(mode === 'create-confirm' ? 'create' : 'change-current');
      setCurrentPin('');
      setFirstPin('');
      setError(pinErrorMessage(caught, t('No pudimos guardar tu NIP. Intenta otra vez.')));
    } finally {
      setSaving(false);
    }
  }

  async function disable() {
    if (!disableSecret) return;
    setDisabling(true);
    setError(null);
    try {
      await ensureOnline();
      await disableContentPin(disableWith === 'pin' ? { pin: disableSecret } : { password: disableSecret });
      useContentPinStore.getState().lock();
      setDisableOpen(false);
      setDisableSecret('');
      afterSave(t('Protección con NIP desactivada. Tu contenido sigue privado.'));
      void queryClient.invalidateQueries();
    } catch (caught) {
      const until = lockoutUntil(caught);
      setError(
        until
          ? t('Demasiados intentos. Vuelve a intentarlo en {time}.', { time: formatCountdown(Math.ceil((until - Date.now()) / 1000)) })
          : pinErrorMessage(caught, t('No pudimos desactivar la protección. Intenta otra vez.')),
      );
    } finally {
      setDisabling(false);
    }
  }

  // ── PIN steps (full screen) ────────────────────────────────────────────
  if (mode !== 'overview') {
    const step =
      mode === 'create'
        ? { title: t('Crea tu NIP'), hint: t('De 4 a 6 números. Evita fechas o números obvios.') }
        : mode === 'create-confirm' || mode === 'change-confirm'
          ? { title: t('Confirma tu NIP'), hint: t('Escríbelo otra vez.') }
          : mode === 'change-current'
            ? { title: t('Tu NIP actual'), hint: null }
            : { title: t('Tu NIP nuevo'), hint: t('De 4 a 6 números. Evita fechas o números obvios.') };

    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        <View style={{ paddingHorizontal: spacing.lg }}>
          <TopBar title={t('Protección con NIP')} onBack={() => reset()} />
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}>
          <PinEntry
            key={mode}
            title={step.title}
            hint={step.hint}
            error={error}
            loading={saving}
            lockedSeconds={seconds}
            lockedLabel={t('Demasiados intentos. Vuelve a intentarlo en {time}.', { time: formatCountdown(seconds) })}
            submitLabel={mode.endsWith('confirm') ? t('Guardar NIP') : t('Continuar')}
            onSubmit={(pin) => {
              setError(null);
              if (mode === 'create') {
                setFirstPin(pin);
                setMode('create-confirm');
              } else if (mode === 'change-current') {
                setCurrentPin(pin);
                setMode('change-new');
              } else if (mode === 'change-new') {
                setFirstPin(pin);
                setMode('change-confirm');
              } else {
                void save(pin);
              }
            }}
            footer={
              mode === 'change-current' ? (
                <AppButton label={t('¿Olvidaste tu NIP?')} variant="ghost" size="sm" onPress={() => router.push('/settings/pin-recovery' as Href)} />
              ) : null
            }
          />
        </ScrollView>
      </View>
    );
  }

  // ── Overview ───────────────────────────────────────────────────────────
  const counts = data?.protected_counts;
  const total = counts ? counts.stories + counts.moments + counts.media : 0;

  return (
    <View style={{ flex: 1 }}>
      <LargeTitleScroll
        title={t('Protección con NIP')}
        subtitle={t('Opcional. Protege con un NIP de 4 a 6 números los recuerdos, momentos y fotos que tú elijas.')}
        contentContainerStyle={{ gap: spacing.lg }}>
        {status.isPending ? (
          <Skeleton height={120} />
        ) : status.isError || !data ? (
          <ErrorState error={status.error} message={t('No pudimos cargar tu protección con NIP.')} onRetry={status.refetch} />
        ) : !data.enabled ? (
          <View style={{ gap: spacing.md }}>
            <ListGroup footer={t('Al proteger algo, queda privado y solo tú lo ves después de escribir tu NIP. Nadie más — ni el equipo de Finisher Legacy — puede abrirlo.')}>
              <ListRow icon={ShieldCheck} label={t('Activar protección con NIP')} description={t('Crea tu NIP y confírmalo.')} onPress={() => reset('create')} />
            </ListGroup>
          </View>
        ) : (
          <>
            <ListGroup
              title={t('Estado')}
              footer={t('Se vuelve a bloquear solo al salir de la app o a los {minutes} minutos.', { minutes: Math.round(data.grant_ttl_seconds / 60) })}>
              <ListRow
                icon={unlocked ? LockOpen : Lock}
                label={unlocked ? t('Desbloqueado') : t('Bloqueado')}
                description={
                  total > 0
                    ? [
                        counts && counts.stories ? tc('{count} recuerdo|{count} recuerdos', counts.stories) : null,
                        counts && counts.moments ? tc('{count} momento|{count} momentos', counts.moments) : null,
                        counts && counts.media ? tc('{count} foto o video|{count} fotos o videos', counts.media) : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')
                    : t('Aún no proteges nada. Usa “Proteger con NIP” en un recuerdo, momento o foto.')
                }
                trailing={
                  <AppButton
                    label={unlocked ? t('Bloquear ahora') : t('Desbloquear')}
                    variant="secondary"
                    size="sm"
                    onPress={() => (unlocked ? void lockContentNow() : openContentUnlock())}
                  />
                }
              />
            </ListGroup>

            <ListGroup title={t('NIP')}>
              <ListRow icon={KeyRound} label={t('Cambiar NIP')} description={t('Necesitas tu NIP actual.')} onPress={() => reset('change-current')} />
              <ListRow icon={ShieldCheck} label={t('¿Olvidaste tu NIP?')} description={t('Restablécelo con tu contraseña o un código por correo.')} onPress={() => router.push('/settings/pin-recovery' as Href)} />
            </ListGroup>

            <ListGroup>
              <ListRow
                icon={ShieldOff}
                label={t('Desactivar protección')}
                destructive
                description={t('Tus elementos protegidos dejan de pedir NIP, pero siguen privados.')}
                onPress={() => {
                  setError(null);
                  setDisableOpen(true);
                }}
              />
            </ListGroup>
          </>
        )}
      </LargeTitleScroll>

      {disableOpen ? (
        <Sheet
          visible
          onClose={() => {
            setDisableOpen(false);
            setDisableSecret('');
            setError(null);
          }}>
          <View style={{ gap: spacing.md, paddingBottom: spacing.sm }}>
            <AppText style={{ fontFamily: fontFamily.semibold, fontSize: 18 }}>{t('¿Desactivar la protección con NIP?')}</AppText>
            <AppText variant="body" tone="muted">
              {t('Tus recuerdos, momentos y fotos protegidos dejarán de pedir NIP. Siguen privados: nadie más los verá hasta que tú cambies su visibilidad.')}
            </AppText>
            <SegmentedControl
              options={[
                { value: 'pin', label: t('Con mi NIP') },
                { value: 'password', label: t('Con mi contraseña') },
              ]}
              value={disableWith}
              onChange={(value) => {
                setDisableWith(value);
                setDisableSecret('');
                setError(null);
              }}
            />
            {disableWith === 'pin' ? (
              <FormInput
                label={t('Tu NIP')}
                kind="password"
                keyboardType="number-pad"
                maxLength={6}
                value={disableSecret}
                onChangeText={(v) => setDisableSecret(v.replace(/\D/g, ''))}
              />
            ) : (
              <FormInput label={t('Tu contraseña')} kind="password" value={disableSecret} onChangeText={setDisableSecret} />
            )}
            <InlineError message={error} />
            <AppButton label={t('Desactivar protección')} variant="destructive" size="md" loading={disabling} disabled={!disableSecret} onPress={disable} />
          </View>
        </Sheet>
      ) : null}
    </View>
  );
}
