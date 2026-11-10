/**
 * The story upload queue as app-wide state (zustand) plus the runner that
 * drains it. It lives outside any screen on purpose: the athlete can pick
 * twenty photos, leave the editor and keep using the app while they go up
 * one by one; coming back shows the same progress. The transitions are the
 * pure reducer in upload-queue.ts — this file only adds the side effects
 * (compress, POST, cancel, tell listeners a file landed).
 *
 * Not persisted: picker files live in the app cache and an interrupted
 * multipart upload cannot be resumed, so a killed app simply starts clean.
 */

import { create } from 'zustand';

import { uploadStoryMedia, type StoryUploadFile } from '@/api/stories';
import { AppError, toAppError } from '@/api/errors';
import { t } from '@/i18n';
import type { MediaLimitDetails, QuotaKind, StoryMedia } from '@/schemas/story';
import { compressImage } from '@/utils/image-compress';
import { jpegFileName, normalizeVideoMime, videoFileName } from '@/utils/media-file';
import { ensureOnline } from '@/utils/network';

import { kindForRole, limitFromError, limitMessage } from './quota';
import { initialUploadQueue, nextUpload, uploadReducer, type NewUpload, type UploadEvent, type UploadItem, type UploadQueueState } from './upload-queue';

export interface LimitHit {
  storyId: string;
  kind: QuotaKind;
  details: MediaLimitDetails;
  /** Changes on every hit so a screen can react to a repeated one. */
  at: number;
}

interface UploadStore {
  queue: UploadQueueState;
  /** The last 422 MEDIA_LIMIT_REACHED — the editor opens the purchase sheet for it. */
  limitHit: LimitHit | null;
  /**
   * Local file of each media item uploaded in this session (uuid → uri).
   * The server returns no URL while it processes a file, so the gallery
   * keeps showing the athlete's own photo instead of an empty square.
   */
  previews: Record<string, string>;
  rememberPreview: (uuid: string, uri: string) => void;
  dispatch: (event: UploadEvent) => void;
  reportLimit: (storyId: string, details: MediaLimitDetails) => void;
  clearLimit: () => void;
}

export const useUploadStore = create<UploadStore>((set) => ({
  queue: initialUploadQueue,
  limitHit: null,
  previews: {},
  rememberPreview: (uuid, uri) => set((state) => ({ previews: { ...state.previews, [uuid]: uri } })),
  dispatch: (event) => set((state) => ({ queue: uploadReducer(state.queue, event) })),
  reportLimit: (storyId, details) => set({ limitHit: { storyId, kind: details.kind, details, at: Date.now() } }),
  clearLimit: () => set({ limitHit: null }),
}));

type SettledListener = (storyId: string, stored: boolean) => void;

const listeners = new Set<SettledListener>();
const controllers = new Map<string, AbortController>();
let draining = false;
let sequence = 0;

/** Called after every finished attempt (stored = the file is now in the story). */
export function onUploadSettled(listener: SettledListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function newUploadId(): string {
  sequence += 1;
  return `up-${Date.now().toString(36)}-${sequence}`;
}

function dispatch(event: UploadEvent) {
  useUploadStore.getState().dispatch(event);
}

function stillThere(id: string): boolean {
  return useUploadStore.getState().queue.items.some((item) => item.id === id);
}

async function describe(item: UploadItem): Promise<StoryUploadFile> {
  if (item.role === 'photo') {
    // Phone cameras produce 8–15 MB files; ≤2000 px JPEG looks the same in the story.
    const compressed = await compressImage(item.localUri, item.width, item.height);
    return { uri: compressed.uri, name: jpegFileName(item.fileName, 'recuerdo'), type: 'image/jpeg' };
  }
  if (item.role === 'video') {
    const type = normalizeVideoMime(item.mimeType, item.fileName);
    return { uri: item.localUri, name: videoFileName(item.fileName, type, 'recuerdo'), type };
  }
  return { uri: item.localUri, name: item.fileName ?? `mensaje-${Date.now()}.m4a`, type: item.mimeType ?? 'audio/mp4' };
}

async function run(item: UploadItem) {
  const controller = new AbortController();
  controllers.set(item.id, controller);
  dispatch({ type: 'PREPARE', id: item.id });

  let created: StoryMedia | null = null;
  let stored = false;
  try {
    await ensureOnline();
    const file = await describe(item);
    if (controller.signal.aborted || !stillThere(item.id)) return;

    dispatch({ type: 'START', id: item.id });
    created = await uploadStoryMedia(item.storyId, file, item.role, {
      signal: controller.signal,
      durationSeconds: item.durationSeconds,
      onProgress: (progress) => dispatch({ type: 'PROGRESS', id: item.id, progress }),
    });
    stored = true;
    if (created) useUploadStore.getState().rememberPreview(created.uuid, item.localUri);
    dispatch({ type: 'SUCCEEDED', id: item.id, mediaUuid: created?.uuid ?? '' });
  } catch (caught) {
    if (controller.signal.aborted || !stillThere(item.id)) return;

    const kind = kindForRole(item.role);
    const limit = limitFromError(caught, kind);
    if (limit) {
      dispatch({ type: 'LIMIT_REACHED', id: item.id, message: limitMessage(limit.kind) });
      useUploadStore.getState().reportLimit(item.storyId, limit);
    } else {
      const error = caught instanceof AppError ? caught : toAppError(caught);
      const message =
        error.code === 'MEDIA_TOO_LARGE'
          ? t('El archivo es demasiado grande. Elige uno más ligero.')
          : error.kind === 'unknown'
            ? t('No pudimos preparar este archivo. Intenta con otro.')
            : error.kind === 'not_found'
              ? t('Todavía no podemos recibir archivos desde la app. Intenta más tarde.')
              : error.message;
      dispatch({ type: 'FAILED', id: item.id, message });
    }
  } finally {
    controllers.delete(item.id);
    listeners.forEach((listener) => listener(item.storyId, stored));
  }
}

/** Starts the next queued file until the queue is empty. Safe to call at any time. */
export function drainUploads(): void {
  if (draining) return;
  draining = true;
  void (async () => {
    try {
      for (;;) {
        const next = nextUpload(useUploadStore.getState().queue);
        if (!next) break;
        await run(next);
      }
    } finally {
      draining = false;
    }
  })();
}

export function enqueueUploads(items: NewUpload[]): void {
  if (items.length === 0) return;
  dispatch({ type: 'ENQUEUE', items });
  drainUploads();
}

export function retryUpload(id: string): void {
  dispatch({ type: 'RETRY', id });
  drainUploads();
}

/** After buying more space: everything the limit had stopped goes up again. */
export function resumeBlockedUploads(storyId: string, kind: QuotaKind): void {
  dispatch({ type: 'RESUME_BLOCKED', storyId, kind });
  drainUploads();
}

export function cancelUpload(id: string): void {
  controllers.get(id)?.abort();
  dispatch({ type: 'CANCEL', id });
}

export function clearFinishedUploads(storyId: string): void {
  dispatch({ type: 'CLEAR_DONE', storyId });
}

/** Session ended: stop everything and forget the previous athlete's files. */
export function resetUploads(): void {
  controllers.forEach((controller) => controller.abort());
  controllers.clear();
  dispatch({ type: 'RESET' });
  useUploadStore.setState({ limitHit: null, previews: {} });
}
