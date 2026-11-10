import { Platform } from 'react-native';
import type * as ExpoAudio from 'expo-audio';

/**
 * The only file that touches `expo-audio`. It is required lazily: a binary
 * built before expo-audio was added has no `ExpoAudio` native module and the
 * library throws at import time, so the failure becomes
 * `isAudioAvailable() === false` ("Actualiza la app") instead of a red
 * screen. Same pattern as `features/nfc/nfc-driver.ts`.
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

let appliedMode: MixMode | null = null;

/**
 * Training audio session: plays with the silent switch on, keeps playing
 * with the screen locked, and ducks (or pauses) other apps' audio.
 */
export async function applyAudioMode(mode: MixMode): Promise<void> {
  const mod = loadModule();
  if (!mod || appliedMode === mode) return;
  const interruptionMode = mode === 'mix' ? 'duckOthers' : 'doNotMix';
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
  } catch {
    // An old binary may reject options it doesn't know; playback still works in the foreground.
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
