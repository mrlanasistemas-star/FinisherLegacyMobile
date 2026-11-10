/**
 * Pure audio-session policy of Entrenamientos (unit-tested, no native code).
 *
 * A workout ("Modo entrenamiento") moves the shared audio session through
 * four phases:
 *
 * - `off`       → no workout: messages play on demand and the OS session is
 *                 released after each one (expo-audio's default behaviour).
 * - `keepAlive` → a workout is running but no voice note is playing (waiting
 *                 for the next interval slot, or showing a text-only
 *                 message). A near-silent looping track plays in a MIXABLE
 *                 session (`mixWithOthers`: the athlete's music is untouched)
 *                 so iOS keeps the app alive with the screen locked and the
 *                 interval scheduler fires on time. On Android the same
 *                 track owns the media notification, which keeps the
 *                 expo-audio foreground service (and the JS process) alive.
 * - `message`   → a voice note is playing with the athlete's choice:
 *                 `duckOthers` ("Mezclar") or `doNotMix` ("Pausar").
 * - `paused`    → the workout is paused: nothing plays, the session is
 *                 released (App Store 2.5.4: no silent audio while the
 *                 athlete isn't training).
 *
 * Lock-screen policy: iOS shows Now Playing controls only for a
 * NON-mixable session, so on iPhone they exist only in "Pausar mi música".
 * Android shows its media notification in both modes.
 */

import type { InterruptionMode } from 'expo-audio';

import type { MixMode } from './audio-driver';

export type AudioPhase = 'off' | 'keepAlive' | 'message' | 'paused';

export interface PhaseInput {
  sessionActive: boolean;
  /** The workout clock is paused. */
  paused: boolean;
  /** Interval mode played every message (repeat off). */
  exhausted: boolean;
  /** Continuous mode: the last message ended and nothing comes next. */
  queueFinished: boolean;
  /** A message WITH audio is playing or loading (text-only messages don't count). */
  audioMessageActive: boolean;
  /** expo-audio exists in this binary. */
  audioAvailable: boolean;
}

/** Which phase the audio session should be in right now. */
export function desiredPhase(input: PhaseInput): AudioPhase {
  if (!input.sessionActive || !input.audioAvailable) return 'off';
  if (input.paused) return 'paused';
  if (input.exhausted || input.queueFinished) return 'off';
  return input.audioMessageActive ? 'message' : 'keepAlive';
}

/** The OS interruption mode for a phase: the keep-alive never touches the athlete's music. */
export function interruptionModeFor(phase: AudioPhase, mixMode: MixMode): InterruptionMode {
  if (phase === 'keepAlive') return 'mixWithOthers';
  return mixMode === 'mix' ? 'duckOthers' : 'doNotMix';
}

export type Os = 'ios' | 'android' | 'web' | 'windows' | 'macos';

/** iOS needs a non-mixable session for Now Playing; Android's media notification works in both modes. */
export function lockScreenControlsAvailable(os: Os, mixMode: MixMode): boolean {
  if (os === 'android') return true;
  if (os === 'ios') return mixMode === 'pause';
  return false;
}

/** The one-line explanation under "Mezclar / Pausar mi música". */
export function mixModeCaption(os: Os, mixMode: MixMode): string {
  if (mixMode === 'mix') {
    return os === 'ios'
      ? 'Tu música baja un momento con cada mensaje; en iPhone, sin controles en la pantalla bloqueada.'
      : 'Tu música baja un momento con cada mensaje; los controles siguen en la pantalla bloqueada.';
  }
  return 'Tu música se pausa en cada mensaje; en la pantalla bloqueada, ⏩ y ⏪ cambian de mensaje.';
}
