import * as TaskManager from 'expo-task-manager';

import { toTrackingPoint, type RawLocation, type TrackingPoint } from './points';
import { bufferPoints } from './tracking-storage';
import { flushTrackingPoints } from './tracking-uploader';

export const LIVE_TRACKING_TASK = 'fl-live-tracking';

/** Upload when this many fixes are waiting, or when the last upload is this old. */
const FLUSH_EVERY_POINTS = 10;
const FLUSH_EVERY_MS = 15_000;

/** Shared by the OS task and the foreground fallback watcher. */
export async function handleLocations(locations: RawLocation[]): Promise<void> {
  const points = locations.map((location) => toTrackingPoint(location)).filter((p): p is TrackingPoint => p !== null);
  const record = await bufferPoints(points);
  if (!record || record.pending.length === 0) return;

  const lastSync = record.lastSyncAt ? Date.parse(record.lastSyncAt) : 0;
  if (record.pending.length >= FLUSH_EVERY_POINTS || Date.now() - lastSync >= FLUSH_EVERY_MS) {
    await flushTrackingPoints().catch(() => {});
  }
}

/**
 * Must be defined at module scope, before the app renders: when the OS
 * relaunches the app headless to deliver locations, this is the only code
 * that runs. Imported for its side effect from the root layout.
 */
if (!TaskManager.isTaskDefined(LIVE_TRACKING_TASK)) {
  TaskManager.defineTask<{ locations?: RawLocation[] }>(LIVE_TRACKING_TASK, async ({ data, error }) => {
    if (error || !data?.locations?.length) return;
    await handleLocations(data.locations);
  });
}
