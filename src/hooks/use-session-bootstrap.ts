import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

import { fetchMeRequest } from '@/api/auth';
import { AppError } from '@/api/errors';
import { tokenStorage } from '@/api/secureStore';
import { useAuthStore } from '@/stores/authStore';
import type { User } from '@/types/models';

/**
 * Last `/me` seen for the stored token. Only used to reopen the app while the
 * server is unreachable (airplane mode, backend down): a network/timeout/5xx
 * error must not sign the athlete out. Tied to a token fingerprint so a stale
 * entry from a previous account is never used; a real 401 still signs out.
 */
const LAST_SESSION_KEY = 'session.lastUser';

function fingerprint(token: string): string {
  return `${token.length}:${token.slice(-12)}`;
}

async function readCachedUser(token: string): Promise<User | null> {
  try {
    const raw = await AsyncStorage.getItem(LAST_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { fp?: string; user?: User };
    return parsed.fp === fingerprint(token) && parsed.user ? parsed.user : null;
  } catch {
    return null;
  }
}

function rememberUser(token: string, user: User): void {
  AsyncStorage.setItem(LAST_SESSION_KEY, JSON.stringify({ fp: fingerprint(token), user })).catch(() => {});
}

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
        rememberUser(token, user);
        if (!cancelled) {
          useAuthStore.getState().finishBootstrap({ user, token });
          setReady(true);
        }
      } catch (error) {
        const offline =
          error instanceof AppError && (error.kind === 'network' || error.kind === 'timeout' || error.kind === 'server');
        const cached = offline ? await readCachedUser(token) : null;
        if (cached) {
          if (!cancelled) {
            useAuthStore.getState().finishBootstrap({ user: cached, token });
            setReady(true);
          }
          return;
        }
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
