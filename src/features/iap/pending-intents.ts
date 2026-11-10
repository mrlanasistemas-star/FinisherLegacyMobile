/**
 * Which Legacy story a store purchase is for, remembered on the device from
 * the moment the store sheet opens until the backend granted the space and
 * the transaction was finished. A consumable store transaction does not
 * carry our story id, so without this an interrupted purchase (app killed,
 * no signal, Ask to Buy approved later, Android "pending" paid in cash)
 * could not be credited on the next launch.
 *
 * Keyed by store product id (one pending intent per product). AsyncStorage:
 * it holds no secret — the backend re-verifies the purchase and the story
 * owner anyway.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { pendingIapIntentSchema, type PendingIapIntent } from '@/schemas/iap';

export interface PendingIntentStore {
  get(productId: string): Promise<PendingIapIntent | null>;
  save(intent: PendingIapIntent): Promise<void>;
  clear(productId: string): Promise<void>;
}

const KEY = 'fl_iap_pending_intents';
/** Older than this, an intent is stale (Android refunds unacknowledged purchases after 3 days). */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

async function readAll(): Promise<PendingIapIntent[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const list: unknown = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    const now = Date.now();
    return list.flatMap((row) => {
      const parsed = pendingIapIntentSchema.safeParse(row);
      return parsed.success && now - parsed.data.createdAt < MAX_AGE_MS ? [parsed.data] : [];
    });
  } catch {
    return [];
  }
}

async function writeAll(list: PendingIapIntent[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Storage failure must not block the purchase; recovery is a bonus.
  }
}

export const asyncPendingIntentStore: PendingIntentStore = {
  async get(productId) {
    return (await readAll()).find((i) => i.productId === productId) ?? null;
  },
  async save(intent) {
    const list = (await readAll()).filter((i) => i.productId !== intent.productId);
    await writeAll([...list, intent]);
  },
  async clear(productId) {
    await writeAll((await readAll()).filter((i) => i.productId !== productId));
  },
};

/** In-memory store for tests. */
export function createMemoryIntentStore(initial: PendingIapIntent[] = []): PendingIntentStore & { all: () => PendingIapIntent[] } {
  let list = [...initial];
  return {
    all: () => list,
    async get(productId) {
      return list.find((i) => i.productId === productId) ?? null;
    },
    async save(intent) {
      list = [...list.filter((i) => i.productId !== intent.productId), intent];
    },
    async clear(productId) {
      list = list.filter((i) => i.productId !== productId);
    },
  };
}
