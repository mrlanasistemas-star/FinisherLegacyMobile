/**
 * Pure state machine of the story upload queue (no React, no network —
 * unit tested in upload-queue.test.ts). One item per picked file:
 *
 *   queued → preparing → uploading → done
 *                 │           ├──→ failed   (retry → queued)
 *                 │           └──→ blocked  (story full: 422 MEDIA_LIMIT_REACHED)
 *                 └──────────────→ cancelled (removed)
 *
 * A limit error blocks the item AND everything still queued for the same
 * story + kind (they would fail the same way); buying more space resumes
 * them. Files upload one at a time, in the order they were picked, so the
 * gallery order matches the selection.
 */

import type { MediaRole, QuotaKind } from '@/schemas/story';

import { kindForRole } from './quota';

export type UploadStatus = 'queued' | 'preparing' | 'uploading' | 'done' | 'failed' | 'blocked';

export interface UploadItem {
  id: string;
  storyId: string;
  role: MediaRole;
  /** Local file as picked — shown as the optimistic thumbnail. */
  localUri: string;
  fileName: string | null;
  mimeType: string | null;
  width: number;
  height: number;
  /** Length of a video / audio as the picker reported it (sent along: the backend cannot always probe it). */
  durationSeconds: number | null;
  status: UploadStatus;
  /** 0–100 while uploading. */
  progress: number;
  /** Human message of the last failure. */
  error: string | null;
  attempts: number;
  /** uuid of the created media once done. */
  mediaUuid: string | null;
}

export type NewUpload = Pick<UploadItem, 'id' | 'storyId' | 'role' | 'localUri' | 'fileName' | 'mimeType' | 'width' | 'height' | 'durationSeconds'>;

export interface UploadQueueState {
  items: UploadItem[];
}

export type UploadEvent =
  | { type: 'ENQUEUE'; items: NewUpload[] }
  | { type: 'PREPARE'; id: string }
  | { type: 'START'; id: string }
  | { type: 'PROGRESS'; id: string; progress: number }
  | { type: 'SUCCEEDED'; id: string; mediaUuid: string }
  | { type: 'FAILED'; id: string; message: string }
  | { type: 'LIMIT_REACHED'; id: string; message: string }
  | { type: 'RETRY'; id: string }
  | { type: 'RESUME_BLOCKED'; storyId: string; kind: QuotaKind }
  | { type: 'CANCEL'; id: string }
  | { type: 'CLEAR_DONE'; storyId: string }
  | { type: 'RESET' };

export const initialUploadQueue: UploadQueueState = { items: [] };

const ACTIVE: UploadStatus[] = ['preparing', 'uploading'];

function patch(state: UploadQueueState, id: string, change: (item: UploadItem) => UploadItem): UploadQueueState {
  let touched = false;
  const items = state.items.map((item) => {
    if (item.id !== id) return item;
    const next = change(item);
    if (next !== item) touched = true;
    return next;
  });
  return touched ? { items } : state;
}

export function uploadReducer(state: UploadQueueState, event: UploadEvent): UploadQueueState {
  switch (event.type) {
    case 'ENQUEUE': {
      const known = new Set(state.items.map((item) => item.id));
      const fresh = event.items
        .filter((item) => !known.has(item.id))
        .map<UploadItem>((item) => ({ ...item, status: 'queued', progress: 0, error: null, attempts: 0, mediaUuid: null }));
      return fresh.length > 0 ? { items: [...state.items, ...fresh] } : state;
    }
    case 'PREPARE':
      return patch(state, event.id, (item) => (item.status === 'queued' ? { ...item, status: 'preparing', progress: 0, error: null, attempts: item.attempts + 1 } : item));
    case 'START':
      return patch(state, event.id, (item) => (item.status === 'preparing' ? { ...item, status: 'uploading' } : item));
    case 'PROGRESS':
      return patch(state, event.id, (item) => {
        if (item.status !== 'uploading') return item;
        // Progress never goes backwards and never claims 100 before the server answered.
        const progress = Math.max(item.progress, Math.min(99, Math.max(0, Math.round(event.progress))));
        return progress === item.progress ? item : { ...item, progress };
      });
    case 'SUCCEEDED':
      return patch(state, event.id, (item) => (ACTIVE.includes(item.status) ? { ...item, status: 'done', progress: 100, error: null, mediaUuid: event.mediaUuid } : item));
    case 'FAILED':
      return patch(state, event.id, (item) => (ACTIVE.includes(item.status) ? { ...item, status: 'failed', progress: 0, error: event.message } : item));
    case 'LIMIT_REACHED': {
      const hit = state.items.find((item) => item.id === event.id);
      if (!hit || !ACTIVE.includes(hit.status)) return state;
      const kind = kindForRole(hit.role);
      return {
        items: state.items.map((item) => {
          const sameBucket = item.storyId === hit.storyId && kindForRole(item.role) === kind;
          if (item.id === hit.id || (sameBucket && item.status === 'queued')) {
            return { ...item, status: 'blocked', progress: 0, error: event.message };
          }
          return item;
        }),
      };
    }
    case 'RETRY':
      return patch(state, event.id, (item) => (item.status === 'failed' || item.status === 'blocked' ? { ...item, status: 'queued', progress: 0, error: null } : item));
    case 'RESUME_BLOCKED': {
      let touched = false;
      const items = state.items.map((item) => {
        if (item.status !== 'blocked' || item.storyId !== event.storyId || kindForRole(item.role) !== event.kind) return item;
        touched = true;
        return { ...item, status: 'queued' as const, progress: 0, error: null };
      });
      return touched ? { items } : state;
    }
    case 'CANCEL': {
      const target = state.items.find((item) => item.id === event.id);
      // A finished upload is a real media item now: it is removed from the gallery, not from the queue.
      if (!target || target.status === 'done') return state;
      return { items: state.items.filter((item) => item.id !== event.id) };
    }
    case 'CLEAR_DONE': {
      const items = state.items.filter((item) => !(item.storyId === event.storyId && item.status === 'done'));
      return items.length === state.items.length ? state : { items };
    }
    case 'RESET':
      return state.items.length === 0 ? state : initialUploadQueue;
  }
}

/** The item being prepared / uploaded right now (at most one). */
export function activeUpload(state: UploadQueueState): UploadItem | null {
  return state.items.find((item) => ACTIVE.includes(item.status)) ?? null;
}

/** The next item to start, or null while one is in flight / nothing waits. */
export function nextUpload(state: UploadQueueState): UploadItem | null {
  if (activeUpload(state)) return null;
  return state.items.find((item) => item.status === 'queued') ?? null;
}

export function uploadsForStory(state: UploadQueueState, storyId: string): UploadItem[] {
  return state.items.filter((item) => item.storyId === storyId);
}

/** Items that still take a place in the quota (not yet counted by the server as used). */
export function pendingCount(state: UploadQueueState, storyId: string, kind: QuotaKind): number {
  return state.items.filter(
    (item) => item.storyId === storyId && kindForRole(item.role) === kind && (item.status === 'queued' || item.status === 'preparing' || item.status === 'uploading'),
  ).length;
}

export interface QueueSummary {
  total: number;
  waiting: number;
  failed: number;
  blocked: number;
  done: number;
  /** 0–100 across every item of the story still in the queue. */
  progress: number;
  busy: boolean;
}

export function summarize(items: UploadItem[]): QueueSummary {
  const summary: QueueSummary = { total: items.length, waiting: 0, failed: 0, blocked: 0, done: 0, progress: 0, busy: false };
  let sum = 0;
  for (const item of items) {
    if (item.status === 'failed') summary.failed += 1;
    else if (item.status === 'blocked') summary.blocked += 1;
    else if (item.status === 'done') summary.done += 1;
    else summary.waiting += 1;
    sum += item.status === 'done' ? 100 : item.progress;
  }
  summary.progress = items.length > 0 ? Math.round(sum / items.length) : 0;
  summary.busy = summary.waiting > 0;
  return summary;
}
