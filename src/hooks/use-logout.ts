import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { logoutRequest } from '@/api/auth';
import { tokenStorage } from '@/api/secureStore';
import { useAuthStore } from '@/stores/authStore';

export function useLogout() {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    try {
      await logoutRequest();
    } catch {
      // Best-effort server-side revoke — the local session is cleared
      // either way so the user is never stuck unable to sign out.
    } finally {
      await tokenStorage.clear();
      queryClient.clear();
      useAuthStore.getState().clearSession();
      setLoading(false);
    }
  }

  return { logout, loading };
}
