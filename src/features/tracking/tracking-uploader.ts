import * as Network from 'expo-network';

import { AppError } from '@/api/errors';
import { tokenStorage } from '@/api/secureStore';
import { uploadTrackingPoints } from '@/api/tracking';
import { useAuthStore } from '@/stores/authStore';

import { backoffDelay, classifyUploadFailure, nextBatch, removeSent } from './points';
import { loadTrackingRecord, updateTrackingRecord } from './tracking-storage';

let inFlight: Promise<void> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let attempt = 0;
let networkSubscription: { remove: () => void } | null = null;
let onSessionClosed: (() => void) | null = null;
let onDrainedAfterStop: (() => void) | null = null;

/** Called (outside the flush) once the buffer is empty for a session the athlete already stopped. */
export function setDrainedAfterStopHandler(handler: () => void) {
  onDrainedAfterStop = handler;
}

/** The controller registers how to shut GPS down if the server closed the session. */
export function setSessionClosedHandler(handler: () => void) {
  onSessionClosed = handler;
}

/**
 * Sends the offline buffer in ≤100-point batches, oldest first. Transient
 * failures keep every point and retry with exponential backoff; coming
 * back online retries immediately. Only one flush runs at a time.
 */
export function flushTrackingPoints(): Promise<void> {
  inFlight ??= runFlush().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function runFlush(): Promise<void> {
  const token = useAuthStore.getState().token ?? (await tokenStorage.get().catch(() => null));
  if (!token) {
    await updateTrackingRecord((r) => ({ ...r, lastError: 'login' }));
    return;
  }

  // Bounded loop: a long offline stretch drains in one go, but never spins forever.
  for (let round = 0; round < 60; round += 1) {
    const record = await loadTrackingRecord();
    if (!record || record.pending.length === 0) {
      attempt = 0;
      if (record?.stopRequested) setTimeout(() => onDrainedAfterStop?.(), 0);
      return;
    }
    const batch = nextBatch(record.pending, record.batchMax);

    try {
      await uploadTrackingPoints(record.sessionUuid, batch, token);
      attempt = 0;
      await updateTrackingRecord((r) =>
        r.sessionUuid === record.sessionUuid
          ? { ...r, pending: removeSent(r.pending, batch), sentCount: r.sentCount + batch.length, lastSyncAt: new Date().toISOString(), lastError: null }
          : r,
      );
    } catch (error) {
      const appError = error instanceof AppError ? error : null;
      const policy = classifyUploadFailure(appError?.kind ?? 'unknown', appError?.status);

      if (policy === 'drop_batch') {
        await updateTrackingRecord((r) => ({ ...r, pending: removeSent(r.pending, batch) }));
        continue;
      }
      if (policy === 'session_closed') {
        await updateTrackingRecord((r) => ({ ...r, pending: [], lastError: 'closed' }));
        onSessionClosed?.();
        return;
      }
      if (policy === 'needs_login') {
        await updateTrackingRecord((r) => ({ ...r, lastError: 'login' }));
        return;
      }

      await updateTrackingRecord((r) => ({ ...r, lastError: appError?.kind === 'network' || appError?.kind === 'timeout' ? 'offline' : 'server' }));
      scheduleRetry();
      return;
    }
  }
}

function scheduleRetry() {
  if (retryTimer) return;
  const delay = backoffDelay(attempt);
  attempt += 1;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    flushTrackingPoints().catch(() => {});
  }, delay);
}

/** Retry the moment the connection comes back (foreground JS runtime). */
export function watchConnectivity() {
  if (networkSubscription) return;
  networkSubscription = Network.addNetworkStateListener((state) => {
    if (state.isConnected && state.isInternetReachable !== false) {
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      attempt = 0;
      flushTrackingPoints().catch(() => {});
    }
  });
}

export function stopWatchingConnectivity() {
  networkSubscription?.remove();
  networkSubscription = null;
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
  attempt = 0;
}
