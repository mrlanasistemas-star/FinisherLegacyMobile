import { isProcessing, type TrainingMessage } from '@/schemas/training';
import { haptics } from '@/utils/haptics';

import { applyAudioMode, createPlayer, type AudioPlayer, type AudioStatus } from './audio-driver';
import { localAudioUri } from './offline-cache';
import {
  getCurrentMessage,
  IDLE_SESSION,
  IDLE_STATUS,
  patchSession,
  patchStatus,
  setPlayerState,
  usePlayerStore,
} from './player-store';
import {
  buildQueueIds,
  createQueue,
  cycleRepeat as nextRepeatMode,
  EMPTY_QUEUE,
  next,
  previous,
  removeId,
  setShuffle,
  type QueueMode,
} from './queue';
import {
  createSchedule,
  elapsedMs,
  pauseClock,
  reachedListenedMark,
  readingSeconds,
  resumeClock,
  startClock,
  tickSchedule,
  type IntervalMinutes,
} from './session-clock';
import { useTrainingSettings, type PlaybackRate } from './settings-store';

/**
 * Imperative engine of the Entrenamientos player — one long-lived native
 * player for the whole app (the mini-player, the full player and "Modo
 * entrenamiento" all drive it). Owns: loading a message (local file first,
 * then the signed URL), speed with pitch correction, volume, lock-screen
 * "now playing", auto-advance with repeat/shuffle (pure rules in
 * `queue.ts`), the auto "listened" mark at 80 %, timed display of text-only
 * messages, and the interval scheduler of a workout session.
 */

let player: AudioPlayer | null = null;
let textTimer: ReturnType<typeof setInterval> | null = null;
/** False in interval sessions: the scheduler decides when the next message starts. */
let autoAdvance = true;
/** uuid currently loaded in the player (guards stale status events). */
let loadedId: string | null = null;
const marked = new Set<string>();
let listenedHandler: ((uuid: string) => void) | null = null;

/** The bridge registers the API call + cache update for the "listened" mark. */
export function registerListenedHandler(handler: ((uuid: string) => void) | null) {
  listenedHandler = handler;
}

function ensurePlayer(): AudioPlayer | null {
  if (player) return player;
  player = createPlayer();
  if (!player) {
    setPlayerState({ audioUnavailable: true });
    return null;
  }
  player.addListener('playbackStatusUpdate', onStatus);
  return player;
}

function hasAudio(message: TrainingMessage): boolean {
  return !!message.audio_url || !!localAudioUri(message.uuid);
}

function markListened(message: TrainingMessage) {
  if (message.listened_at || marked.has(message.uuid)) return;
  marked.add(message.uuid);
  updateMessage(message.uuid, { listened_at: new Date().toISOString() });
  listenedHandler?.(message.uuid);
}

function onStatus(status: AudioStatus) {
  const message = getCurrentMessage();
  if (!message || message.uuid !== loadedId || !hasAudio(message)) return;
  const duration = status.duration > 0 ? status.duration : message.duration_seconds;
  patchStatus({
    playing: status.playing,
    position: status.currentTime,
    duration,
    buffering: status.isBuffering && !status.playing,
    error: status.error ?? null,
    ended: status.didJustFinish ? true : status.playing ? false : usePlayerStore.getState().status.ended,
  });
  if (reachedListenedMark(status.currentTime, duration, status.didJustFinish)) markListened(message);
  if (status.didJustFinish) handleEnded();
}

function stopTextTimer() {
  if (textTimer) clearInterval(textTimer);
  textTimer = null;
}

/** Text-only messages "play" for their reading time so the scrubber and the queue behave the same. */
function runTextTimer() {
  stopTextTimer();
  let last = Date.now();
  textTimer = setInterval(() => {
    const now = Date.now();
    const { status } = usePlayerStore.getState();
    const message = getCurrentMessage();
    const rate = useTrainingSettings.getState().rate;
    const position = Math.min(status.duration, status.position + ((now - last) / 1000) * rate);
    last = now;
    patchStatus({ position, playing: true });
    if (message && reachedListenedMark(position, status.duration, position >= status.duration)) markListened(message);
    if (position >= status.duration) {
      stopTextTimer();
      patchStatus({ playing: false, ended: true });
      handleEnded();
    }
  }, 250);
}

function applyRateAndVolume(p: AudioPlayer) {
  const { rate, volume } = useTrainingSettings.getState();
  try {
    p.shouldCorrectPitch = true;
    p.setPlaybackRate(rate, 'high');
    p.volume = volume;
  } catch {
    // Not loaded yet on some platforms; re-applied on the next load.
  }
}

function showOnLockScreen(p: AudioPlayer, message: TrainingMessage) {
  try {
    p.setActiveForLockScreen(
      true,
      {
        title: message.relationship ? `${message.sender_name} · ${message.relationship}` : message.sender_name,
        artist: 'Finisher Legacy · Entrenamientos',
        albumTitle: message.link?.title ?? 'Envíame ánimo',
      },
      { showSeekForward: true, showSeekBackward: true },
    );
  } catch {
    // Lock-screen controls are a bonus; never block playback on them.
  }
}

/** Loads the current queue message into the engine, optionally playing it. */
function loadCurrent(play: boolean) {
  stopTextTimer();
  const message = getCurrentMessage();
  if (!message) {
    stopPlayback();
    return;
  }
  loadedId = message.uuid;

  if (!hasAudio(message)) {
    try {
      player?.pause();
    } catch {
      // ignore
    }
    patchStatus({ ...IDLE_STATUS, duration: readingSeconds(message.body), playing: play });
    if (play) {
      haptics.light();
      runTextTimer();
    }
    return;
  }

  patchStatus({ ...IDLE_STATUS, duration: message.duration_seconds, buffering: play });
  const p = ensurePlayer();
  if (!p) {
    patchStatus({ ...IDLE_STATUS, duration: message.duration_seconds, error: 'unavailable' });
    return;
  }
  void applyAudioMode(useTrainingSettings.getState().mixMode);
  const uri = localAudioUri(message.uuid) ?? message.audio_url;
  try {
    p.replace({ uri: uri ?? undefined, name: message.sender_name });
    applyRateAndVolume(p);
    if (play) {
      p.play();
      haptics.light();
    }
    showOnLockScreen(p, message);
  } catch {
    patchStatus({ playing: false, buffering: false, error: 'load' });
  }
}

function handleEnded() {
  const state = usePlayerStore.getState();
  if (!autoAdvance) {
    patchStatus({ playing: false, ended: true });
    return;
  }
  const following = next(state.queue, { auto: true });
  if (!following) {
    patchStatus({ playing: false, ended: true });
    return;
  }
  if (following === state.queue) {
    // Repeat one.
    const message = getCurrentMessage();
    if (message && !hasAudio(message)) {
      patchStatus({ position: 0, ended: false });
      runTextTimer();
    } else if (player) {
      void player.seekTo(0).then(() => player?.play());
    }
    return;
  }
  setPlayerState({ queue: following });
  loadCurrent(true);
}

function stopPlayback() {
  stopTextTimer();
  try {
    player?.pause();
    player?.clearLockScreenControls();
  } catch {
    // ignore
  }
  loadedId = null;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Plays `startId` with `messages` as the queue (list order). Re-tapping the
 * loaded message just resumes it. Voice notes still processing never enter
 * the queue; returns false when the tapped one is processing.
 */
export function playFromList(allMessages: TrainingMessage[], startId: string): boolean {
  const state = usePlayerStore.getState();
  if (loadedId === startId && !state.session.active) {
    if (!state.status.playing) togglePlay();
    return true;
  }
  const messages = allMessages.filter((m) => !isProcessing(m));
  if (!messages.some((m) => m.uuid === startId)) return false;
  autoAdvance = true;
  const queue = createQueue(
    messages.map((m) => m.uuid),
    { startId, repeat: state.queue.repeat, shuffle: state.queue.shuffle },
  );
  // createQueue starts on the tapped message (and keeps it first when shuffling).
  setPlayerState({ messages: Object.fromEntries(messages.map((m) => [m.uuid, m])), queue, session: IDLE_SESSION });
  loadCurrent(true);
  return true;
}

export function togglePlay() {
  const { status } = usePlayerStore.getState();
  const message = getCurrentMessage();
  if (!message) return;
  if (!hasAudio(message)) {
    if (status.playing) {
      stopTextTimer();
      patchStatus({ playing: false });
    } else {
      if (status.ended || status.position >= status.duration) patchStatus({ position: 0, ended: false });
      patchStatus({ playing: true });
      runTextTimer();
    }
    return;
  }
  const p = ensurePlayer();
  if (!p) return;
  if (loadedId !== message.uuid) {
    loadCurrent(true);
    return;
  }
  try {
    if (status.playing) {
      p.pause();
    } else {
      void applyAudioMode(useTrainingSettings.getState().mixMode);
      if (status.ended) {
        patchStatus({ ended: false });
        void p.seekTo(0).then(() => p.play());
      } else {
        p.play();
      }
    }
  } catch {
    patchStatus({ error: 'load' });
  }
}

export function pause() {
  const { status } = usePlayerStore.getState();
  if (!status.playing) return;
  togglePlay();
}

export function seekTo(seconds: number) {
  const { status } = usePlayerStore.getState();
  const message = getCurrentMessage();
  if (!message) return;
  const target = Math.max(0, Math.min(seconds, status.duration || seconds));
  patchStatus({ position: target, ended: false });
  if (!hasAudio(message)) return;
  try {
    void player?.seekTo(target);
  } catch {
    // ignore
  }
}

export function skipBy(deltaSeconds: number) {
  seekTo(usePlayerStore.getState().status.position + deltaSeconds);
}

export function nextTrack() {
  const state = usePlayerStore.getState();
  const following = next(state.queue);
  if (!following) return;
  haptics.selection();
  setPlayerState({ queue: following });
  loadCurrent(true);
}

export function previousTrack() {
  const state = usePlayerStore.getState();
  const result = previous(state.queue, state.status.position);
  haptics.selection();
  if (result.restart) {
    seekTo(0);
    return;
  }
  setPlayerState({ queue: result.state });
  loadCurrent(true);
}

export function setRate(rate: PlaybackRate) {
  useTrainingSettings.getState().setRate(rate);
  if (player) applyRateAndVolume(player);
}

export function setVolume(volume: number) {
  useTrainingSettings.getState().setVolume(volume);
  if (player) {
    try {
      player.volume = Math.max(0, Math.min(1, volume));
    } catch {
      // ignore
    }
  }
}

export function toggleShuffle() {
  const { queue } = usePlayerStore.getState();
  setPlayerState({ queue: setShuffle(queue, !queue.shuffle) });
}

export function cycleRepeat() {
  const { queue } = usePlayerStore.getState();
  setPlayerState({ queue: { ...queue, repeat: nextRepeatMode(queue.repeat) } });
}

/** Keeps queue copies in sync with optimistic edits (favorite, listened). */
export function updateMessage(uuid: string, patch: Partial<TrainingMessage>) {
  usePlayerStore.setState((state) => {
    const message = state.messages[uuid];
    if (!message) return state;
    return { messages: { ...state.messages, [uuid]: { ...message, ...patch } } };
  });
}

/** Hidden or blocked: leaves the queue; if it was playing, the next one takes over. */
export function removeFromQueue(uuids: string[]) {
  const state = usePlayerStore.getState();
  let queue = state.queue;
  const wasCurrent = uuids.includes(loadedId ?? '');
  for (const uuid of uuids) queue = removeId(queue, uuid);
  setPlayerState({ queue });
  if (queue.ids.length === 0) {
    stop();
    return;
  }
  if (wasCurrent) loadCurrent(state.status.playing);
}

/** Closes the player entirely (mini-player disappears). */
export function stop() {
  stopPlayback();
  setPlayerState({ queue: EMPTY_QUEUE, messages: {}, status: IDLE_STATUS, session: IDLE_SESSION });
}

/** Logout: stop and free the native player. */
export function releasePlayer() {
  stop();
  marked.clear();
  try {
    player?.remove();
  } catch {
    // ignore
  }
  player = null;
}

/** Re-applies the audio mode after the "Mezclar / Pausar mi música" setting changes. */
export function refreshAudioMode() {
  void applyAudioMode(useTrainingSettings.getState().mixMode);
}

// ─── Modo entrenamiento ─────────────────────────────────────────────────────

/** Starts a workout. Returns false when the chosen queue is empty. */
export function startSession(allMessages: TrainingMessage[], mode: QueueMode, intervalMinutes: IntervalMinutes): boolean {
  const messages = allMessages.filter((m) => !isProcessing(m));
  const ids = buildQueueIds(messages, mode);
  if (ids.length === 0) return false;
  const byId = Object.fromEntries(messages.map((m) => [m.uuid, m]));
  stopPlayback();
  autoAdvance = intervalMinutes === null;
  setPlayerState({
    messages: byId,
    queue: createQueue(ids, { repeat: 'off', shuffle: false }),
    status: IDLE_STATUS,
    session: {
      active: true,
      clock: startClock(Date.now()),
      schedule: intervalMinutes === null ? null : createSchedule(intervalMinutes),
      started: intervalMinutes === null,
      exhausted: false,
    },
  });
  if (intervalMinutes === null) loadCurrent(true);
  else sessionTick();
  return true;
}

/** Called every ~500 ms by the bridge while a session is active (and on returning to the app). */
export function sessionTick() {
  const { session, status } = usePlayerStore.getState();
  if (!session.active || !session.schedule || session.exhausted || session.clock.pausedAt !== null) return;
  const elapsed = elapsedMs(session.clock, Date.now());
  const result = tickSchedule(session.schedule, elapsed, status.playing || status.buffering);
  if (!result.play) return;
  patchSession({ schedule: result.schedule });
  if (!session.started) {
    patchSession({ started: true });
    loadCurrent(true);
    return;
  }
  const following = next(usePlayerStore.getState().queue);
  if (!following) {
    patchSession({ exhausted: true });
    return;
  }
  setPlayerState({ queue: following });
  loadCurrent(true);
}

export function pauseSession() {
  const { session } = usePlayerStore.getState();
  patchSession({ clock: pauseClock(session.clock, Date.now()) });
  pause();
}

export function resumeSession() {
  const { session, status } = usePlayerStore.getState();
  patchSession({ clock: resumeClock(session.clock, Date.now()) });
  if (!status.ended && status.position > 0 && !status.playing) togglePlay();
}

/** Ends the workout: playback stops and the queue clears. */
export function endSession() {
  autoAdvance = true;
  stop();
}
