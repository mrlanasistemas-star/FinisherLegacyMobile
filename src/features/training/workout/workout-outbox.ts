import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
import { create } from 'zustand';

import { createWorkout, discardWorkout, finishWorkout } from '@/api/workouts';
import { AppError } from '@/api/errors';
import { backoffDelay } from '@/features/tracking/points';
import type { FinishWorkoutInput, ManualWorkoutInput, StartWorkoutInput } from '@/schemas/workouts';

/**
 * Offline outbox for Modo entrenamiento — same pattern as the live-tracking
 * uploader: writes are persisted first, then sent in order; transient
 * failures keep them and retry with backoff, and the moment the connection
 * comes back the queue drains. A finish recorded in a tunnel is never lost.
 *
 * Ordering matters: a workout's `start` must reach the server before its
 * `finish` (the finish needs the server uuid), so the queue is strictly
 * sequential and keyed by the workout's `client_uuid`.
 */

/** What the history shows for an operation still waiting to sync. */
export interface PendingSummary {
  sportName: string;
  sportSlug: string;
  source: 'live' | 'manual';
  startedAt: string;
  durationS: number;
  distanceM: number | null;
}

export type OutboxOp =
  | { id: string; kind: 'start'; clientUuid: string; body: StartWorkoutInput }
  | { id: string; kind: 'manual'; clientUuid: string; body: ManualWorkoutInput; summary: PendingSummary }
  | { id: string; kind: 'finish'; clientUuid: string; body: FinishWorkoutInput; summary: PendingSummary }
  | { id: string; kind: 'discard'; clientUuid: string };

/** An op before it gets its id (distributive, so each kind keeps its own fields). */
export type NewOutboxOp = OutboxOp extends infer T ? (T extends OutboxOp ? Omit<T, 'id'> : never) : never;

export type OutboxBlock = 'offline' | 'server' | 'login' | 'conflict' | null;

interface OutboxState {
  ops: OutboxOp[];
  /** client_uuid → server uuid, once a start/manual was accepted. */
  uuids: Record<string, string>;
  /** Why the queue is waiting (null = idle or draining). */
  blocked: OutboxBlock;
  /** The server's running workout that blocked a start (409), for the resolve prompt. */
  conflictUuid: string | null;
  lastSyncAt: string | null;
  hydrated: boolean;
}

const KEY = 'fl_workout_outbox_v1';
const EMPTY: OutboxState = { ops: [], uuids: {}, blocked: null, conflictUuid: null, lastSyncAt: null, hydrated: false };

export const useWorkoutOutbox = create<OutboxState>(() => EMPTY);

let chain: Promise<unknown> = Promise.resolve();
function exclusive<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.catch(() => undefined);
  return run;
}

async function read(): Promise<OutboxState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<OutboxState>), hydrated: true } : { ...EMPTY, hydrated: true };
  } catch {
    return { ...EMPTY, hydrated: true };
  }
}

async function write(state: OutboxState): Promise<void> {
  // Keep the uuid map small: only workouts the outbox still references, plus the latest 50.
  const keep = new Set(state.ops.map((op) => op.clientUuid));
  const entries = Object.entries(state.uuids);
  const uuids = Object.fromEntries(entries.filter(([client], index) => keep.has(client) || index >= entries.length - 50));
  const next = { ...state, uuids, hydrated: true };
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  useWorkoutOutbox.setState(next);
}

function update(fn: (state: OutboxState) => OutboxState): Promise<OutboxState> {
  return exclusive(async () => {
    const next = fn(await read());
    await write(next);
    return next;
  });
}

export function loadOutbox(): Promise<OutboxState> {
  return exclusive(async () => {
    const state = await read();
    useWorkoutOutbox.setState(state);
    return state;
  });
}

let counter = 0;
const opId = () => `${Date.now().toString(36)}-${(counter += 1)}`;

export async function enqueue(op: NewOutboxOp): Promise<void> {
  await update((state) => ({ ...state, ops: [...state.ops, { ...op, id: opId() } as OutboxOp] }));
  watchConnectivity();
  flushOutbox().catch(() => {});
}

/**
 * Discarding a workout whose start never left the phone: drop its queued
 * ops instead of sending start + discard. Returns true when that happened.
 */
export async function dropUnsentWorkout(clientUuid: string): Promise<boolean> {
  let dropped = false;
  await update((state) => {
    if (state.uuids[clientUuid]) return state;
    const ops = state.ops.filter((op) => op.clientUuid !== clientUuid);
    dropped = ops.length !== state.ops.length;
    return { ...state, ops };
  });
  return dropped;
}

export function serverUuidFor(clientUuid: string): string | null {
  return useWorkoutOutbox.getState().uuids[clientUuid] ?? null;
}

/** Called after the athlete resolved a 409 conflict (finished or discarded the other workout). */
export async function clearConflict(): Promise<void> {
  await update((state) => ({ ...state, blocked: null, conflictUuid: null }));
  flushOutbox().catch(() => {});
}

let inFlight: Promise<void> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let attempt = 0;
const startedListeners = new Set<(clientUuid: string, serverUuid: string) => void>();

/** The controller learns the server uuid of a workout that is still running. */
export function onWorkoutStarted(listener: (clientUuid: string, serverUuid: string) => void): () => void {
  startedListeners.add(listener);
  return () => startedListeners.delete(listener);
}

export function flushOutbox(): Promise<void> {
  inFlight ??= runFlush().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

type Outcome = 'done' | 'drop' | 'stop';

async function runFlush(): Promise<void> {
  for (let round = 0; round < 100; round += 1) {
    const state = await exclusive(read);
    const op = state.ops[0];
    if (!op) {
      attempt = 0;
      if (state.blocked) await update((s) => ({ ...s, blocked: null }));
      return;
    }

    const outcome = await send(op, state);
    if (outcome === 'stop') return;
    await update((s) => ({
      ...s,
      ops: s.ops.filter((o) => o.id !== op.id),
      blocked: null,
      conflictUuid: outcome === 'done' ? null : s.conflictUuid,
      lastSyncAt: outcome === 'done' ? new Date().toISOString() : s.lastSyncAt,
    }));
  }
}

async function send(op: OutboxOp, state: OutboxState): Promise<Outcome> {
  try {
    if (op.kind === 'start' || op.kind === 'manual') {
      const workout = await createWorkout(op.body);
      await update((s) => ({ ...s, uuids: { ...s.uuids, [op.clientUuid]: workout.uuid } }));
      if (op.kind === 'start') startedListeners.forEach((listener) => listener(op.clientUuid, workout.uuid));
      return 'done';
    }

    const uuid = state.uuids[op.clientUuid];
    // Its start was rejected for good (422): nothing on the server to finish or discard.
    if (!uuid) return 'drop';
    if (op.kind === 'finish') await finishWorkout(uuid, op.body);
    else await discardWorkout(uuid);
    return 'done';
  } catch (error) {
    const appError = error instanceof AppError ? error : null;
    const status = appError?.status;

    if (status === 409 && op.kind === 'start' && appError?.details?.reason === 'workout_in_progress') {
      const other = typeof appError.details.workout_uuid === 'string' ? appError.details.workout_uuid : null;
      await update((s) => ({ ...s, blocked: 'conflict', conflictUuid: other }));
      return 'stop';
    }
    if (appError?.kind === 'unauthenticated' || status === 401) {
      await update((s) => ({ ...s, blocked: 'login' }));
      return 'stop';
    }
    // The request itself is unusable or the workout is gone / already closed: never block the queue on it.
    if (status === 404 || status === 409 || status === 410 || status === 422 || status === 403) return 'drop';

    const offline = appError?.kind === 'network' || appError?.kind === 'timeout';
    await update((s) => ({ ...s, blocked: offline ? 'offline' : 'server' }));
    scheduleRetry();
    return 'stop';
  }
}

function scheduleRetry() {
  if (retryTimer) return;
  const delay = backoffDelay(attempt);
  attempt += 1;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    flushOutbox().catch(() => {});
  }, delay);
}

let networkSubscription: { remove: () => void } | null = null;

/** Drain the moment the connection comes back (foreground JS runtime). */
export function watchConnectivity() {
  if (networkSubscription) return;
  networkSubscription = Network.addNetworkStateListener((state) => {
    if (state.isConnected && state.isInternetReachable !== false) {
      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = null;
      attempt = 0;
      flushOutbox().catch(() => {});
    }
  });
}
