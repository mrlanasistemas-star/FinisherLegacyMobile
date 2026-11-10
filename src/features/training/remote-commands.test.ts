/**
 * Tests for inferring lock-screen commands from the status stream: ±10 s
 * skips become next / previous message, natural playback and the end of a
 * message are never misread, and native pauses / resumes are detected.
 */
import { classifyRemoteChange, type StatusSample } from './remote-commands';

const sample = (position: number, at: number, playing = true, buffering = false): StatusSample => ({ position, playing, buffering, at });
const curr = (position: number, at: number, extra: Partial<{ playing: boolean; buffering: boolean; finished: boolean; duration: number }> = {}) => ({
  position,
  at,
  playing: extra.playing ?? true,
  buffering: extra.buffering ?? false,
  finished: extra.finished ?? false,
  duration: extra.duration ?? 60,
});

describe('classifyRemoteChange', () => {
  it('ignores natural playback at any speed', () => {
    expect(classifyRemoteChange(sample(5, 0), curr(5.25, 250), 1)).toBeNull();
    expect(classifyRemoteChange(sample(5, 0), curr(5.5, 250), 2)).toBeNull();
    expect(classifyRemoteChange(null, curr(15, 250), 1)).toBeNull();
  });

  it('reads +10 s as next and −10 s as previous', () => {
    expect(classifyRemoteChange(sample(5, 0), curr(15.25, 250), 1)).toBe('next');
    expect(classifyRemoteChange(sample(30, 0), curr(20.25, 250), 1)).toBe('previous');
    // At 1.5× the natural advance is subtracted first.
    expect(classifyRemoteChange(sample(5, 0), curr(15.4, 250), 1.5)).toBe('next');
  });

  it('reads a skip past the end as next, and a skip back clamped at 0 as previous', () => {
    expect(classifyRemoteChange(sample(16, 0), curr(20, 250, { finished: true, playing: false, duration: 20 }), 1)).toBe('next');
    expect(classifyRemoteChange(sample(4, 0), curr(0, 250), 1)).toBe('previous');
  });

  it('does not read a natural end, a small scrub or a restart from the first second as a command', () => {
    expect(classifyRemoteChange(sample(19.8, 0), curr(20, 250, { finished: true, playing: false, duration: 20 }), 1)).toBeNull();
    expect(classifyRemoteChange(sample(5, 0), curr(8, 250), 1)).toBeNull();
    expect(classifyRemoteChange(sample(0.6, 0), curr(0, 250), 1)).toBeNull();
  });

  it('detects native pause and play, but not buffering or the end of the message', () => {
    expect(classifyRemoteChange(sample(10, 0), curr(10.1, 250, { playing: false }), 1)).toBe('pause');
    expect(classifyRemoteChange(sample(10, 0, false), curr(10, 250), 1)).toBe('play');
    expect(classifyRemoteChange(sample(10, 0), curr(10.1, 250, { playing: false, buffering: true }), 1)).toBeNull();
    expect(classifyRemoteChange(sample(19.6, 0), curr(19.8, 250, { playing: false, duration: 20 }), 1)).toBeNull();
  });
});
