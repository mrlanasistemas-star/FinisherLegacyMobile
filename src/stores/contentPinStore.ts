/**
 * The content-PIN unlock grant — IN MEMORY ONLY (never SecureStore, never
 * AsyncStorage, never the query persister). Security model (backend
 * App\Services\Privacy\ContentPin): the server mints a random grant bound
 * to this Bearer token, valid 10 minutes; the app sends it back as
 * `X-Content-Unlock` (src/api/client.ts).
 *
 * The app relocks on its own:
 *  - when the grant expires (timer + a check on every foreground);
 *  - after BACKGROUND_GRACE_MS in the background (a quick app switch keeps
 *    it, leaving the phone does not);
 *  - on logout / account switch (token change);
 *  - when the server answers CONTENT_LOCKED (grant revoked or expired).
 * On every lock, queries whose cached data holds unlocked protected items
 * are reset, so nothing protected stays on screen or in the persisted cache.
 */

import type { QueryClient } from '@tanstack/react-query';
import { AppState, type AppStateStatus } from 'react-native';
import { create } from 'zustand';

import { useAuthStore } from '@/stores/authStore';

const BACKGROUND_GRACE_MS = 30_000;
/** Drop the grant a little before the server does, so no request races its expiry. */
const EXPIRY_MARGIN_MS = 5_000;

interface ContentPinState {
  token: string | null;
  expiresAt: number | null;
  unlock: (token: string, expiresInSeconds: number) => void;
  lock: () => void;
}

let expiryTimer: ReturnType<typeof setTimeout> | null = null;
let backgroundedAt: number | null = null;
let queryClient: QueryClient | null = null;

export const useContentPinStore = create<ContentPinState>((set, get) => ({
  token: null,
  expiresAt: null,
  unlock: (token, expiresInSeconds) => {
    const expiresAt = Date.now() + Math.max(0, expiresInSeconds * 1000 - EXPIRY_MARGIN_MS);
    if (expiryTimer) clearTimeout(expiryTimer);
    expiryTimer = setTimeout(() => get().lock(), expiresAt - Date.now());
    set({ token, expiresAt });
    // Lists refetch with the grant: placeholders turn into the real items.
    void queryClient?.invalidateQueries();
  },
  lock: () => {
    if (expiryTimer) clearTimeout(expiryTimer);
    expiryTimer = null;
    const wasUnlocked = get().token !== null;
    set({ token: null, expiresAt: null });
    if (wasUnlocked) purgeUnlockedData();
  },
}));

/** The grant to send right now (null when locked or already expired). */
export function currentUnlockToken(): string | null {
  const { token, expiresAt } = useContentPinStore.getState();
  if (!token || !expiresAt) return null;
  if (Date.now() >= expiresAt) {
    useContentPinStore.getState().lock();
    return null;
  }
  return token;
}

export function useIsContentUnlocked(): boolean {
  return useContentPinStore((s) => s.token !== null);
}

/** Called once by QueryProvider so lock/unlock can refresh the cache. */
export function bindContentPinQueryClient(client: QueryClient) {
  queryClient = client;
}

/**
 * Any cached payload that mentions a protected item. Locked placeholders
 * match too — resetting them is harmless (they refetch as placeholders);
 * the point is that no unlocked copy survives the lock.
 */
function holdsUnlockedProtected(data: unknown): boolean {
  if (data === undefined || data === null) return false;
  try {
    return JSON.stringify(data).includes('"pin_protected":true');
  } catch {
    return false;
  }
}

function purgeUnlockedData() {
  const client = queryClient;
  if (!client) return;
  void client.resetQueries({ predicate: (query) => holdsUnlockedProtected(query.state.data) });
}

// Logout / another account → forget the grant immediately.
useAuthStore.subscribe((state, previous) => {
  if (state.token !== previous.token) useContentPinStore.getState().lock();
});

AppState.addEventListener('change', (next: AppStateStatus) => {
  const { token, expiresAt, lock } = useContentPinStore.getState();
  if (!token) return;
  if (next === 'background') {
    backgroundedAt = Date.now();
    return;
  }
  if (next === 'active') {
    const away = backgroundedAt !== null ? Date.now() - backgroundedAt : 0;
    backgroundedAt = null;
    if (away > BACKGROUND_GRACE_MS || (expiresAt !== null && Date.now() >= expiresAt)) lock();
  }
});
