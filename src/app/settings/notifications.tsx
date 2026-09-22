import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Bell, BellOff, CircleAlert } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, View } from 'react-native';

import { AppError } from '@/api/errors';
import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { useRegisterPushDevice, useUnregisterPushDevice } from '@/hooks/use-push-devices';
import { useUiStore } from '@/stores/uiStore';
import { colors, spacing } from '@/theme/tokens';

/**
 * `Constants.expoConfig.extra.eas.projectId` is what
 * `Notifications.getExpoPushTokenAsync` needs to attribute a token to this
 * app — confirmed against the SDK 57 docs. `app.json` has no
 * `extra.eas.projectId` yet (no `eas init` has been run against a real
 * Expo account in this environment), so this reliably returns undefined
 * today — that's the honest, expected state, not a bug to work around.
 */
function getEasProjectId(): string | null {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? null;
}

export default function NotificationSettingsScreen() {
  const projectId = getEasProjectId();
  const isPhysicalDevice = Device.isDevice;
  const registeredUuid = useUiStore((state) => state.pushDeviceUuid);
  const setPushDeviceUuid = useUiStore((state) => state.setPushDeviceUuid);
  const registerDevice = useRegisterPushDevice();
  const unregisterDevice = useUnregisterPushDevice();
  const [error, setError] = useState<string | null>(null);

  const available = isPhysicalDevice && !!projectId;

  async function handleEnable() {
    setError(null);
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        setError('No podemos activar notificaciones sin tu permiso. Actívalo desde los ajustes del sistema.');
        return;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Finisher Legacy',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }

      const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId: projectId as string });
      const platform: 'ios' | 'android' | 'web' = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';

      const device = await registerDevice.mutateAsync({
        platform,
        provider: 'expo',
        token: tokenResponse.data,
        device_name: Device.deviceName ?? undefined,
      });
      setPushDeviceUuid(device.uuid);
    } catch (caught) {
      setError(caught instanceof AppError ? caught.message : 'No pudimos activar las notificaciones. Intenta de nuevo.');
    }
  }

  async function handleDisable() {
    if (!registeredUuid) return;
    setError(null);
    try {
      await unregisterDevice.mutateAsync(registeredUuid);
      setPushDeviceUuid(null);
    } catch (caught) {
      setError(caught instanceof AppError ? caught.message : 'No pudimos desactivar las notificaciones. Intenta de nuevo.');
    }
  }

  return (
    <Screen scroll>
      <ScreenHeader title="Notificaciones push" />

      <View style={{ gap: spacing.md, marginTop: spacing.sm, paddingBottom: spacing.xl }}>
        <AppText variant="body" tone="muted">
          Recibe un aviso cuando alguien de tu equipo de apoyo te escriba, cuando tu pedido cambie de estado, o cuando
          haya novedades sobre tus eventos.
        </AppText>

        {!available ? (
          <Card style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <CircleAlert size={18} color={colors.gold} />
              <AppText variant="bodyStrong">No disponible en este entorno todavía</AppText>
            </View>
            <AppText variant="caption" tone="muted">
              {!isPhysicalDevice
                ? 'Las notificaciones push sólo funcionan en un dispositivo físico, no en un simulador.'
                : 'Este build de la app todavía no tiene un proyecto EAS configurado, así que no podemos generar un token de notificaciones real todavía. Esto se resuelve del lado de configuración del proyecto, no es algo que puedas activar desde aquí.'}
            </AppText>
          </Card>
        ) : registeredUuid ? (
          <Card style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Bell size={18} color={colors.gold} />
              <AppText variant="bodyStrong">Notificaciones activadas en este dispositivo</AppText>
            </View>
            <AppButton
              label="Desactivar en este dispositivo"
              variant="secondary"
              onPress={handleDisable}
              loading={unregisterDevice.isPending}
            />
          </Card>
        ) : (
          <Card style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <BellOff size={18} color={colors.muted} />
              <AppText variant="bodyStrong">Notificaciones desactivadas</AppText>
            </View>
            <AppButton label="Activar notificaciones" onPress={handleEnable} loading={registerDevice.isPending} />
          </Card>
        )}

        {error ? (
          <AppText variant="caption" tone="destructive">
            {error}
          </AppText>
        ) : null}

        <AppText variant="caption" tone="muted">
          Nota: aunque actives las notificaciones aquí, la entrega real todavía depende de que el servidor tenga
          configurado un proveedor de envío — por ahora tu dispositivo queda registrado, pero el envío puede no
          estar disponible en todos los entornos.
        </AppText>
      </View>
    </Screen>
  );
}
