import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { logoutRequest } from '@/api/auth';
import { unregisterPushDevice } from '@/api/pushDevices';
import { tokenStorage } from '@/api/secureStore';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';

/**
 * Sign out of this phone:
 *  1. unregister this phone's push device while the token is still valid, so
 *     the account's notifications stop arriving on a phone nobody is signed
 *     in to (the backend only reassigns the device on the NEXT sign-in);
 *  2. revoke the Sanctum token server-side;
 *  3. always clear SecureStore + the query cache + the session locally, even
 *     offline, so the user is never stuck signed in.
 *
 * A pending NFC activation is deliberately kept: it is tied to its user_id
 * (never confirmed for another account) and lets the same person finish a
 * written-but-unconfirmed Finisher Legacy Tag after signing back in.
 */
export function useLogout() {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    const pushDeviceUuid = useUiStore.getState().pushDeviceUuid;
    try {
      if (pushDeviceUuid) {
        await unregisterPushDevice(pushDeviceUuid).catch(() => {});
      }
      await logoutRequest();
    } catch {
      // Best-effort server-side revoke — the local session is cleared
      // either way so the user is never stuck unable to sign out.
    } finally {
      useUiStore.getState().setPushDeviceUuid(null);
      await tokenStorage.clear();
      queryClient.clear();
      useAuthStore.getState().clearSession();
      setLoading(false);
    }
  }

  return { logout, loading };
}
