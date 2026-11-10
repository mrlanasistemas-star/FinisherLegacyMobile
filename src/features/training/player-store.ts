import { create } from 'zustand';

import type { TrainingMessage } from '@/schemas/training';

import type { AudioPhase } from './audio-session';
import { currentId, EMPTY_QUEUE, type QueueState } from './queue';
import { IDLE_CLOCK, type IntervalSchedule, type WorkoutClock } from './session-clock';

/**
 * In-memory state of the Entrenamientos player (never persisted: signed
 * audio URLs expire and a restart should start clean). The store only holds
 * state; `player-controller.ts` drives the native player and writes here.
 */

export interface PlaybackStatus {
  playing: boolean;
  /** Seconds. */
  position: number;
  /** Seconds (falls back to the message's `duration_seconds` until loaded). */
  duration: number;
  buffering: boolean;
  /** The current message finished and nothing auto-advanced. */
  ended: boolean;
  error: string | null;
}

export const IDLE_STATUS: PlaybackStatus = { playing: false, position: 0, duration: 0, buffering: false, ended: false, error: null };

export interface SessionState {
  active: boolean;
  clock: WorkoutClock;
  /** null = continuous queue (no interval). */
  schedule: IntervalSchedule | null;
  /** The interval queue already started its first message. */
  started: boolean;
  /** Every message of the queue was played (interval mode, repeat off). */
  exhausted: boolean;
}

export const IDLE_SESSION: SessionState = { active: false, clock: IDLE_CLOCK, schedule: null, started: false, exhausted: false };

interface PlayerStoreState {
  messages: Record<string, TrainingMessage>;
  queue: QueueState;
  status: PlaybackStatus;
  /** The full-screen player is open (the mini-player hides). */
  sheetOpen: boolean;
  /** expo-audio isn't in this binary — "Actualiza la app". */
  audioUnavailable: boolean;
  session: SessionState;
  /** Audio-session phase of the workout (`keepAlive` = "Sesión activa" with the screen locked). */
  audioPhase: AudioPhase;
}

export const usePlayerStore = create<PlayerStoreState>(() => ({
  messages: {},
  queue: EMPTY_QUEUE,
  status: IDLE_STATUS,
  sheetOpen: false,
  audioUnavailable: false,
  session: IDLE_SESSION,
  audioPhase: 'off',
}));

export function setPlayerState(patch: Partial<PlayerStoreState>) {
  usePlayerStore.setState(patch);
}

export function patchStatus(patch: Partial<PlaybackStatus>) {
  usePlayerStore.setState((state) => ({ status: { ...state.status, ...patch } }));
}

export function patchSession(patch: Partial<SessionState>) {
  usePlayerStore.setState((state) => ({ session: { ...state.session, ...patch } }));
}

/** The message under the play head, or null. */
export function useCurrentMessage(): TrainingMessage | null {
  return usePlayerStore((state) => {
    const id = currentId(state.queue);
    return id ? (state.messages[id] ?? null) : null;
  });
}

export function getCurrentMessage(): TrainingMessage | null {
  const state = usePlayerStore.getState();
  const id = currentId(state.queue);
  return id ? (state.messages[id] ?? null) : null;
}
