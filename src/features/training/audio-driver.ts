import { Platform } from 'react-native';
import type * as ExpoAudio from 'expo-audio';

import { interruptionModeFor, type AudioPhase } from './audio-session';

/**
 * The only file that touches `expo-audio`. It is required lazily: a binary
 * built before expo-audio was added has no `ExpoAudio` native module and the
 * library throws at import time, so the failure becomes
 * `isAudioAvailable() === false` ("Actualiza la app") instead of a red
 * screen. Same pattern as `features/nfc/nfc-driver.ts`.
 *
 * Besides the message player it creates the workout keep-alive player (a
 * bundled 10 s silent AAC loop, ~4 KB) and switches the shared audio
 * session between the phases described in `audio-session.ts`.
 */

type Module = typeof ExpoAudio;
export type AudioPlayer = ExpoAudio.AudioPlayer;
export type AudioStatus = ExpoAudio.AudioStatus;

/**
 * How messages coexist with the athlete's own music (Spotify, Apple Music…):
 * - `mix`   → "Mezclar con mi música": the music keeps playing and is lowered
 *             (ducked) while a message plays, then comes back.
 * - `pause` → "Pausar mi música": the music pauses for the message.
 */
export type MixMode = 'mix' | 'pause';

/** What the session is configured for: a message (athlete's choice) or the keep-alive (always mixable). */
export type SessionMode = MixMode | 'keepAlive';

let cached: { module: Module | null } | null = null;

function loadModule(): Module | null {
  if (cached) return cached.module;
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    cached = { module: null };
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo-audio') as Module;
    cached = { module: typeof mod?.createAudioPlayer === 'function' ? mod : null };
  } catch {
    cached = { module: null };
  }
  return cached.module;
}

export function isAudioAvailable(): boolean {
  return loadModule() !== null;
}

let appliedMode: SessionMode | null = null;

/**
 * Training audio session: plays with the silent switch on, keeps playing
 * with the screen locked, and ducks / pauses other apps' audio for a
 * message — or mixes silently with them for the keep-alive. Resolves false
 * when the OS rejected the mode.
 */
export async function applyAudioMode(mode: SessionMode): Promise<boolean> {
  const mod = loadModule();
  if (!mod) return false;
  if (appliedMode === mode) return true;
  const phase: AudioPhase = mode === 'keepAlive' ? 'keepAlive' : 'message';
  const interruptionMode = interruptionModeFor(phase, mode === 'keepAlive' ? 'mix' : mode);
  try {
    await mod.setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode,
      interruptionModeAndroid: interruptionMode,
      allowsRecording: false,
      shouldRouteThroughEarpiece: false,
    });
    appliedMode = mode;
    return true;
  } catch {
    // An old binary may reject options it doesn't know; playback still works in the foreground.
    appliedMode = null;
    return false;
  }
}

/**
 * iOS: deactivates the session with `notifyOthersOnDeactivation`, so music
 * that was ducked comes back to full volume and music that was paused
 * ("Pausar mi música") resumes. Needed because the keep-alive keeps the
 * session active, so expo-audio's own "deactivate after playback" never
 * runs. Pauses every player (callers only use it between messages).
 * Android: no-op — audio focus is released as soon as nothing plays, and
 * `setIsAudioActiveAsync(false)` would disable playback until re-enabled.
 */
export async function releaseOtherAppsAudio(): Promise<void> {
  const mod = loadModule();
  if (!mod || Platform.OS !== 'ios') return;
  try {
    await mod.setIsAudioActiveAsync(false);
  } catch {
    // Nothing to release.
  }
}

/** A long-lived player (released explicitly), or null without the native module. */
export function createPlayer(): AudioPlayer | null {
  const mod = loadModule();
  if (!mod) return null;
  try {
    return mod.createAudioPlayer(null, { updateInterval: 250 });
  } catch {
    return null;
  }
}

/** Keep-alive volume: the track is digital silence anyway; this only guards against encoder noise. */
const KEEP_ALIVE_VOLUME = 0.01;

/**
 * The workout keep-alive: a looping silent track. `keepAudioSessionActive`
 * stops expo-audio from deactivating the session when it pauses for a
 * message (the app must stay alive across that hand-over). Its 1 s status
 * updates double as the scheduler heartbeat: they are native events, so
 * they reach JS even where RN timers are paused (Android background).
 */
export function createKeepAlivePlayer(): AudioPlayer | null {
  const mod = loadModule();
  if (!mod) return null;
  try {
    const source = require('./assets/silence.m4a') as number;
    const p = mod.createAudioPlayer(source, { updateInterval: 1000, keepAudioSessionActive: true });
    p.loop = true;
    p.volume = KEEP_ALIVE_VOLUME;
    return p;
  } catch {
    return null;
  }
}
