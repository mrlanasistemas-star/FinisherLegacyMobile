/**
 * Desbloquear contenido protegido. A correct PIN returns a 10-minute grant
 * that is kept in memory only (stores/contentPinStore.ts); five wrong ones
 * lock the PIN server-side for 1, 2, 4 … minutes — shown as a countdown.
 */

import { router, type Href } from 'expo-router';
import { Lock } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { unlockContent } from '@/api/contentPin';
import { AppButton } from '@/components/app-button';
import { EmptyState } from '@/components/empty-state';
import { PinEntry } from '@/components/pin/pin-entry';
import { TopBar } from '@/components/ui/top-bar';
import { formatCountdown, lockoutUntil, pinErrorCode, pinErrorMessage, useContentPinStatus, useCountdown } from '@/features/content-pin/use-content-pin';
import { useI18n } from '@/i18n';
import { useContentPinStore } from '@/stores/contentPinStore';
import { colors, spacing } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';
import { ensureOnline } from '@/utils/network';

export default function PinUnlockScreen() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const status = useContentPinStatus();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);

  const serverLock = status.data?.retry_after ? status.dataUpdatedAt + status.data.retry_after * 1000 : null;
  const seconds = useCountdown(lockedUntil ?? serverLock);

  function close() {
    if (router.canGoBack()) router.back();
    else router.replace('/settings/content-pin' as Href);
  }

  async function submit(pin: string) {
    setLoading(true);
    setError(null);
    try {
      await ensureOnline();
      const grant = await unlockContent(pin);
      useContentPinStore.getState().unlock(grant.unlock_token, grant.expires_in);
      void haptics.success();
      close();
    } catch (caught) {
      void haptics.error();
      const until = lockoutUntil(caught);
      if (until) {
        setLockedUntil(until);
      } else if (pinErrorCode(caught) === 'PIN_NOT_SET') {
        void status.refetch();
      } else {
        setError(pinErrorMessage(caught, t('No pudimos verificar tu NIP. Intenta otra vez.')));
      }
    } finally {
      setLoading(false);
    }
  }

  const notSet = status.data && !status.data.enabled;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <TopBar title={t('Contenido protegido')} onBack={close} />
      </View>
      {notSet ? (
        <EmptyState
          icon={Lock}
          title={t('Aún no tienes un NIP')}
          message={t('La protección con NIP es opcional. Actívala en Ajustes → Seguridad para proteger recuerdos, momentos y fotos.')}
          actionLabel={t('Activar protección')}
          onAction={() => router.replace('/settings/content-pin' as Href)}
        />
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}>
          <PinEntry
            title={t('Escribe tu NIP')}
            hint={t('Para ver tu contenido protegido. Se vuelve a bloquear solo al salir de la app o en unos minutos.')}
            error={error}
            submitLabel={t('Desbloquear')}
            loading={loading}
            lockedSeconds={seconds}
            lockedLabel={t('Demasiados intentos. Vuelve a intentarlo en {time}.', { time: formatCountdown(seconds) })}
            onSubmit={submit}
            footer={<AppButton label={t('¿Olvidaste tu NIP?')} variant="ghost" size="sm" onPress={() => router.push('/settings/pin-recovery' as Href)} />}
          />
        </ScrollView>
      )}
    </View>
  );
}
