import * as Network from 'expo-network';

import { AppError } from '@/api/errors';

export const OFFLINE_MESSAGE = 'Sin conexión. Conéctate a Internet e intenta otra vez.';

/**
 * Writes (follow, comment, reaction, cart, checkout, payment, upload) fail
 * fast and honestly while offline — never a fake success, never a 15s
 * timeout on a connection we already know is down. Reads keep showing
 * cached data instead.
 */
export async function ensureOnline(): Promise<void> {
  const state = await Network.getNetworkStateAsync().catch(() => null);
  if (state?.isConnected === false || state?.isInternetReachable === false) {
    throw new AppError({ kind: 'network', message: OFFLINE_MESSAGE });
  }
}

/** Wraps a mutation function so it rejects immediately when offline. */
export function onlineOnly<TArgs extends unknown[], TResult>(fn: (...args: TArgs) => Promise<TResult>) {
  return async (...args: TArgs): Promise<TResult> => {
    await ensureOnline();
    return fn(...args);
  };
}
