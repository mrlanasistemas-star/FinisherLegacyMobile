import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import type { TrackingPoint } from '@/features/tracking/points';
import { elapsedMs, type WorkoutClock } from '@/features/training/session-clock';

import { accumulate, capStoredPoints, maxPlausibleSpeed, type WorkoutPoint } from './workout-math';

/**
 * The running live workout, persisted in AsyncStorage — never memory only:
 * the OS can kill the app (or relaunch it headless to deliver GPS fixes to
 * the shared location task), and on reopen the athlete must be offered to
 * continue, finish or discard it.
 *
 * Two keys: the small record (rewritten often) and the GPS points (only
 * while the workout uses GPS). Every read-modify-write is serialized
 * because the background task and the UI can interleave.
 */

export interface ActiveWorkoutSport {
  id: number;
  name: string;
  slug: string;
  metric: 'pace' | 'speed';
}

export type GpsMode = 'off' | 'background' | 'foreground' | 'denied';

export interface ActiveWorkout {
  /** Idempotency key for `POST /training/workouts` (works across offline retries). */
  clientUuid: string;
  /** Server uuid once the start was accepted (null while queued offline). */
  serverUuid: string | null;
  sport: ActiveWorkoutSport;
  usesGps: boolean;
  gpsMode: GpsMode;
  startedAt: string;
  /** Timestamp-based clock (pauses excluded) — exact after the phone slept. */
  clock: WorkoutClock;
  distanceM: number;
  movingMs: number;
  /** Last accepted fix, for distance continuity. Cleared on pause so the jump across a pause never counts. */
  last: WorkoutPoint | null;
  pointsCount: number;
  /** Epoch ms of the newest fix (GPS status line). */
  lastFixAt: number | null;
  lastHeartbeatAt: number | null;
  /**
   * Live tracking session opened by "Compartir con mi familia" (null = the
   * workout's location never leaves the phone). Points then also go through
   * the live-tracking uploader (features/tracking).
   */
  trackingSessionUuid?: string | null;
}

const RECORD_KEY = 'fl_workout_active_v1';
const POINTS_KEY = 'fl_workout_points_v1';
/** Fixes worse than this (m) never count toward a workout's distance. */
export const WORKOUT_MAX_ACCURACY_M = 35;

/** UI mirror — screens subscribe here; storage stays the source of truth. */
export const useActiveWorkoutStore = create<{ workout: ActiveWorkout | null; hydrated: boolean }>(() => ({ workout: null, hydrated: false }));

let chain: Promise<unknown> = Promise.resolve();

function exclusive<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.catch(() => undefined);
  return run;
}

async function readRecord(): Promise<ActiveWorkout | null> {
  try {
    const raw = await AsyncStorage.getItem(RECORD_KEY);
    return raw ? (JSON.parse(raw) as ActiveWorkout) : null;
  } catch {
    return null;
  }
}

async function writeRecord(record: ActiveWorkout | null): Promise<void> {
  if (record) await AsyncStorage.setItem(RECORD_KEY, JSON.stringify(record));
  else await AsyncStorage.removeItem(RECORD_KEY);
  useActiveWorkoutStore.setState({ workout: record, hydrated: true });
}

/** Compact on disk: `[lat, lng, t, alt]`. */
type StoredPoint = [number, number, number, number | null];

async function readPoints(): Promise<WorkoutPoint[]> {
  try {
    const raw = await AsyncStorage.getItem(POINTS_KEY);
    const rows = raw ? (JSON.parse(raw) as StoredPoint[]) : [];
    return rows.map(([lat, lng, t, alt]) => ({ lat, lng, t, alt }));
  } catch {
    return [];
  }
}

async function writePoints(points: WorkoutPoint[]): Promise<void> {
  if (points.length === 0) {
    await AsyncStorage.removeItem(POINTS_KEY);
    return;
  }
  const rows: StoredPoint[] = points.map((p) => [p.lat, p.lng, p.t, p.alt]);
  await AsyncStorage.setItem(POINTS_KEY, JSON.stringify(rows));
}

export function loadActiveWorkout(): Promise<ActiveWorkout | null> {
  return exclusive(async () => {
    const record = await readRecord();
    useActiveWorkoutStore.setState({ workout: record, hydrated: true });
    return record;
  });
}

export function saveActiveWorkout(record: ActiveWorkout | null): Promise<void> {
  return exclusive(async () => {
    await writeRecord(record);
    if (!record) await writePoints([]);
  });
}

export function updateActiveWorkout(update: (record: ActiveWorkout) => ActiveWorkout): Promise<ActiveWorkout | null> {
  return exclusive(async () => {
    const current = await readRecord();
    if (!current) return null;
    const next = update(current);
    await writeRecord(next);
    return next;
  });
}

export function loadWorkoutPoints(): Promise<WorkoutPoint[]> {
  return exclusive(readPoints);
}

/**
 * True while a live workout needs location. Read straight from storage so
 * the live-tracking controller can ask it even in a headless relaunch
 * (it must not stop the shared OS task under a running workout).
 */
export async function isWorkoutGpsActive(): Promise<boolean> {
  const record = await readRecord();
  return !!record && record.usesGps && record.gpsMode !== 'denied';
}

/**
 * Called by the shared location task (features/tracking/tracking-task) for
 * every batch of fixes. Ignored unless a GPS workout is running and not
 * paused. Fix timestamps become WORKOUT time, so pauses never inflate a
 * best effort and a fix from before the start never counts.
 */
export function feedWorkoutPoints(points: TrackingPoint[]): Promise<void> {
  if (points.length === 0) return Promise.resolve();
  return exclusive(async () => {
    const record = await readRecord();
    if (!record || !record.usesGps || record.clock.startedAt === null || record.clock.pausedAt !== null) return;

    const fresh: WorkoutPoint[] = [];
    for (const point of points) {
      const at = Date.parse(point.recorded_at);
      if (!Number.isFinite(at) || at < record.clock.startedAt) continue;
      if (point.accuracy > WORKOUT_MAX_ACCURACY_M) continue;
      const t = elapsedMs(record.clock, at);
      if (record.last && t <= record.last.t) continue;
      fresh.push({ lat: point.lat, lng: point.lng, t, alt: point.altitude ?? null });
    }
    if (fresh.length === 0) return;

    const { distanceM, movingMs, last } = accumulate(record.last, fresh, maxPlausibleSpeed(record.sport.slug));
    const stored = capStoredPoints([...(await readPoints()), ...fresh]);
    await writePoints(stored);
    await writeRecord({
      ...record,
      distanceM: record.distanceM + distanceM,
      movingMs: record.movingMs + movingMs,
      last,
      pointsCount: stored.length,
      lastFixAt: Date.parse(points[points.length - 1].recorded_at),
    });
  });
}
