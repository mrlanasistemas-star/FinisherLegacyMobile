/**
 * Infers lock-screen / headset commands from the player's status stream
 * (pure, unit-tested).
 *
 * expo-audio 57 handles the remote commands natively and never tells JS:
 * play/pause/toggle, scrubbing, and skip ±10 s (`showSeekForward/Backward`).
 * It has no next/previous track for a single `AudioPlayer` (expo-audio 58
 * adds `showNextTrack` only for `AudioPlaylist`; Android explicitly removes
 * `COMMAND_SEEK_TO_NEXT/PREVIOUS`). So the controller watches consecutive
 * status samples that were NOT caused by JS and classifies them:
 *
 * - a jump of +10 s (± tolerance) beyond natural playback → `next`
 *   (also: the message finishing right after a forward jump, i.e. +10 s
 *   past the end);
 * - a jump of −10 s, or a jump to 0 from the first ~10 s → `previous`
 *   (the controller applies the Apple rule: past 3 s it restarts);
 * - playing → paused (not finished, not buffering, not at the end) → `pause`
 *   (lock screen, headset, headphones unplugged, phone call);
 * - paused → playing → `play`.
 *
 * A lock-screen scrub that happens to land ≈10 s away is indistinguishable
 * from a skip; that is accepted (it moves to the next/previous message).
 */

export type RemoteIntent = 'next' | 'previous' | 'pause' | 'play';

export interface StatusSample {
  /** Seconds. */
  position: number;
  playing: boolean;
  buffering: boolean;
  /** Epoch ms when JS received the sample. */
  at: number;
}

export const SKIP_SECONDS = 10;
const TOLERANCE = 1;

export function classifyRemoteChange(
  prev: StatusSample | null,
  curr: StatusSample & { finished: boolean; duration: number },
  rate: number,
): RemoteIntent | null {
  if (!prev) return null;
  const expected = prev.playing ? (Math.max(0, curr.at - prev.at) / 1000) * rate : 0;
  const delta = curr.position - prev.position - expected;

  if (Math.abs(delta - SKIP_SECONDS) <= TOLERANCE) return 'next';
  if (curr.finished && delta > 1.5) return 'next';
  if (Math.abs(delta + SKIP_SECONDS) <= TOLERANCE) return 'previous';
  if (curr.position <= 0.5 && prev.position >= 1 && prev.position <= SKIP_SECONDS + TOLERANCE && delta < -0.9) return 'previous';

  // Some platforms report "not playing" a beat before `didJustFinish`: never read the end as a pause.
  const atEnd = curr.duration > 0 && curr.position >= curr.duration - 0.75;
  if (prev.playing && !curr.playing && !curr.finished && !curr.buffering && !atEnd) return 'pause';
  if (!prev.playing && curr.playing) return 'play';
  return null;
}
