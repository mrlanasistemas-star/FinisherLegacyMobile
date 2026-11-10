import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { registerPushDevice } from '@/api/pushDevices';
import { ensureNotificationChannels } from '@/features/push/notification-channels';
import { useUiStore } from '@/stores/uiStore';

export type PushPermission = 'granted' | 'denied' | 'undetermined';

export type PushRegistrationResult =
  | { ok: true; deviceUuid: string }
  | { ok: false; reason: 'unavailable' | 'denied' | 'error'; message: string };

/**
 * `extra.eas.projectId` (app.json, written by `eas init`) is what attributes
 * the Expo push token to this app — required by `getExpoPushTokenAsync` in
 * SDK 57. `EXPO_PUBLIC_EAS_PROJECT_ID` is only a fallback for builds whose
 * config lost it.
 */
export function getEasProjectId(): string | null {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? null;
}

/** Remote push needs a physical device and an EAS project — simulators and unconfigured builds can't get a token. */
export function isPushAvailable(): boolean {
  return Device.isDevice && !!getEasProjectId() && Platform.OS !== 'web';
}

export async function getPushPermission(): Promise<PushPermission> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
  } catch {
    return 'undetermined';
  }
}

/**
 * Gets the Expo push token and stores it on the backend
 * (`POST /me/push-devices`, idempotent per token server-side).
 *
 * `prompt: false` never shows the system dialog — used at app start to
 * refresh the token when permission was already granted. The dialog only
 * appears from a contextual action (`prompt: true`): the athlete tapped
 * "Activar avisos" after we explained why.
 */
export async function registerForPush({ prompt }: { prompt: boolean }): Promise<PushRegistrationResult> {
  if (!isPushAvailable()) {
    return {
      ok: false,
      reason: 'unavailable',
      message: Device.isDevice
        ? 'Esta versión de la app todavía no puede recibir avisos.'
        : 'Los avisos sólo funcionan en un teléfono físico.',
    };
  }

  try {
    let permission = await getPushPermission();
    if (permission !== 'granted' && prompt) {
      const { status } = await Notifications.requestPermissionsAsync();
      permission = status === 'granted' ? 'granted' : 'denied';
    }
    if (permission !== 'granted') {
      return { ok: false, reason: 'denied', message: 'Activa las notificaciones de Finisher Legacy en los ajustes de tu teléfono.' };
    }

    await ensureNotificationChannels();
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: getEasProjectId() as string });
    return await storeToken(token);
  } catch {
    return { ok: false, reason: 'error', message: 'No pudimos activar los avisos. Intenta de nuevo.' };
  }
}

/**
 * Stores an Expo push token on the backend (idempotent per token). Also used
 * when the OS rotates the token (`addPushTokenListener` in use-push).
 */
export async function storeToken(token: string): Promise<PushRegistrationResult> {
  try {
    const device = await registerPushDevice({
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      provider: 'expo',
      token,
      device_name: Device.deviceName ?? undefined,
    });
    useUiStore.getState().setPushDeviceUuid(device.uuid);
    return { ok: true, deviceUuid: device.uuid };
  } catch {
    return { ok: false, reason: 'error', message: 'No pudimos activar los avisos. Intenta de nuevo.' };
  }
}
