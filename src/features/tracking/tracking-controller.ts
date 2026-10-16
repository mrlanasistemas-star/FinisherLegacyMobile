import * as Location from 'expo-location';
import { useEffect } from 'react';

import { stopTrackingSession, startTrackingSession } from '@/api/tracking';
import { colors } from '@/theme/tokens';
import { ensureOnline } from '@/utils/network';

import { isConsentValid, type TrackingConsent } from './consent';
import { MAX_BATCH } from './points';
import { handleLocations, LIVE_TRACKING_TASK } from './tracking-task';
import { loadTrackingRecord, saveTrackingRecord, updateTrackingRecord, type TrackingRecord } from './tracking-storage';
import { flushTrackingPoints, setDrainedAfterStopHandler, setSessionClosedHandler, stopWatchingConnectivity, watchConnectivity } from './tracking-uploader';

export type TrackingStartError = 'no_consent' | 'permission_denied' | 'services_off' | 'other_active' | 'unavailable' | 'offline';

export class TrackingError extends Error {
  constructor(readonly reason: TrackingStartError) {
    super(reason);
  }
}

export type LocationAccess = 'undetermined' | 'denied' | 'foreground' | 'background';

export async function getLocationAccess(): Promise<{ access: LocationAccess; canAskAgain: boolean }> {
  const fg = await Location.getForegroundPermissionsAsync();
  if (!fg.granted) return { access: fg.status === 'undetermined' ? 'undetermined' : 'denied', canAskAgain: fg.canAskAgain };
  const bg = await Location.getBackgroundPermissionsAsync().catch(() => null);
  return { access: bg?.granted ? 'background' : 'foreground', canAskAgain: bg?.canAskAgain ?? false };
}

export async function requestForegroundAccess(): Promise<boolean> {
  const result = await Location.requestForegroundPermissionsAsync();
  return result.granted;
}

/** Only ever called after the foreground grant and our own explanation screen. */
export async function requestBackgroundAccess(): Promise<boolean> {
  const result = await Location.requestBackgroundPermissionsAsync().catch(() => null);
  return !!result?.granted;
}

let foregroundWatcher: Location.LocationSubscription | null = null;

const TASK_OPTIONS: Location.LocationTaskOptions = {
  accuracy: Location.Accuracy.High,
  timeInterval: 5000,
  distanceInterval: 10,
  // Lets iOS/Android coalesce fixes while the screen is off — easier on the battery.
  deferredUpdatesInterval: 15_000,
  activityType: Location.ActivityType.Fitness,
  pausesUpdatesAutomatically: false,
  showsBackgroundLocationIndicator: true,
  foregroundService: {
    notificationTitle: 'Seguimiento en vivo activo',
    notificationBody: 'Tu gente puede seguir tu carrera. Abre la app para detenerlo.',
    notificationColor: colors.gold,
    killServiceOnDestroy: false,
  },
};

async function startUpdates(): Promise<'background' | 'foreground'> {
  try {
    if (!(await Location.hasStartedLocationUpdatesAsync(LIVE_TRACKING_TASK))) {
      await Location.startLocationUpdatesAsync(LIVE_TRACKING_TASK, TASK_OPTIONS);
    }
    return 'background';
  } catch {
    // Expo Go / missing background mode: track only while the app is open —
    // the screen says so, it's never silently degraded.
    foregroundWatcher?.remove();
    foregroundWatcher = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 }, (location) => {
      handleLocations([location]).catch(() => {});
    });
    return 'foreground';
  }
}

async function stopUpdates() {
  foregroundWatcher?.remove();
  foregroundWatcher = null;
  if (await Location.hasStartedLocationUpdatesAsync(LIVE_TRACKING_TASK).catch(() => false)) {
    await Location.stopLocationUpdatesAsync(LIVE_TRACKING_TASK).catch(() => {});
  }
}

setSessionClosedHandler(() => {
  stopUpdates()
    .then(() => saveTrackingRecord(null))
    .catch(() => {});
});

/**
 * Starts GPS for one participation. Requires a fresh consent value from the
 * consent screen and the foreground permission — there is no other path to
 * `startLocationUpdatesAsync` in the app.
 */
export async function startLiveTracking(participantId: number, consent: TrackingConsent | null): Promise<TrackingRecord> {
  if (!isConsentValid(consent, participantId)) throw new TrackingError('no_consent');

  const existing = await loadTrackingRecord();
  if (existing && existing.participantId !== participantId) throw new TrackingError('other_active');

  const fg = await Location.getForegroundPermissionsAsync();
  if (!fg.granted) throw new TrackingError('permission_denied');
  if (!(await Location.hasServicesEnabledAsync().catch(() => true))) throw new TrackingError('services_off');

  try {
    await ensureOnline();
  } catch {
    throw new TrackingError('offline');
  }

  let session;
  try {
    session = await startTrackingSession(participantId);
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status === 404 || status === 405 || status === 501) throw new TrackingError('unavailable');
    throw error;
  }

  const record: TrackingRecord =
    existing && existing.sessionUuid === session.uuid
      ? { ...existing, stopRequested: false }
      : {
          sessionUuid: session.uuid,
          participantId,
          startedAt: session.started_at ?? new Date().toISOString(),
          batchMax: Math.min(session.batch_max ?? MAX_BATCH, MAX_BATCH),
          mode: 'background',
          pending: [],
          lastPoint: null,
          distanceM: 0,
          sentCount: 0,
          lastSyncAt: null,
          lastError: null,
          shares: existing?.shares ?? [],
        };

  await saveTrackingRecord(record);
  const mode = await startUpdates();
  watchConnectivity();
  return (await updateTrackingRecord((r) => ({ ...r, mode }))) ?? record;
}

/** Resumes GPS for the same, already-consented session (e.g. the OS killed the foreground watcher). */
export async function resumeLiveTracking(): Promise<void> {
  const record = await loadTrackingRecord();
  if (!record || record.stopRequested) return;
  const fg = await Location.getForegroundPermissionsAsync();
  if (!fg.granted) return;
  const mode = await startUpdates();
  watchConnectivity();
  await updateTrackingRecord((r) => ({ ...r, mode }));
}

export async function isLocationRunning(): Promise<boolean> {
  if (foregroundWatcher) return true;
  return Location.hasStartedLocationUpdatesAsync(LIVE_TRACKING_TASK).catch(() => false);
}

/**
 * GPS stops immediately, always. Then the buffer is uploaded and the
 * session closed; if that can't happen now (offline), it finishes on its
 * own when the connection returns.
 */
export async function stopLiveTracking(): Promise<'stopped' | 'pending_upload'> {
  await stopUpdates();
  const record = await updateTrackingRecord((r) => ({ ...r, stopRequested: true }));
  if (!record) return 'stopped';
  return finalizeStop();
}

let finalizing: Promise<'stopped' | 'pending_upload'> | null = null;

function finalizeStop(): Promise<'stopped' | 'pending_upload'> {
  finalizing ??= doFinalizeStop().finally(() => {
    finalizing = null;
  });
  return finalizing;
}

setDrainedAfterStopHandler(() => {
  if (!finalizing) finalizeStop().catch(() => {});
});

async function doFinalizeStop(): Promise<'stopped' | 'pending_upload'> {
  await flushTrackingPoints().catch(() => {});
  const record = await loadTrackingRecord();
  if (!record) return 'stopped';
  if (record.pending.length > 0 && record.lastError !== 'closed') return 'pending_upload';
  try {
    await stopTrackingSession(record.sessionUuid);
  } catch (error) {
    const status = (error as { status?: number }).status;
    // Already closed server-side is fine; anything else retries later.
    if (status !== 404 && status !== 409 && status !== 410 && status !== 403) return 'pending_upload';
  }
  stopWatchingConnectivity();
  await saveTrackingRecord(null);
  return 'stopped';
}

/**
 * Mount once at the root: rehydrates the record for the UI, resumes
 * uploading the offline buffer, and completes a stop that was requested
 * while offline. Never starts GPS.
 */
export function useLiveTrackingBootstrap(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    loadTrackingRecord()
      .then((record) => {
        if (cancelled || !record) return;
        watchConnectivity();
        if (record.stopRequested) finalizeStop().catch(() => {});
        else flushTrackingPoints().catch(() => {});
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [enabled]);
}
