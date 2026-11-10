/**
 * Tests for the workout audio-session policy: the keep-alive phase
 * transitions driven by the interval scheduler (start → message → silent
 * keep-alive → next slot → pause → resume → exhausted → end), the
 * interruption mode of each phase, and the per-platform lock-screen rule.
 */
import {
  desiredPhase,
  interruptionModeFor,
  lockScreenControlsAvailable,
  mixModeCaption,
  type AudioPhase,
  type PhaseInput,
} from './audio-session';
import { createSchedule, elapsedMs, pauseClock, resumeClock, startClock, tickSchedule, type IntervalSchedule, type WorkoutClock } from './session-clock';

const MIN = 60_000;

const base: PhaseInput = {
  sessionActive: true,
  paused: false,
  exhausted: false,
  queueFinished: false,
  audioMessageActive: false,
  audioAvailable: true,
};

describe('desiredPhase', () => {
  it('is off without a workout or without the native module', () => {
    expect(desiredPhase({ ...base, sessionActive: false })).toBe('off');
    expect(desiredPhase({ ...base, sessionActive: false, audioMessageActive: true })).toBe('off');
    expect(desiredPhase({ ...base, audioAvailable: false })).toBe('off');
  });

  it('keeps the session alive between messages and hands it to a playing voice note', () => {
    expect(desiredPhase(base)).toBe('keepAlive');
    expect(desiredPhase({ ...base, audioMessageActive: true })).toBe('message');
  });

  it('never keeps silent audio running while paused or when nothing more will play (2.5.4)', () => {
    expect(desiredPhase({ ...base, paused: true })).toBe('paused');
    expect(desiredPhase({ ...base, paused: true, audioMessageActive: true })).toBe('paused');
    expect(desiredPhase({ ...base, exhausted: true })).toBe('off');
    expect(desiredPhase({ ...base, queueFinished: true })).toBe('off');
  });
});

/**
 * A tiny workout simulator: the real scheduler + clock, and the phase the
 * controller would request at each moment.
 */
function simulator(intervalMinutes: number, queueLength: number, messageSeconds = 20) {
  let now = 1_000_000;
  let clock: WorkoutClock = startClock(now);
  let schedule: IntervalSchedule = createSchedule(intervalMinutes);
  let played = 0;
  let playingUntil: number | null = null;
  let exhausted = false;
  let active = true;

  const playing = () => playingUntil !== null && now < playingUntil;
  const tick = () => {
    if (!active || exhausted || clock.pausedAt !== null) return;
    const result = tickSchedule(schedule, elapsedMs(clock, now), playing());
    if (!result.play) return;
    schedule = result.schedule;
    if (played >= queueLength) {
      exhausted = true;
      return;
    }
    played += 1;
    playingUntil = now + messageSeconds * 1000;
  };
  const phase = (): AudioPhase =>
    desiredPhase({
      sessionActive: active,
      paused: clock.pausedAt !== null,
      exhausted,
      queueFinished: false,
      audioMessageActive: playing(),
      audioAvailable: true,
    });

  return {
    at(ms: number) {
      now = 1_000_000 + ms;
      tick();
      return phase();
    },
    pause() {
      clock = pauseClock(clock, now);
      return phase();
    },
    resume() {
      clock = resumeClock(clock, now);
      tick();
      return phase();
    },
    end() {
      active = false;
      return phase();
    },
    get played() {
      return played;
    },
  };
}

describe('interval workout with the screen locked', () => {
  it('walks message → keep-alive → message on the N-minute grid', () => {
    const sim = simulator(5, 10);
    expect(sim.at(0)).toBe('message'); // first message right away
    expect(sim.at(10_000)).toBe('message');
    expect(sim.at(21_000)).toBe('keepAlive'); // message over: silent loop holds the session
    expect(sim.at(4 * MIN + 59_000)).toBe('keepAlive');
    expect(sim.at(5 * MIN)).toBe('message'); // the heartbeat fires the slot on time
    expect(sim.played).toBe(2);
    expect(sim.at(5 * MIN + 30_000)).toBe('keepAlive');
  });

  it('stops the keep-alive while paused and resumes it on the workout-time grid', () => {
    const sim = simulator(5, 10);
    sim.at(0);
    expect(sim.at(5 * MIN)).toBe('message');
    expect(sim.at(6 * MIN)).toBe('keepAlive');
    expect(sim.pause()).toBe('paused');
    expect(sim.at(20 * MIN)).toBe('paused'); // paused wall time doesn't count
    expect(sim.resume()).toBe('keepAlive');
    // Workout time is 6:00 at wall 20:00 → next slot at workout 10:00 = wall 24:00.
    expect(sim.at(23 * MIN + 59_000)).toBe('keepAlive');
    expect(sim.at(24 * MIN)).toBe('message');
  });

  it('plays a single message after a long suspension (no burst) and stays alive', () => {
    const sim = simulator(3, 10);
    sim.at(0);
    sim.at(30_000);
    const before = sim.played;
    expect(sim.at(37 * MIN)).toBe('message');
    expect(sim.played).toBe(before + 1);
    expect(sim.at(37 * MIN + 30_000)).toBe('keepAlive');
    expect(sim.at(38 * MIN)).toBe('keepAlive'); // next slot is 39:00, not "catch-up"
    expect(sim.at(39 * MIN)).toBe('message');
  });

  it('turns everything off once the queue is exhausted or the workout ends', () => {
    const sim = simulator(3, 1);
    expect(sim.at(0)).toBe('message');
    expect(sim.at(30_000)).toBe('keepAlive');
    expect(sim.at(3 * MIN)).toBe('off'); // no message left: no silent audio
    const other = simulator(3, 5);
    other.at(0);
    other.at(30_000);
    expect(other.end()).toBe('off');
  });
});

describe('interruptionModeFor', () => {
  it('keeps the keep-alive mixable and applies the athlete choice to messages', () => {
    expect(interruptionModeFor('keepAlive', 'mix')).toBe('mixWithOthers');
    expect(interruptionModeFor('keepAlive', 'pause')).toBe('mixWithOthers');
    expect(interruptionModeFor('message', 'mix')).toBe('duckOthers');
    expect(interruptionModeFor('message', 'pause')).toBe('doNotMix');
    expect(interruptionModeFor('off', 'mix')).toBe('duckOthers');
  });
});

describe('lock-screen controls', () => {
  it('needs a non-mixable session on iOS; Android always has its media notification', () => {
    expect(lockScreenControlsAvailable('ios', 'mix')).toBe(false);
    expect(lockScreenControlsAvailable('ios', 'pause')).toBe(true);
    expect(lockScreenControlsAvailable('android', 'mix')).toBe(true);
    expect(lockScreenControlsAvailable('android', 'pause')).toBe(true);
    expect(lockScreenControlsAvailable('web', 'pause')).toBe(false);
  });

  it('explains the choice in one line per platform', () => {
    expect(mixModeCaption('ios', 'mix')).toMatch(/sin controles/);
    expect(mixModeCaption('android', 'mix')).toMatch(/controles siguen/);
    expect(mixModeCaption('ios', 'pause')).toMatch(/cambian de mensaje/);
    for (const os of ['ios', 'android'] as const) {
      for (const mode of ['mix', 'pause'] as const) expect(mixModeCaption(os, mode)).not.toContain('\n');
    }
  });
});
