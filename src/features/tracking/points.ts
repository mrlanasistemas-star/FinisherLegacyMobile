/**
 * Pure tracking-point logic (no I/O) — batching, de-duplication, buffer
 * cap, distance, retry backoff. Everything here is unit tested; the
 * background task and the uploader only orchestrate it.
 */

/** Exactly the ingest contract: POST /tracking/sessions/{uuid}/points. */
export interface TrackingPoint {
  lat: number;
  lng: number;
  accuracy: number;
  altitude?: number | null;
  speed?: number | null;
  /** ISO 8601 */
  recorded_at: string;
  battery?: number | null;
}

/** Server limit per request (the session may announce a smaller `batch_max`). */
export const MAX_BATCH = 100;
/** ~8h at one point every 6s — enough for an ultra, bounded so storage never grows forever. */
export const BUFFER_CAP = 5000;
/** Points worse than this are noise (indoor/cold start) and never leave the phone. */
export const MAX_ACCURACY_M = 75;

export interface RawLocation {
  coords: { latitude: number; longitude: number; accuracy: number | null; altitude: number | null; speed: number | null };
  timestamp: number;
}

export function toTrackingPoint(location: RawLocation, battery?: number | null): TrackingPoint | null {
  const { latitude, longitude, accuracy, altitude, speed } = location.coords;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  if (accuracy !== null && accuracy > MAX_ACCURACY_M) return null;

  return {
    lat: round(latitude, 6),
    lng: round(longitude, 6),
    accuracy: accuracy === null ? MAX_ACCURACY_M : round(accuracy, 1),
    altitude: altitude === null ? null : round(altitude, 1),
    speed: speed === null || speed < 0 ? null : round(speed, 2),
    recorded_at: new Date(location.timestamp).toISOString(),
    ...(typeof battery === 'number' && battery >= 0 ? { battery: Math.round(battery * 100) } : {}),
  };
}

/**
 * Adds points in chronological order, drops exact duplicates (same
 * timestamp — the OS can redeliver), and keeps only the newest
 * `cap` points if the phone stayed offline for a very long time.
 */
export function appendPoints(buffer: TrackingPoint[], incoming: TrackingPoint[], cap = BUFFER_CAP): TrackingPoint[] {
  const seen = new Set(buffer.map((p) => p.recorded_at));
  const merged = [...buffer];
  for (const point of incoming) {
    if (seen.has(point.recorded_at)) continue;
    seen.add(point.recorded_at);
    merged.push(point);
  }
  merged.sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));
  return merged.length > cap ? merged.slice(merged.length - cap) : merged;
}

/** Oldest-first batch of at most `max` (and never more than the server limit). */
export function nextBatch(buffer: TrackingPoint[], max: number = MAX_BATCH): TrackingPoint[] {
  const size = Math.max(1, Math.min(max, MAX_BATCH));
  return buffer.slice(0, size);
}

/** Removes exactly the points that were accepted (matched by timestamp). */
export function removeSent(buffer: TrackingPoint[], sent: TrackingPoint[]): TrackingPoint[] {
  const sentKeys = new Set(sent.map((p) => p.recorded_at));
  return buffer.filter((p) => !sentKeys.has(p.recorded_at));
}

const EARTH_RADIUS_M = 6_371_000;

export function distanceBetween(a: Pick<TrackingPoint, 'lat' | 'lng'>, b: Pick<TrackingPoint, 'lat' | 'lng'>): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Distance added by `points` after `last`. Jumps that imply > 12 m/s
 * (43 km/h — faster than any runner) are GPS glitches and don't count.
 */
export function accumulateDistance(last: TrackingPoint | null, points: TrackingPoint[]): { distance: number; last: TrackingPoint | null } {
  let distance = 0;
  let previous = last;
  for (const point of points) {
    if (previous) {
      const meters = distanceBetween(previous, point);
      const seconds = Math.max(1, (Date.parse(point.recorded_at) - Date.parse(previous.recorded_at)) / 1000);
      if (meters / seconds <= 12) distance += meters;
    }
    previous = point;
  }
  return { distance, last: previous };
}

/** Exponential backoff with jitter: 2s, 4s, 8s … capped at 2 minutes. */
export function backoffDelay(attempt: number, random: () => number = Math.random): number {
  const base = Math.min(2000 * 2 ** Math.max(0, attempt), 120_000);
  return Math.round(base * (0.75 + random() * 0.5));
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export type UploadFailure = 'retry' | 'drop_batch' | 'session_closed' | 'needs_login';

/**
 * What to do when a batch upload fails. Network/5xx/429 keep the points
 * and retry with backoff; a 422 means the batch itself is unusable (drop
 * it so it can't block the queue forever); 403/404/409/410 mean the session
 * is no longer accepting points (stopped elsewhere, or not ours).
 */
export function classifyUploadFailure(kind: string, status?: number): UploadFailure {
  if (kind === 'unauthenticated' || status === 401) return 'needs_login';
  if (status === 422 || kind === 'validation') return 'drop_batch';
  if (status === 403 || status === 404 || status === 409 || status === 410) return 'session_closed';
  return 'retry';
}
