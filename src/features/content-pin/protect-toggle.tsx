/**
 * "Proteger con NIP" for one owner item (memory, moment, event photo).
 * Protecting needs only an active PIN and makes the item private on the
 * server; removing the protection needs the item unlocked (the server
 * answers 423 otherwise, so we send the athlete to the unlock screen).
 */

import { router, type Href } from 'expo-router';
import { Lock } from 'lucide-react-native';
import { ActivityIndicator, Switch, View } from 'react-native';

import type { ProtectableType } from '@/api/contentPin';
import { AppText } from '@/components/app-text';
import { useI18n } from '@/i18n';
import { useIsContentUnlocked } from '@/stores/contentPinStore';
import { showToast } from '@/stores/toastStore';
import { colors, fontFamily, spacing } from '@/theme/tokens';

import { isContentLockedError, openContentUnlock, pinErrorMessage, useContentPinStatus, useSetItemProtection } from './use-content-pin';

interface ProtectToggleProps {
  type: ProtectableType;
  id: string;
  isProtected: boolean;
}

export function ProtectToggle({ type, id, isProtected }: ProtectToggleProps) {
  const { t } = useI18n();
  const status = useContentPinStatus();
  const unlocked = useIsContentUnlocked();
  const mutation = useSetItemProtection();

  async function change(next: boolean) {
    if (!status.data?.enabled) {
      showToast(t('Primero crea tu NIP en Ajustes → Seguridad.'));
      router.push('/settings/content-pin' as Href);
      return;
    }
    if (!next && !unlocked) {
      openContentUnlock();
      return;
    }
    try {
      await mutation.mutateAsync({ type, id, protected: next });
      showToast(next ? t('Protegido con NIP. Ahora es privado.') : t('Ya no está protegido con NIP. Sigue privado.'), 'success');
    } catch (caught) {
      if (isContentLockedError(caught)) openContentUnlock();
      else showToast(pinErrorMessage(caught, t('No pudimos cambiar la protección. Intenta otra vez.')), 'destructive');
    }
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44 }}>
      <Lock size={15} color={colors.accent} strokeWidth={2} />
      <View style={{ flex: 1 }}>
        <AppText style={{ fontFamily: fontFamily.semibold, fontSize: 14, color: colors.foreground }}>{t('Proteger con NIP')}</AppText>
        <AppText variant="caption" tone="muted">
          {isProtected ? t('Solo tú lo abres, con tu NIP.') : t('Pide tu NIP para abrirlo. Queda privado.')}
        </AppText>
      </View>
      {mutation.isPending ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <Switch
          value={isProtected}
          onValueChange={change}
          trackColor={{ false: colors.surfaceMuted, true: colors.gold }}
          thumbColor={colors.white}
          ios_backgroundColor={colors.surfaceMuted}
          accessibilityLabel={t('Proteger con NIP')}
        />
      )}
    </View>
  );
}
