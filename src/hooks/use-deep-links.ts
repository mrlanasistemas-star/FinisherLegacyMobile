import * as Linking from 'expo-linking';
import { router, type Href } from 'expo-router';
import { useEffect } from 'react';

import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';

function toInAppPath(url: string): string | null {
  try {
    const { path, queryParams } = Linking.parse(url);
    if (!path) return null;
    const entries = Object.entries(queryParams ?? {}).filter((entry): entry is [string, string] => typeof entry[1] === 'string');
    const query = entries.length > 0 ? `?${new URLSearchParams(entries).toString()}` : '';
    return `/${path}${query}`;
  } catch {
    return null;
  }
}

/**
 * finisherlegacy:// links (legacy code, event, athlete profile) work
 * automatically via Expo Router's own Linking integration while the user
 * is authenticated. This hook only covers the case Router can't: a link
 * opened while logged out gets redirected to the auth stack — we capture
 * the intended path here and replay it once the session exists
 * (AGENTS.md §40 "Guardar destino pendiente cuando corresponda").
 */
export function useDeepLinks() {
  const url = Linking.useURL();
  const status = useAuthStore((state) => state.status);
  const pendingDeepLink = useUiStore((state) => state.pendingDeepLink);
  const setPendingDeepLink = useUiStore((state) => state.setPendingDeepLink);

  useEffect(() => {
    if (!url || status === 'authenticated') return;
    const path = toInAppPath(url);
    if (path) setPendingDeepLink(path);
  }, [url, status, setPendingDeepLink]);

  useEffect(() => {
    if (status !== 'authenticated' || !pendingDeepLink) return;
    // Runtime-computed target from an external URL — not a statically
    // known literal, so typed routes can't verify it at compile time.
    const target = pendingDeepLink as Href;
    setPendingDeepLink(null);
    router.replace(target);
  }, [status, pendingDeepLink, setPendingDeepLink]);
}
