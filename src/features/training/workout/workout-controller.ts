import * as Network from 'expo-network';

import { openWorkoutLiveSession, updateWorkout } from '@/api/workouts';
import { stopLiveTracking } from '@/features/tracking/tracking-controller';
import { MAX_BATCH } from '@/features/tracking/points';
import { loadTrackingRecord, saveTrackingRecord } from '@/features/tracking/tracking-storage';
import { flushTrackingPoints, watchConnectivity as watchTrackingConnectivity } from '@/features/tracking/tracking-uploader';
import { ensureOnline } from '@/utils/network';
import { endSession, pauseSession, resumeSession } from '@/features/training/player-controller';
import { usePlayerStore } from '@/features/training/player-store';
import { elapsedMs, pauseClock, resumeClock, startClock } from '@/features/training/session-clock';
import type { FinishWorkoutInput } from '@/schemas/workouts';
import { uuidv4 } from '@/utils/uuid';

import { startWorkoutGps, stopWorkoutGps, isWorkoutGpsRunning } from './workout-gps';
import { bestEffortSeconds, elevationGain, encodePolyline, maxPlausibleSpeed, simplifyRoute } from './workout-math';
import { dropUnsentWorkout, enqueue, flushOutbox, loadOutbox, onWorkoutStarted, serverUuidFor, watchConnectivity, type PendingSummary } from './workout-outbox';
import {
  loadActiveWorkout,
  loadWorkoutPoints,
  saveActiveWorkout,
  updateActiveWorkout,
  type ActiveWorkout,
  type ActiveWorkoutSport,
} from './workout-storage';
import { useFinishedWorkoutStore, type FinishedWorkout } from './finished-store';

/**
 * Orchestrates a live workout (Modo entrenamiento): start / pause / resume /
 * finish / discard, GPS on the shared location task, the cheer-message
 * session riding along, the heartbeat, and the offline outbox. Screens call
 * these functions; state lives in `workout-storage` (persisted) and is
 * mirrored in zustand for rendering.
 */

export class WorkoutError extends Error {
  constructor(readonly reason: 'already_active' | 'no_workout' | 'not_synced' | 'no_gps' | 'race_tracking_active') {
    super(reason);
  }
}

// When the queued start reaches the server, remember its uuid on the running record.
onWorkoutStarted((clientUuid, serverUuid) => {
  updateActiveWorkout((record) => (record.clientUuid === clientUuid ? { ...record, serverUuid } : record)).catch(() => {});
});

/** Starts a live workout. With GPS, the foreground permission must already be granted (setup screen). */
export async function startLiveWorkout(sport: ActiveWorkoutSport, usesGps: boolean): Promise<ActiveWorkout> {
  if (await loadActiveWorkout()) throw new WorkoutError('already_active');

  const now = Date.now();
  const record: ActiveWorkout = {
    clientUuid: uuidv4(),
    serverUuid: null,
    sport,
    usesGps,
    gpsMode: usesGps ? 'background' : 'off',
    startedAt: new Date(now).toISOString(),
    clock: startClock(now),
    distanceM: 0,
    movingMs: 0,
    last: null,
    pointsCount: 0,
    lastFixAt: null,
    lastHeartbeatAt: null,
  };
  await saveActiveWorkout(record);

  if (usesGps) {
    const mode = await startWorkoutGps();
    const gpsMode = mode === 'background' || mode === 'foreground' ? mode : 'denied';
    await updateActiveWorkout((r) => ({ ...r, gpsMode }));
  }

  await enqueue({
    kind: 'start',
    clientUuid: record.clientUuid,
    body: { source: 'live', sport_id: sport.id, uses_gps: usesGps, client_uuid: record.clientUuid, started_at: record.startedAt },
  });

  return (await loadActiveWorkout()) ?? record;
}

export async function pauseLiveWorkout(): Promise<void> {
  const now = Date.now();
  // `last: null` → the gap walked while paused never counts as distance.
  await updateActiveWorkout((r) => ({ ...r, clock: pauseClock(r.clock, now), last: null }));
  if (usePlayerStore.getState().session.active) pauseSession();
}

export async function resumeLiveWorkout(): Promise<void> {
  const now = Date.now();
  const record = await updateActiveWorkout((r) => ({ ...r, clock: resumeClock(r.clock, now) }));
  if (usePlayerStore.getState().session.active) resumeSession();
  // The OS may have stopped GPS while the app was suspended.
  if (record?.usesGps && record.gpsMode !== 'denied' && !(await isWorkoutGpsRunning())) {
    const mode = await startWorkoutGps();
    await updateActiveWorkout((r) => ({ ...r, gpsMode: mode === 'background' || mode === 'foreground' ? mode : 'denied' }));
  }
}

/** The numbers sent to the server: GPS-derived values only when the workout used GPS. */
async function buildFinish(record: ActiveWorkout, now: number, notes: string | null): Promise<FinishWorkoutInput> {
  const durationS = Math.round(elapsedMs(record.clock, now) / 1000);
  const body: FinishWorkoutInput = { duration_s: durationS, ended_at: new Date(now).toISOString(), notes };
  if (!record.usesGps) return body;

  const points = await loadWorkoutPoints();
  const maxSpeed = maxPlausibleSpeed(record.sport.slug);
  const route = simplifyRoute(points);
  return {
    ...body,
    distance_m: Math.round(record.distanceM),
    moving_s: Math.round(record.movingMs / 1000),
    elevation_gain_m: elevationGain(points),
    best_5k_s: bestEffortSeconds(points, 5000, maxSpeed),
    best_10k_s: bestEffortSeconds(points, 10000, maxSpeed),
    route_polyline: route.length >= 2 ? encodePolyline(route) : null,
    route_points_count: route.length,
  };
}

/**
 * Ends the workout: GPS stops at once, the cheer session ends, the final
 * numbers go to the outbox (sent now, or when the connection returns) and
 * the summary is kept on the phone for the summary screen.
 */
export async function finishLiveWorkout(notes: string | null = null): Promise<FinishedWorkout> {
  const record = await loadActiveWorkout();
  if (!record) throw new WorkoutError('no_workout');
  const now = record.clock.pausedAt ?? Date.now();
  if (usePlayerStore.getState().session.active) endSession();

  const body = await buildFinish(record, now, notes);
  const summary: PendingSummary = {
    sportName: record.sport.name,
    sportSlug: record.sport.slug,
    source: 'live',
    startedAt: record.startedAt,
    durationS: body.duration_s,
    distanceM: body.distance_m ?? null,
  };
  await enqueue({ kind: 'finish', clientUuid: record.clientUuid, body, summary });

  const finished: FinishedWorkout = {
    clientUuid: record.clientUuid,
    sport: record.sport,
    usesGps: record.usesGps,
    startedAt: record.startedAt,
    durationS: body.duration_s,
    movingS: body.moving_s ?? null,
    distanceM: body.distance_m ?? null,
    elevationGainM: body.elevation_gain_m ?? null,
    best5kS: body.best_5k_s ?? null,
    best10kS: body.best_10k_s ?? null,
    polyline: body.route_polyline ?? null,
  };
  useFinishedWorkoutStore.getState().set(finished);
  await saveActiveWorkout(null);
  await stopLocation(record);
  return finished;
}

/** Throws the workout away (nothing is saved). An unsent start is simply dropped from the outbox. */
export async function discardLiveWorkout(): Promise<void> {
  const record = await loadActiveWorkout();
  if (!record) return;
  if (usePlayerStore.getState().session.active) endSession();
  if (!(await dropUnsentWorkout(record.clientUuid))) {
    await enqueue({ kind: 'discard', clientUuid: record.clientUuid });
  }
  await saveActiveWorkout(null);
  await stopLocation(record);
}

/**
 * GPS off after the workout record is cleared (so the shared task is free to
 * stop). A workout followed by family also closes its live tracking
 * session: the last points are uploaded and every share ends — when offline,
 * the tracking uploader finishes that on its own when the signal returns.
 */
async function stopLocation(record: ActiveWorkout): Promise<void> {
  if (!record.usesGps) return;
  const tracking = await loadTrackingRecord().catch(() => null);
  if (record.trackingSessionUuid && tracking?.sessionUuid === record.trackingSessionUuid) {
    await stopLiveTracking().catch(() => {});
    return;
  }
  await stopWorkoutGps();
}

/**
 * "Compartir con mi familia" (outdoor GPS workouts only, never automatic):
 * opens the workout's live tracking session on the server and hands the
 * points to the existing live-tracking uploader — the same single location
 * task keeps running. Returns the session uuid for `/family/sharing`, where
 * the athlete chooses who sees it and for how long.
 */
export async function enableFamilyFollow(): Promise<string> {
  const record = await loadActiveWorkout();
  if (!record) throw new WorkoutError('no_workout');
  if (!record.usesGps || record.gpsMode === 'denied') throw new WorkoutError('no_gps');
  if (record.trackingSessionUuid) return record.trackingSessionUuid;

  await ensureOnline();
  const uuid = record.serverUuid ?? serverUuidFor(record.clientUuid);
  if (!uuid) throw new WorkoutError('not_synced');

  const existing = await loadTrackingRecord();
  // One tracking record at a time on the phone: a race being tracked keeps priority.
  if (existing && !existing.stopRequested) throw new WorkoutError('race_tracking_active');

  const live = await openWorkoutLiveSession(uuid);
  await saveTrackingRecord({
    sessionUuid: live.trackingSessionUuid,
    // Not a race participation: 0 never matches a real participant id, so race screens ignore it.
    participantId: 0,
    startedAt: live.startedAt,
    batchMax: Math.min(live.batchMax, MAX_BATCH),
    mode: record.gpsMode === 'foreground' ? 'foreground' : 'background',
    pending: [],
    lastPoint: null,
    distanceM: 0,
    sentCount: 0,
    lastSyncAt: null,
    lastError: null,
    shares: [],
  });
  await updateActiveWorkout((r) => ({ ...r, serverUuid: uuid, trackingSessionUuid: live.trackingSessionUuid }));
  watchTrackingConnectivity();
  flushTrackingPoints().catch(() => {});
  return live.trackingSessionUuid;
}

/**
 * Best-effort progress ping (every ~60 s from the workout screen). Not
 * queued: if it fails, the next one or the finish carries the numbers. It
 * keeps the server from auto-closing a long workout (12 h without one).
 */
export async function sendHeartbeat(): Promise<void> {
  const record = await loadActiveWorkout();
  if (!record) return;
  const uuid = record.serverUuid ?? serverUuidFor(record.clientUuid);
  if (!uuid) {
    flushOutbox().catch(() => {});
    return;
  }
  const net = await Network.getNetworkStateAsync().catch(() => null);
  if (net?.isConnected === false || net?.isInternetReachable === false) return;
  try {
    await updateWorkout(uuid, {
      duration_s: Math.round(elapsedMs(record.clock, Date.now()) / 1000),
      ...(record.usesGps ? { distance_m: Math.round(record.distanceM), moving_s: Math.round(record.movingMs / 1000) } : {}),
    });
    await updateActiveWorkout((r) => ({ ...r, serverUuid: uuid, lastHeartbeatAt: Date.now() }));
  } catch {
    // Next heartbeat or the finish will carry it.
  }
}

let bootstrapped = false;

/**
 * Once per app run (from the training entry points): rehydrates the running
 * workout and the outbox, resumes draining it, and — if the app was killed
 * mid-workout — leaves the record in place so the UI offers to continue,
 * finish or discard. GPS is never restarted silently here: only when the
 * athlete taps "Continuar".
 */
export async function bootstrapWorkouts(): Promise<void> {
  if (bootstrapped) return;
  bootstrapped = true;
  await Promise.all([loadActiveWorkout(), loadOutbox()]);
  watchConnectivity();
  flushOutbox().catch(() => {});
}

/** "Continuar" after reopening: restart GPS if it was stopped by the OS. */
export async function continueInterruptedWorkout(): Promise<void> {
  const record = await loadActiveWorkout();
  if (!record) return;
  if (record.usesGps && record.gpsMode !== 'denied' && !(await isWorkoutGpsRunning())) {
    const mode = await startWorkoutGps();
    // Distance resumes from the next fix; the stretch without GPS is not invented.
    await updateActiveWorkout((r) => ({ ...r, last: null, gpsMode: mode === 'background' || mode === 'foreground' ? mode : 'denied' }));
  }
}
