import { Platform } from 'react-native';

import { t } from '@/i18n';
import { isProcessing, type TrainingMessage } from '@/schemas/training';
import { haptics } from '@/utils/haptics';

import {
  applyAudioMode,
  createKeepAlivePlayer,
  createPlayer,
  releaseOtherAppsAudio,
  type AudioPlayer,
  type AudioStatus,
} from './audio-driver';
import { desiredPhase, lockScreenControlsAvailable, type AudioPhase, type Os } from './audio-session';
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
  hasNext,
  next,
  previous,
  removeId,
  setShuffle,
  type QueueMode,
} from './queue';
import { classifyRemoteChange, type RemoteIntent, type StatusSample } from './remote-commands';
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
import { createRetryGate } from './url-refresh';

/**
 * Imperative engine of the Entrenamientos player — one long-lived native
 * player for the whole app (the mini-player, the full player and "Modo
 * entrenamiento" all drive it). Owns: loading a message (local file first,
 * then the signed URL, re-resolved once if it expired), speed with pitch
 * correction, volume, lock-screen "now playing" (with ±10 s mapped to
 * next / previous message), auto-advance with repeat/shuffle (pure rules in
 * `queue.ts`), the auto "listened" mark at 80 %, timed display of text-only
 * messages, the interval scheduler of a workout session, and the workout
 * audio-session phases (keep-alive between messages — see
 * `audio-session.ts`).
 *
 * Every native session change (audio mode, keep-alive play/pause, message
 * start) runs through ONE promise chain so they never interleave.
 */

const OS = Platform.OS as Os;

let player: AudioPlayer | null = null;
let keepAlive: AudioPlayer | null = null;
let textTimer: ReturnType<typeof setInterval> | null = null;
let textLast = 0;
/** False in interval sessions: the scheduler decides when the next message starts. */
let autoAdvance = true;
/** uuid currently loaded in the player (guards stale status events). */
let loadedId: string | null = null;
const marked = new Set<string>();
let listenedHandler: ((uuid: string) => void) | null = null;
let urlResolver: ((uuid: string) => Promise<string | null>) | null = null;

/** JS asked the message player to play (vs. the athlete pausing it). */
let intendPlaying = false;
/** A message start is in flight: until this epoch ms the phase stays `message`. */
let startingUntil = 0;
const STARTING_GRACE_MS = 5000;
/** Status samples within this window after a JS action are never read as remote commands. */
let lastJsAction = 0;
const JS_WINDOW_MS = 1200;
let lastSample: StatusSample | null = null;
let messageOnLockScreen = false;
let keepAliveOnLockScreen = false;
let keepAliveWasPlaying = false;
let recoveringId: string | null = null;
const retryGate = createRetryGate();

let requestedPhase: AudioPhase = 'off';
let appliedPhase: AudioPhase = 'off';
let chain: Promise<void> = Promise.resolve();

/** True while the keep-alive holds an active (mixable) iOS session that nobody released yet. */
let keepAliveHoldsSession = false;

function enqueue(task: () => Promise<void> | void, onError?: () => void): void {
  chain = chain.then(task).catch(() => onError?.());
}

/**
 * iOS: deactivate (notifying other apps) so ducked music comes back and
 * paused music resumes. A deactivation that races a player already playing
 * is refused by iOS (`isBusy`), so it can never cut audio.
 */
async function releaseSession() {
  markJs();
  await releaseOtherAppsAudio();
  keepAliveHoldsSession = false;
}

function markJs() {
  lastJsAction = Date.now();
  lastSample = null;
}

function fromJs(): boolean {
  return Date.now() - lastJsAction < JS_WINDOW_MS;
}

/** The bridge registers the API call + cache update for the "listened" mark. */
export function registerListenedHandler(handler: ((uuid: string) => void) | null) {
  listenedHandler = handler;
}

/** The bridge registers how to get a fresh signed URL (refetch the inbox) after a playback error. */
export function registerUrlResolver(resolver: ((uuid: string) => Promise<string | null>) | null) {
  urlResolver = resolver;
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

function ensureKeepAlive(): AudioPlayer | null {
  if (keepAlive) return keepAlive;
  keepAlive = createKeepAlivePlayer();
  keepAlive?.addListener('playbackStatusUpdate', onKeepAliveStatus);
  return keepAlive;
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

// ─── Remote commands (lock screen, headset, interruptions) ──────────────────

function pauseSessionClock() {
  const { session } = usePlayerStore.getState();
  if (session.active && session.clock.pausedAt === null) patchSession({ clock: pauseClock(session.clock, Date.now()) });
}

function resumeSessionClock() {
  const { session } = usePlayerStore.getState();
  if (session.active && session.clock.pausedAt !== null) patchSession({ clock: resumeClock(session.clock, Date.now()) });
}

/** Returns true when the intent replaced the normal handling of this status. */
function handleRemoteIntent(intent: RemoteIntent | null, before: StatusSample): boolean {
  if (!intent) return false;
  const state = usePlayerStore.getState();
  // The athlete pausing from the lock screen / unplugging headphones / taking a call pauses the workout.
  if (intent === 'pause') {
    intendPlaying = false;
    pauseSessionClock();
    return false;
  }
  if (intent === 'play') {
    intendPlaying = true;
    resumeSessionClock();
    return false;
  }
  // ±10 s → next / previous message, only from the lock screen and only with somewhere to go.
  if (!messageOnLockScreen || state.queue.ids.length < 2) return false;
  if (intent === 'next') {
    if (!hasNext(state.queue)) return false;
    nextTrack();
    return true;
  }
  const result = previous(state.queue, before.position);
  if (result.restart) {
    seekTo(0);
    return false;
  }
  setPlayerState({ queue: result.state });
  loadCurrent(true);
  return true;
}

// ─── Status ─────────────────────────────────────────────────────────────────

function onStatus(status: AudioStatus) {
  const message = getCurrentMessage();
  if (!message || message.uuid !== loadedId || !hasAudio(message)) return;
  if (recoveringId === message.uuid) return;
  if (status.error && tryRecoverUrl(message)) return;

  if (status.playing || status.error) startingUntil = 0;
  if (status.playing && !status.error) retryGate.succeeded(message.uuid);

  const duration = status.duration > 0 ? status.duration : message.duration_seconds;
  const sample: StatusSample = { position: status.currentTime, playing: status.playing, buffering: status.isBuffering, at: Date.now() };
  const before = lastSample;
  const intent = fromJs()
    ? null
    : classifyRemoteChange(before, { ...sample, finished: status.didJustFinish, duration }, useTrainingSettings.getState().rate);
  lastSample = sample;

  patchStatus({
    playing: status.playing,
    position: status.currentTime,
    duration,
    buffering: status.isBuffering && !status.playing,
    error: status.error ?? null,
    ended: status.didJustFinish ? true : status.playing ? false : usePlayerStore.getState().status.ended,
  });
  if (reachedListenedMark(status.currentTime, duration, status.didJustFinish)) markListened(message);
  if (before && handleRemoteIntent(intent, before)) return;
  if (status.didJustFinish) handleEnded();
}

/** The keep-alive's 1 s updates are the workout heartbeat; its notification (Android) can pause the workout. */
function onKeepAliveStatus(status: AudioStatus) {
  const wasPlaying = keepAliveWasPlaying;
  keepAliveWasPlaying = status.playing;
  if (!fromJs()) {
    if (wasPlaying && !status.playing && appliedPhase === 'keepAlive') pauseSessionClock();
    else if (!wasPlaying && status.playing && appliedPhase === 'paused') resumeSessionClock();
  }
  heartbeat();
}

/** Driven by native events, so it also runs where RN timers are paused (Android with the screen off). */
function heartbeat() {
  if (textTimer) textTick();
  sessionTick();
}

// ─── Text-only messages ─────────────────────────────────────────────────────

function stopTextTimer() {
  if (textTimer) clearInterval(textTimer);
  textTimer = null;
}

function textTick() {
  const now = Date.now();
  const { status } = usePlayerStore.getState();
  const message = getCurrentMessage();
  const rate = useTrainingSettings.getState().rate;
  const position = Math.min(status.duration, status.position + ((now - textLast) / 1000) * rate);
  textLast = now;
  patchStatus({ position, playing: true });
  if (message && reachedListenedMark(position, status.duration, position >= status.duration)) markListened(message);
  if (position >= status.duration) {
    stopTextTimer();
    patchStatus({ playing: false, ended: true });
    handleEnded();
  }
}

/** Text-only messages "play" for their reading time so the scrubber and the queue behave the same. */
function runTextTimer() {
  stopTextTimer();
  textLast = Date.now();
  textTimer = setInterval(textTick, 250);
}

// ─── Native playback ────────────────────────────────────────────────────────

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

function clearMessageLockScreen() {
  if (!messageOnLockScreen) return;
  messageOnLockScreen = false;
  try {
    player?.clearLockScreenControls();
  } catch {
    // ignore
  }
}

/** iOS: only with "Pausar mi música" (Now Playing needs a non-mixable session). Android: always. */
function showOnLockScreen(p: AudioPlayer, message: TrainingMessage) {
  if (!lockScreenControlsAvailable(OS, useTrainingSettings.getState().mixMode)) {
    clearMessageLockScreen();
    return;
  }
  try {
    p.setActiveForLockScreen(
      true,
      {
        title: message.relationship ? `${message.sender_name} · ${message.relationship}` : message.sender_name,
        artist: t('Finisher Legacy · Entrenamientos'),
        albumTitle: message.link?.title ?? t('Envíame ánimo'),
      },
      { showSeekForward: true, showSeekBackward: true },
    );
    messageOnLockScreen = true;
    keepAliveOnLockScreen = false;
  } catch {
    // Lock-screen controls are a bonus; never block playback on them.
  }
}

function pauseKeepAlive() {
  if (!keepAlive) return;
  markJs();
  try {
    keepAlive.pause();
  } catch {
    // ignore
  }
  keepAliveWasPlaying = false;
}

/** Android: the keep-alive owns the media notification so the foreground service stays up between messages. */
function showKeepAliveOnLockScreen(label: string) {
  if (OS !== 'android' || !keepAlive) return;
  try {
    keepAlive.setActiveForLockScreen(true, { title: t('Modo entrenamiento'), artist: label, albumTitle: 'Finisher Legacy' }, {});
    keepAliveOnLockScreen = true;
    messageOnLockScreen = false;
  } catch {
    // ignore
  }
}

function clearKeepAliveLockScreen() {
  if (!keepAliveOnLockScreen) return;
  keepAliveOnLockScreen = false;
  try {
    keepAlive?.clearLockScreenControls();
  } catch {
    // ignore
  }
}

/**
 * Plays the loaded message once the session is configured for it: the
 * keep-alive pauses, the athlete's mix mode is applied, then `play()`.
 *
 * "Mezclar": iOS only ducks other audio when the session is ACTIVATED with
 * `duckOthers`, so the keep-alive's mixable session is released first and
 * `play()` re-activates it (a mixable activation is allowed in background).
 * "Pausar": the category is switched on the session the keep-alive holds
 * (a fresh non-mixable activation from the background is refused by iOS);
 * if iOS still refuses, the message falls back to ducking.
 */
function startNative(p: AudioPlayer, uuid: string, seekToSeconds?: number) {
  intendPlaying = true;
  startingUntil = Date.now() + STARTING_GRACE_MS;
  enqueue(
    async () => {
      if (loadedId !== uuid || !intendPlaying) return;
      pauseKeepAlive();
      const { mixMode } = useTrainingSettings.getState();
      if (keepAliveHoldsSession && mixMode === 'mix') await releaseSession();
      await applyAudioMode(mixMode);
      if (loadedId !== uuid || !intendPlaying) return;
      markJs();
      try {
        if (seekToSeconds !== undefined) await p.seekTo(seekToSeconds);
        p.play();
      } catch {
        if (mixMode !== 'pause') throw new Error('play');
        await applyAudioMode('mix');
        markJs();
        p.play();
      }
    },
    // A rejected play surfaces as an error instead of a spinner.
    () => {
      startingUntil = 0;
      patchStatus({ playing: false, buffering: false, error: 'load' });
    },
  );
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
  recoveringId = null;

  if (!hasAudio(message)) {
    intendPlaying = false;
    markJs();
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
  const uri = localAudioUri(message.uuid) ?? message.audio_url;
  try {
    markJs();
    p.replace({ uri: uri ?? undefined, name: message.sender_name });
    applyRateAndVolume(p);
    if (play) {
      startNative(p, message.uuid);
      haptics.light();
    } else {
      intendPlaying = false;
    }
    showOnLockScreen(p, message);
  } catch {
    patchStatus({ playing: false, buffering: false, error: 'load' });
  }
}

/**
 * Expired signed URL (or any streaming error): ask the bridge for a fresh
 * URL and retry once, resuming where it failed. Returns false when there is
 * nothing to retry (local file, no resolver, already retried).
 */
function tryRecoverUrl(message: TrainingMessage): boolean {
  const resolve = urlResolver;
  if (!resolve || localAudioUri(message.uuid) || !retryGate.tryAcquire(message.uuid)) return false;
  const uuid = message.uuid;
  const resumeAt = usePlayerStore.getState().status.position;
  const wantPlay = intendPlaying;
  recoveringId = uuid;
  patchStatus({ buffering: wantPlay, error: null });
  void resolve(uuid)
    .catch(() => null)
    .then((url) => {
      if (loadedId !== uuid || recoveringId !== uuid) return;
      recoveringId = null;
      const p = player;
      if (!url || !p) {
        patchStatus({ playing: false, buffering: false, error: 'expired' });
        return;
      }
      updateMessage(uuid, { audio_url: url });
      const fresh = getCurrentMessage() ?? message;
      try {
        markJs();
        p.replace({ uri: url, name: fresh.sender_name });
        applyRateAndVolume(p);
        if (wantPlay) startNative(p, uuid, resumeAt > 0 ? resumeAt : undefined);
        showOnLockScreen(p, fresh);
      } catch {
        patchStatus({ playing: false, buffering: false, error: 'load' });
      }
    });
  return true;
}

function handleEnded() {
  const state = usePlayerStore.getState();
  if (!autoAdvance) {
    intendPlaying = false;
    patchStatus({ playing: false, ended: true });
    return;
  }
  const following = next(state.queue, { auto: true });
  if (!following) {
    intendPlaying = false;
    patchStatus({ playing: false, ended: true });
    return;
  }
  if (following === state.queue) {
    // Repeat one.
    const message = getCurrentMessage();
    if (message && !hasAudio(message)) {
      patchStatus({ position: 0, ended: false });
      runTextTimer();
    } else if (player && message) {
      startNative(player, message.uuid, 0);
    }
    return;
  }
  setPlayerState({ queue: following });
  loadCurrent(true);
}

function stopPlayback() {
  stopTextTimer();
  intendPlaying = false;
  startingUntil = 0;
  recoveringId = null;
  markJs();
  try {
    player?.pause();
  } catch {
    // ignore
  }
  clearMessageLockScreen();
  loadedId = null;
}

// ─── Workout audio-session phases ───────────────────────────────────────────

function computePhase(): AudioPhase {
  const state = usePlayerStore.getState();
  const { session, status, queue } = state;
  const message = getCurrentMessage();
  const audioMessageActive =
    !!message && hasAudio(message) && (status.playing || status.buffering || recoveringId === message.uuid || Date.now() < startingUntil);
  return desiredPhase({
    sessionActive: session.active,
    paused: session.clock.pausedAt !== null,
    exhausted: session.exhausted,
    queueFinished: session.schedule === null && status.ended && !hasNext(queue),
    audioMessageActive,
    audioAvailable: !state.audioUnavailable,
  });
}

async function transition(target: AudioPhase) {
  if (requestedPhase !== target) return; // superseded before it ran
  const from = appliedPhase;
  if (from === target) return;

  if (target === 'message') {
    pauseKeepAlive();
    if (OS === 'ios') clearKeepAliveLockScreen();
    appliedPhase = target;
    return;
  }

  if (target === 'keepAlive') {
    const ka = ensureKeepAlive();
    if (!ka) return;
    const messageBusy = !!player?.playing || Date.now() < startingUntil;
    if (from === 'message' && !messageBusy) {
      // Give the athlete's music back (unduck / resume) before the silent loop takes the session.
      await releaseSession();
      // The mixable keep-alive can't own Now Playing on iOS; the music app takes it back.
      if (OS === 'ios') clearMessageLockScreen();
    }
    if (requestedPhase !== target) return;
    await applyAudioMode('keepAlive');
    if (requestedPhase !== target) return;
    markJs();
    ka.play();
    keepAliveWasPlaying = true;
    keepAliveHoldsSession = true;
    showKeepAliveOnLockScreen(t('Sesión activa'));
    appliedPhase = target;
    return;
  }

  // paused / off: nothing silent keeps playing (App Store 2.5.4).
  const keepAliveWasOn = keepAliveHoldsSession || keepAliveWasPlaying || from === 'keepAlive';
  pauseKeepAlive();
  if (keepAliveWasOn) await releaseSession();
  if (target === 'paused') {
    // Android: the notification stays so the workout can be resumed from it.
    if (keepAliveOnLockScreen) showKeepAliveOnLockScreen(t('En pausa'));
  } else {
    clearKeepAliveLockScreen();
  }
  appliedPhase = target;
}

function syncPhase() {
  const target = computePhase();
  if (target === requestedPhase) return;
  requestedPhase = target;
  setPlayerState({ audioPhase: target });
  enqueue(() => transition(target));
}

usePlayerStore.subscribe((state, prev) => {
  // Only playback/session changes matter (and never our own audioPhase write).
  if (state.status === prev.status && state.session === prev.session && state.queue === prev.queue) return;
  syncPhase();
});

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
  if (loadedId !== message.uuid || (!status.playing && status.error && status.error !== 'unavailable')) {
    // A manual retry after an error reloads the source and re-arms the one automatic URL refresh.
    retryGate.succeeded(message.uuid);
    loadCurrent(true);
    return;
  }
  try {
    if (status.playing) {
      intendPlaying = false;
      markJs();
      p.pause();
    } else if (status.ended) {
      patchStatus({ ended: false });
      startNative(p, message.uuid, 0);
    } else {
      startNative(p, message.uuid);
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
    markJs();
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

/** Keeps queue copies in sync with optimistic edits (favorite, listened, refreshed audio URL). */
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

/** Logout: stop and free the native players. */
export function releasePlayer() {
  stop();
  marked.clear();
  retryGate.reset();
  const ka = keepAlive;
  keepAlive = null;
  enqueue(() => {
    try {
      ka?.clearLockScreenControls();
      ka?.remove();
    } catch {
      // ignore
    }
  });
  keepAliveOnLockScreen = false;
  try {
    player?.remove();
  } catch {
    // ignore
  }
  player = null;
}

/**
 * "Mezclar / Pausar mi música" changed: a message playing right now
 * switches at once (and gains / loses the iPhone lock-screen controls);
 * otherwise the next message picks it up — the keep-alive always stays
 * mixable.
 */
export function refreshAudioMode() {
  const { status } = usePlayerStore.getState();
  const message = getCurrentMessage();
  if (!player || !message || !hasAudio(message) || loadedId !== message.uuid || !status.playing) return;
  const p = player;
  enqueue(async () => {
    await applyAudioMode(useTrainingSettings.getState().mixMode);
    showOnLockScreen(p, message);
  });
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

/**
 * Called every ~500 ms by the bridge while a session is active, on
 * returning to the app, and every second by the keep-alive heartbeat (the
 * only one that runs with the screen locked on Android).
 */
export function sessionTick() {
  syncPhase();
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

/** Ends the workout: playback stops, the keep-alive stops and the queue clears. */
export function endSession() {
  autoAdvance = true;
  stop();
}
