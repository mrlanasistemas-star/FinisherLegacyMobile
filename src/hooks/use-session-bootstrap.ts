import { useEffect, useState } from 'react';

import { fetchMeRequest } from '@/api/auth';
import { tokenStorage } from '@/api/secureStore';
import { useAuthStore } from '@/stores/authStore';

export function useSessionBootstrap(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const token = await tokenStorage.get();

      if (!token) {
        if (!cancelled) {
          useAuthStore.getState().finishBootstrap(null);
          setReady(true);
        }
        return;
      }

      // Needed before the /me call so the request interceptor can attach it.
      useAuthStore.setState({ token });

      try {
        const user = await fetchMeRequest();
        if (!cancelled) {
          useAuthStore.getState().finishBootstrap({ user, token });
          setReady(true);
        }
      } catch {
        await tokenStorage.clear();
        if (!cancelled) {
          useAuthStore.getState().finishBootstrap(null);
          setReady(true);
        }
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  return ready;
}
