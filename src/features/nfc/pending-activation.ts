import * as SecureStore from 'expo-secure-store';

import { pendingActivationSchema, type PendingActivation } from '@/schemas/activation';

/**
 * The one activation that may be "in flight" on this device: authorized by
 * the backend and possibly already written to a chip, but not confirmed.
 * Persisted so a crash / kill / lost signal between the write and
 * `confirm` is recoverable on the next launch (see `recoverPendingActivation`).
 *
 * SecureStore (not AsyncStorage): it holds an intent id that, together
 * with the session token, can complete an activation.
 */

export interface PendingActivationStore {
  load(): Promise<PendingActivation | null>;
  save(pending: PendingActivation): Promise<void>;
  clear(): Promise<void>;
}

const KEY = 'fl_nfc_pending_activation';

export const securePendingActivationStore: PendingActivationStore = {
  async load() {
    try {
      const raw = await SecureStore.getItemAsync(KEY);
      if (!raw) return null;
      const parsed = pendingActivationSchema.safeParse(JSON.parse(raw));
      if (!parsed.success) {
        await SecureStore.deleteItemAsync(KEY);
        return null;
      }
      return parsed.data;
    } catch {
      return null;
    }
  },
  async save(pending) {
    try {
      await SecureStore.setItemAsync(KEY, JSON.stringify(pending));
    } catch {
      // Storage failure must not block the activation itself; recovery is a bonus.
    }
  },
  async clear() {
    try {
      await SecureStore.deleteItemAsync(KEY);
    } catch {
      // Nothing else to do.
    }
  },
};

/** In-memory store for tests. */
export function createMemoryPendingStore(initial: PendingActivation | null = null): PendingActivationStore & { current: () => PendingActivation | null } {
  let value = initial;
  return {
    current: () => value,
    async load() {
      return value;
    },
    async save(pending) {
      value = pending;
    },
    async clear() {
      value = null;
    },
  };
}

/** An `authorized` intent past its expiry is useless (the backend will reject it); a `written` one is always worth a confirm. */
export function isStalePending(pending: PendingActivation, now: Date = new Date()): boolean {
  if (pending.phase === 'written') return false;
  const expires = Date.parse(pending.expires_at);
  return Number.isFinite(expires) && expires < now.getTime();
}
