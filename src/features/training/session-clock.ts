/**
 * Pure timing logic for "Modo entrenamiento" (unit-tested):
 *
 * - The workout clock is derived from wall-clock timestamps (start, pauses),
 *   never from a ticking counter, so it stays exact after the phone was
 *   locked or the JS thread was suspended.
 * - The interval scheduler plays one message every N minutes of *workout*
 *   time (paused time doesn't count). A slot that comes due while a message
 *   is still playing waits for it to end, and after a long suspension only
 *   ONE message plays (no burst of catch-up messages).
 */

export const INTERVAL_OPTIONS = [null, 3, 5, 10] as const;
export type IntervalMinutes = (typeof INTERVAL_OPTIONS)[number];

export interface WorkoutClock {
  /** Epoch ms when the workout started; null = not started. */
  startedAt: number | null;
  /** Epoch ms of the current pause; null = running. */
  pausedAt: number | null;
  /** Total ms spent paused before the current pause. */
  pausedTotal: number;
}

export const IDLE_CLOCK: WorkoutClock = { startedAt: null, pausedAt: null, pausedTotal: 0 };

export function startClock(now: number): WorkoutClock {
  return { startedAt: now, pausedAt: null, pausedTotal: 0 };
}

export function pauseClock(clock: WorkoutClock, now: number): WorkoutClock {
  if (clock.startedAt === null || clock.pausedAt !== null) return clock;
  return { ...clock, pausedAt: now };
}

export function resumeClock(clock: WorkoutClock, now: number): WorkoutClock {
  if (clock.startedAt === null || clock.pausedAt === null) return clock;
  return { ...clock, pausedAt: null, pausedTotal: clock.pausedTotal + Math.max(0, now - clock.pausedAt) };
}

/** Workout time in ms (excludes pauses). */
export function elapsedMs(clock: WorkoutClock, now: number): number {
  if (clock.startedAt === null) return 0;
  const end = clock.pausedAt ?? now;
  return Math.max(0, end - clock.startedAt - clock.pausedTotal);
}

/** `12:04` under an hour, `1:02:09` after. Tabular-friendly. */
export function formatClock(ms: number): string {
  const total = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** Player times: `0:07`, `1:32`, `-0:41` for remaining. */
export function formatPlayerTime(seconds: number, remaining = false): string {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  return `${remaining ? '-' : ''}${formatClock(safe * 1000)}`;
}

export interface IntervalSchedule {
  intervalMs: number;
  /** Workout-time ms at which the next message is due. */
  nextDueAt: number;
}

/** First message plays right away at the start; then every N minutes. */
export function createSchedule(minutes: number): IntervalSchedule {
  return { intervalMs: minutes * 60_000, nextDueAt: 0 };
}

/** Next slot strictly after `elapsed` on the N-minute grid. */
export function nextSlotAfter(elapsed: number, intervalMs: number): number {
  return (Math.floor(elapsed / intervalMs) + 1) * intervalMs;
}

/**
 * Decides whether a message should start now. When it should, the returned
 * schedule already points at the following slot (computed from *now*, so a
 * long suspension collapses into a single message).
 */
export function tickSchedule(
  schedule: IntervalSchedule,
  elapsed: number,
  isPlaying: boolean,
): { play: boolean; schedule: IntervalSchedule } {
  if (isPlaying || elapsed < schedule.nextDueAt) return { play: false, schedule };
  return { play: true, schedule: { ...schedule, nextDueAt: nextSlotAfter(elapsed, schedule.intervalMs) } };
}

/** ms until the next message, for "Próximo mensaje en 2:41". */
export function msUntilNext(schedule: IntervalSchedule, elapsed: number): number {
  return Math.max(0, schedule.nextDueAt - elapsed);
}

/** Reading time for a text-only message: ~3 words/s, between 6 and 25 s. */
export function readingSeconds(body: string | null): number {
  const words = body ? body.trim().split(/\s+/).filter(Boolean).length : 0;
  return Math.min(25, Math.max(6, Math.round(words / 3) + 3));
}

/** "Auto-mark listened": 80 % of the message, or its end. */
export function reachedListenedMark(position: number, duration: number, finished: boolean): boolean {
  if (finished) return true;
  if (!Number.isFinite(duration) || duration <= 0) return false;
  return position / duration >= 0.8;
}
