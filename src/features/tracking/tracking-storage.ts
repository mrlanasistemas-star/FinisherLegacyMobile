import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import type { TrackingShare } from '@/api/tracking';

import { accumulateDistance, appendPoints, type TrackingPoint } from './points';

/**
 * The one persisted tracking record. It must survive the app being killed
 * (the background task can be relaunched headless), so it lives in
 * AsyncStorage — never in memory only. No tokens or PII beyond the
 * athlete's own pending GPS points, which are deleted once accepted.
 */
export interface TrackingRecord {
  sessionUuid: string;
  participantId: number;
  startedAt: string;
  batchMax: number;
  /** 'background' = OS task (keeps going with the screen off); 'foreground' = only while the app is open. */
  mode: 'background' | 'foreground';
  /** Points not yet accepted by the server (offline buffer). */
  pending: TrackingPoint[];
  lastPoint: TrackingPoint | null;
  distanceM: number;
  sentCount: number;
  lastSyncAt: string | null;
  lastError: 'offline' | 'server' | 'closed' | 'login' | null;
  shares: TrackingShare[];
  /** The athlete tapped Detener while offline: finish uploading, then close the session. */
  stopRequested?: boolean;
}

const KEY = 'fl_live_tracking_v1';

/** UI mirror — screens subscribe here; storage stays the source of truth. */
export const useTrackingStore = create<{ record: TrackingRecord | null; hydrated: boolean }>(() => ({ record: null, hydrated: false }));

let queue: Promise<unknown> = Promise.resolve();

/** Serializes every read-modify-write (task callbacks and UI can interleave). */
function exclusive<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

async function read(): Promise<TrackingRecord | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as TrackingRecord) : null;
  } catch {
    return null;
  }
}

async function write(record: TrackingRecord | null): Promise<void> {
  if (record) await AsyncStorage.setItem(KEY, JSON.stringify(record));
  else await AsyncStorage.removeItem(KEY);
  useTrackingStore.setState({ record, hydrated: true });
}

export function loadTrackingRecord(): Promise<TrackingRecord | null> {
  return exclusive(async () => {
    const record = await read();
    useTrackingStore.setState({ record, hydrated: true });
    return record;
  });
}

export function saveTrackingRecord(record: TrackingRecord | null): Promise<void> {
  return exclusive(() => write(record));
}

export function updateTrackingRecord(update: (record: TrackingRecord) => TrackingRecord | null): Promise<TrackingRecord | null> {
  return exclusive(async () => {
    const current = await read();
    if (!current) return null;
    const next = update(current);
    await write(next);
    return next;
  });
}

/** Buffers new fixes and advances the local distance (used for support triggers and the live screen). */
export function bufferPoints(points: TrackingPoint[]): Promise<TrackingRecord | null> {
  if (points.length === 0) return loadTrackingRecord();
  return updateTrackingRecord((record) => {
    const fresh = points.filter((p) => !record.lastPoint || p.recorded_at > record.lastPoint.recorded_at);
    const { distance, last } = accumulateDistance(record.lastPoint, fresh);
    return {
      ...record,
      pending: appendPoints(record.pending, fresh),
      lastPoint: last ?? record.lastPoint,
      distanceM: record.distanceM + distance,
    };
  });
}
