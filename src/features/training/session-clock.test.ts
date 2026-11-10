/**
 * Tests for the workout clock, the interval scheduler and the small timing
 * helpers used by the player.
 */
import {
  createSchedule,
  elapsedMs,
  formatClock,
  formatPlayerTime,
  msUntilNext,
  nextSlotAfter,
  pauseClock,
  reachedListenedMark,
  readingSeconds,
  resumeClock,
  startClock,
  tickSchedule,
  IDLE_CLOCK,
} from './session-clock';

const MIN = 60_000;

describe('workout clock', () => {
  it('is 0 before starting', () => {
    expect(elapsedMs(IDLE_CLOCK, 5000)).toBe(0);
  });
  it('excludes paused time', () => {
    let clock = startClock(0);
    clock = pauseClock(clock, 10_000);
    expect(elapsedMs(clock, 50_000)).toBe(10_000);
    clock = resumeClock(clock, 40_000);
    expect(elapsedMs(clock, 45_000)).toBe(15_000);
  });
  it('ignores double pause / resume', () => {
    const running = startClock(0);
    expect(resumeClock(running, 5)).toBe(running);
    const paused = pauseClock(running, 10);
    expect(pauseClock(paused, 20)).toBe(paused);
  });
  it('formats short and long durations', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(65_000)).toBe('1:05');
    expect(formatClock(3_725_000)).toBe('1:02:05');
    expect(formatPlayerTime(41, true)).toBe('-0:41');
    expect(formatPlayerTime(Number.NaN)).toBe('0:00');
  });
});

describe('interval scheduler', () => {
  it('plays the first message at the start', () => {
    const result = tickSchedule(createSchedule(5), 0, false);
    expect(result.play).toBe(true);
    expect(result.schedule.nextDueAt).toBe(5 * MIN);
  });
  it('waits until the slot', () => {
    const schedule = { intervalMs: 5 * MIN, nextDueAt: 5 * MIN };
    expect(tickSchedule(schedule, 4 * MIN, false).play).toBe(false);
    expect(tickSchedule(schedule, 5 * MIN, false).play).toBe(true);
  });
  it('a due slot waits while a message is playing, then fires', () => {
    const schedule = { intervalMs: 3 * MIN, nextDueAt: 3 * MIN };
    expect(tickSchedule(schedule, 3 * MIN + 1000, true).play).toBe(false);
    const after = tickSchedule(schedule, 3 * MIN + 20_000, false);
    expect(after.play).toBe(true);
    expect(after.schedule.nextDueAt).toBe(6 * MIN);
  });
  it('a long suspension produces a single message, aligned to the grid', () => {
    const schedule = { intervalMs: 3 * MIN, nextDueAt: 3 * MIN };
    const first = tickSchedule(schedule, 20 * MIN, false);
    expect(first.play).toBe(true);
    expect(first.schedule.nextDueAt).toBe(21 * MIN);
    expect(tickSchedule(first.schedule, 20 * MIN + 1, false).play).toBe(false);
  });
  it('computes the next slot and the countdown', () => {
    expect(nextSlotAfter(0, 10 * MIN)).toBe(10 * MIN);
    expect(nextSlotAfter(10 * MIN, 10 * MIN)).toBe(20 * MIN);
    expect(msUntilNext({ intervalMs: MIN, nextDueAt: MIN }, 45_000)).toBe(15_000);
    expect(msUntilNext({ intervalMs: MIN, nextDueAt: MIN }, 90_000)).toBe(0);
  });
});

describe('listened mark and reading time', () => {
  it('marks at 80 % or at the end', () => {
    expect(reachedListenedMark(7.9, 10, false)).toBe(false);
    expect(reachedListenedMark(8, 10, false)).toBe(true);
    expect(reachedListenedMark(1, 0, true)).toBe(true);
    expect(reachedListenedMark(5, 0, false)).toBe(false);
  });
  it('bounds reading time for text messages', () => {
    expect(readingSeconds(null)).toBe(6);
    expect(readingSeconds('Vamos campeona')).toBe(6);
    expect(readingSeconds(Array(200).fill('palabra').join(' '))).toBe(25);
  });
});
