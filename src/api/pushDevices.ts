import { apiClient } from '@/api/client';
import { toAppError } from '@/api/errors';
import type { PushDevice } from '@/types/models';

export interface RegisterPushDevicePayload {
  platform: 'ios' | 'android' | 'web';
  provider: string;
  token: string;
  device_name?: string;
}

/**
 * Pure storage on the backend — it never calls Expo/FCM/APNs itself
 * (confirmed reading `Me\PushDeviceController`). Actual delivery requires a
 * real Expo push token obtained on-device (`expo-notifications`, not yet a
 * dependency) and a physical device/EAS build — Expo Go cannot receive
 * remote push. See docs/MOBILE_BACKEND_REQUIREMENTS.md.
 */
export async function registerPushDevice(payload: RegisterPushDevicePayload): Promise<PushDevice> {
  try {
    const { data } = await apiClient.post<{ data: PushDevice }>('me/push-devices', payload);
    return data.data;
  } catch (error) {
    throw toAppError(error);
  }
}

export async function unregisterPushDevice(uuid: string): Promise<void> {
  try {
    await apiClient.delete(`me/push-devices/${uuid}`);
  } catch (error) {
    throw toAppError(error);
  }
}
