/**
 * Pure playback-queue logic for Entrenamientos (unit-tested, no React, no
 * native code): building a queue from the message list, next/previous with
 * repeat (off / one / all), shuffle that keeps the current message first,
 * and removing a message that was hidden or blocked mid-session.
 */

export type RepeatMode = 'off' | 'one' | 'all';
/** "Modo entrenamiento" queue choices. */
export type QueueMode = 'unheard_first' | 'favorites' | 'all';

export interface QueueState {
  /** Message uuids in their natural (list) order. */
  ids: string[];
  /** Play order: a permutation of indices into `ids`. */
  order: number[];
  /** Index into `order` of the current message. */
  position: number;
  repeat: RepeatMode;
  shuffle: boolean;
}

export interface QueueItemLike {
  uuid: string;
  listened_at: string | null;
  favorite: boolean;
  created_at: string;
}

export const EMPTY_QUEUE: QueueState = { ids: [], order: [], position: 0, repeat: 'off', shuffle: false };

/** Seconds into a message after which "previous" restarts it instead of going back (Apple Music rule). */
export const RESTART_THRESHOLD_SECONDS = 3;

const identity = (n: number) => Array.from({ length: n }, (_, i) => i);

/** Orders messages for a training session. Stable: ties keep the list order. */
export function buildQueueIds(messages: QueueItemLike[], mode: QueueMode): string[] {
  if (mode === 'favorites') return messages.filter((m) => m.favorite).map((m) => m.uuid);
  if (mode === 'unheard_first') {
    const unheard = messages.filter((m) => !m.listened_at);
    const heard = messages.filter((m) => !!m.listened_at);
    return [...unheard, ...heard].map((m) => m.uuid);
  }
  return messages.map((m) => m.uuid);
}

/** Fisher–Yates with an injectable RNG (tests pass a seeded one). */
export function shuffled<T>(items: T[], random: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function createQueue(
  ids: string[],
  options: { startId?: string | null; repeat?: RepeatMode; shuffle?: boolean; random?: () => number } = {},
): QueueState {
  const unique = Array.from(new Set(ids));
  const startIndex = options.startId ? Math.max(0, unique.indexOf(options.startId)) : 0;
  const base: QueueState = {
    ids: unique,
    order: identity(unique.length),
    position: startIndex,
    repeat: options.repeat ?? 'off',
    shuffle: false,
  };
  return options.shuffle ? setShuffle(base, true, options.random) : base;
}

export function currentId(state: QueueState): string | null {
  const index = state.order[state.position];
  return index === undefined ? null : (state.ids[index] ?? null);
}

export function hasNext(state: QueueState): boolean {
  return state.position < state.order.length - 1 || (state.repeat === 'all' && state.order.length > 0);
}

/**
 * Advances the queue. `auto` = the message ended by itself (repeat "one"
 * replays it); a manual skip always moves on. Returns `null` when the queue
 * is finished (repeat off, last message).
 */
export function next(state: QueueState, { auto = false }: { auto?: boolean } = {}): QueueState | null {
  if (state.order.length === 0) return null;
  if (auto && state.repeat === 'one') return state;
  if (state.position < state.order.length - 1) return { ...state, position: state.position + 1 };
  if (state.repeat === 'all') return { ...state, position: 0 };
  return null;
}

/**
 * Goes back. Past the first seconds of a message it restarts it (`restart`
 * true, same position); at the very start it moves to the previous message
 * (wrapping only with repeat "all").
 */
export function previous(state: QueueState, positionSeconds: number): { state: QueueState; restart: boolean } {
  if (state.order.length === 0) return { state, restart: false };
  if (positionSeconds > RESTART_THRESHOLD_SECONDS) return { state, restart: true };
  if (state.position > 0) return { state: { ...state, position: state.position - 1 }, restart: false };
  if (state.repeat === 'all') return { state: { ...state, position: state.order.length - 1 }, restart: false };
  return { state, restart: true };
}

/** Jumps to a specific message (tap on a row while a queue is active). */
export function jumpTo(state: QueueState, id: string): QueueState | null {
  const index = state.ids.indexOf(id);
  if (index < 0) return null;
  const position = state.order.indexOf(index);
  return position < 0 ? null : { ...state, position };
}

/**
 * Shuffle on: the current message stays first and the rest is shuffled
 * after it — tapping shuffle never interrupts what's playing.
 * Shuffle off: natural order, still on the same message.
 */
export function setShuffle(state: QueueState, on: boolean, random: () => number = Math.random): QueueState {
  const current = state.order[state.position];
  if (state.order.length === 0) return { ...state, shuffle: on };
  if (!on) return { ...state, shuffle: false, order: identity(state.ids.length), position: current ?? 0 };
  const rest = identity(state.ids.length).filter((i) => i !== current);
  const order = current === undefined ? shuffled(rest, random) : [current, ...shuffled(rest, random)];
  return { ...state, shuffle: true, order, position: 0 };
}

export function cycleRepeat(mode: RepeatMode): RepeatMode {
  return mode === 'off' ? 'all' : mode === 'all' ? 'one' : 'off';
}

/**
 * Removes a message (hidden / sender blocked). The queue stays on the same
 * message if it wasn't the removed one; otherwise it lands on whatever now
 * occupies that slot (the next message), clamped to the end.
 */
export function removeId(state: QueueState, id: string): QueueState {
  const removed = state.ids.indexOf(id);
  if (removed < 0) return state;
  const ids = state.ids.filter((_, i) => i !== removed);
  const removedPosition = state.order.indexOf(removed);
  const order = state.order.filter((i) => i !== removed).map((i) => (i > removed ? i - 1 : i));
  let position = state.position;
  if (removedPosition < state.position) position -= 1;
  position = Math.max(0, Math.min(position, order.length - 1));
  return { ...state, ids, order, position: order.length ? position : 0 };
}

/** Number of messages left after the current one (for "3 más en la cola"). */
export function remainingCount(state: QueueState): number {
  return Math.max(0, state.order.length - state.position - 1);
}
