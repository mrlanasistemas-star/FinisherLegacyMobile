/**
 * Pure workout math for Modo entrenamiento (no I/O, unit-tested):
 * distance / moving time from GPS fixes, honest best efforts (5 km / 10 km),
 * elevation gain, route simplification + Google polyline encoding, and the
 * display formatting of pace / speed / distance.
 *
 * Honesty rules (also enforced by the server):
 * - Pace and speed exist only with enough real data (≥ 200 m and ≥ 60 s);
 *   otherwise the UI shows "—".
 * - A best effort is the fastest *measured* stretch of at least N meters
 *   between two real fixes — never extrapolated from an average, and never
 *   interpolated down to exactly N meters (so it can only be a little slow,
 *   never flattering).
 * - No calories anywhere.
 */
import { distanceBetween } from '@/features/tracking/points';

/** One stored fix. `t` is WORKOUT time in ms (pauses excluded), so efforts never span a pause. */
export interface WorkoutPoint {
  lat: number;
  lng: number;
  t: number;
  alt: number | null;
}

export const MIN_DISTANCE_FOR_PACE_M = 200;
export const MIN_SECONDS_FOR_PACE = 60;
/** Below this speed the athlete is standing (traffic light, water stop). */
export const MOVING_SPEED_MPS = 0.6;
/** A gap longer than this between fixes isn't counted as moving time (GPS lost). */
export const MAX_MOVING_GAP_MS = 60_000;
/** Max points kept on the phone for one workout (~14 h at one fix every 5 s after thinning). */
export const MAX_STORED_POINTS = 10_000;
/** Max points sent as the route polyline. */
export const MAX_ROUTE_POINTS = 2_000;

/**
 * Speed above which a jump between fixes is a GPS glitch, by activity:
 * 12 m/s (43 km/h) for anything on foot, 30 m/s (108 km/h) on a bike.
 */
export function maxPlausibleSpeed(sportSlug: string | null | undefined): number {
  return sportSlug === 'ciclismo' || sportSlug === 'triatlon' ? 30 : 12;
}

export interface Accumulated {
  distanceM: number;
  movingMs: number;
  last: WorkoutPoint | null;
}

/** Adds `points` after `last`: distance of plausible jumps and time spent actually moving. */
export function accumulate(last: WorkoutPoint | null, points: WorkoutPoint[], maxSpeed = 12): Accumulated {
  let distanceM = 0;
  let movingMs = 0;
  let previous = last;
  for (const point of points) {
    if (previous && point.t > previous.t) {
      const meters = distanceBetween(previous, point);
      const ms = point.t - previous.t;
      const speed = meters / Math.max(1, ms / 1000);
      if (speed <= maxSpeed) {
        distanceM += meters;
        if (speed >= MOVING_SPEED_MPS && ms <= MAX_MOVING_GAP_MS) movingMs += ms;
      }
    }
    if (!previous || point.t > previous.t) previous = point;
  }
  return { distanceM, movingMs, last: previous };
}

/**
 * Fastest stretch covering at least `meters`, in seconds, or null when the
 * route never reached that distance. Two pointers over cumulative distance:
 * O(n). Glitch jumps (faster than `maxSpeed`) add no distance.
 */
export function bestEffortSeconds(points: WorkoutPoint[], meters: number, maxSpeed = 12): number | null {
  if (points.length < 2) return null;
  const cum: number[] = [0];
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const d = b.t > a.t ? distanceBetween(a, b) : 0;
    const plausible = b.t > a.t && d / Math.max(1, (b.t - a.t) / 1000) <= maxSpeed;
    cum.push(cum[i - 1] + (plausible ? d : 0));
  }
  if (cum[cum.length - 1] < meters) return null;

  let best: number | null = null;
  let i = 0;
  for (let j = 1; j < points.length; j += 1) {
    // Move the start forward while the window would still cover `meters`.
    while (i + 1 < j && cum[j] - cum[i + 1] >= meters) i += 1;
    if (cum[j] - cum[i] >= meters) {
      const seconds = (points[j].t - points[i].t) / 1000;
      if (seconds > 0 && (best === null || seconds < best)) best = seconds;
    }
  }
  return best === null ? null : Math.round(best);
}

/**
 * Climb in meters with a 3 m hysteresis (phone altitude is noisy). Null when
 * fewer than half the fixes carry an altitude — better no number than a
 * made-up one.
 */
export function elevationGain(points: WorkoutPoint[]): number | null {
  const withAlt = points.filter((p): p is WorkoutPoint & { alt: number } => typeof p.alt === 'number');
  if (withAlt.length < 10 || withAlt.length < points.length / 2) return null;
  let gain = 0;
  let base = withAlt[0].alt;
  for (const point of withAlt) {
    if (point.alt - base >= 3) {
      gain += point.alt - base;
      base = point.alt;
    } else if (base - point.alt >= 3) {
      base = point.alt;
    }
  }
  return Math.round(gain);
}

/** Keeps every point at least `spacing` meters from the last kept one (first and last always kept). */
function thin(points: WorkoutPoint[], spacing: number): WorkoutPoint[] {
  if (points.length <= 2) return points;
  const out = [points[0]];
  for (let i = 1; i < points.length - 1; i += 1) {
    if (distanceBetween(out[out.length - 1], points[i]) >= spacing) out.push(points[i]);
  }
  out.push(points[points.length - 1]);
  return out;
}

/** Fewer points with the same shape — doubles the spacing until it fits `max`. */
export function simplifyRoute(points: WorkoutPoint[], max = MAX_ROUTE_POINTS): WorkoutPoint[] {
  let spacing = 5;
  let out = points;
  while (out.length > max && spacing < 10_000) {
    out = thin(points, spacing);
    spacing *= 2;
  }
  return out;
}

/** Storage cap for a very long workout: thins the older half instead of dropping the start. */
export function capStoredPoints(points: WorkoutPoint[], cap = MAX_STORED_POINTS): WorkoutPoint[] {
  if (points.length <= cap) return points;
  const half = Math.floor(points.length / 2);
  const older = points.slice(0, half).filter((_, index) => index % 2 === 0);
  return [...older, ...points.slice(half)];
}

/** Google encoded polyline, precision 5 (what the server stores as `route_polyline`). */
export function encodePolyline(points: Pick<WorkoutPoint, 'lat' | 'lng'>[]): string {
  let lastLat = 0;
  let lastLng = 0;
  let out = '';
  for (const point of points) {
    const lat = Math.round(point.lat * 1e5);
    const lng = Math.round(point.lng * 1e5);
    out += encodeValue(lat - lastLat) + encodeValue(lng - lastLng);
    lastLat = lat;
    lastLng = lng;
  }
  return out;
}

function encodeValue(value: number): string {
  let v = value < 0 ? ~(value << 1) : value << 1;
  let out = '';
  while (v >= 0x20) {
    out += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
    v >>= 5;
  }
  return out + String.fromCharCode(v + 63);
}

export function decodePolyline(encoded: string): { lat: number; lng: number }[] {
  const out: { lat: number; lng: number }[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    for (const axis of [0, 1]) {
      let shift = 0;
      let result = 0;
      let byte: number;
      do {
        byte = encoded.charCodeAt(index) - 63;
        index += 1;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20 && index < encoded.length);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (axis === 0) lat += delta;
      else lng += delta;
    }
    out.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return out;
}

/** Enough real data for an average pace / speed? */
export function hasEnoughForPace(distanceM: number | null | undefined, seconds: number): boolean {
  return typeof distanceM === 'number' && distanceM >= MIN_DISTANCE_FOR_PACE_M && seconds >= MIN_SECONDS_FOR_PACE;
}

/** Seconds per km, or null without enough data. */
export function paceSecondsPerKm(distanceM: number | null | undefined, seconds: number): number | null {
  if (!hasEnoughForPace(distanceM, seconds)) return null;
  return Math.round(seconds / ((distanceM as number) / 1000));
}

/**
 * Current pace from the last ~400 m of fixes (null until there are 400 m
 * and 60 s of real data) — the live number on the workout screen.
 */
export function recentPaceSecondsPerKm(points: WorkoutPoint[], windowM = 400): number | null {
  if (points.length < 2) return null;
  let meters = 0;
  for (let i = points.length - 1; i > 0; i -= 1) {
    meters += distanceBetween(points[i - 1], points[i]);
    if (meters >= windowM) {
      const seconds = (points[points.length - 1].t - points[i - 1].t) / 1000;
      return paceSecondsPerKm(meters, seconds);
    }
  }
  return null;
}

/** `5:21` (min:s per km). */
export function formatPace(secondsPerKm: number | null | undefined): string | null {
  if (typeof secondsPerKm !== 'number' || !Number.isFinite(secondsPerKm) || secondsPerKm <= 0) return null;
  const total = Math.round(secondsPerKm);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** km/h with one decimal, from m/s. */
export function formatSpeedKmh(mps: number | null | undefined, locale = 'es'): string | null {
  if (typeof mps !== 'number' || !Number.isFinite(mps) || mps <= 0) return null;
  return (mps * 3.6).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** `5.42` km (two decimals under 100 km, one above). */
export function formatKm(meters: number | null | undefined, locale = 'es'): string {
  const km = Math.max(0, meters ?? 0) / 1000;
  const digits = km >= 100 ? 1 : 2;
  return km.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** `1 h 05 min` / `42 min` / `45 s` — for history rows and totals. */
export function formatDurationShort(seconds: number): { h: number; m: number; s: number } {
  const total = Math.max(0, Math.round(seconds));
  return { h: Math.floor(total / 3600), m: Math.floor((total % 3600) / 60), s: total % 60 };
}

/**
 * Milestones for encouragement during a live workout: each full km on foot
 * (each 5 km on a bike) with GPS, or each 10 minutes without GPS. Returns
 * the milestone just crossed (km or minutes), or null.
 */
export function crossedMilestone(
  previous: { distanceM: number; elapsedMs: number },
  next: { distanceM: number; elapsedMs: number },
  opts: { usesGps: boolean; sportSlug?: string | null },
): { kind: 'km'; value: number } | { kind: 'minutes'; value: number } | null {
  if (opts.usesGps) {
    const step = opts.sportSlug === 'ciclismo' ? 5000 : 1000;
    const before = Math.floor(previous.distanceM / step);
    const after = Math.floor(next.distanceM / step);
    return after > before && after > 0 ? { kind: 'km', value: (after * step) / 1000 } : null;
  }
  const step = 10 * 60_000;
  const before = Math.floor(previous.elapsedMs / step);
  const after = Math.floor(next.elapsedMs / step);
  return after > before && after > 0 ? { kind: 'minutes', value: (after * step) / 60_000 } : null;
}
