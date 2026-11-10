/**
 * Story ("recuerdo") editor API — the athlete builds their memory from the
 * phone: race data + text (`/me/stories/{id}`), media and per-kind quota
 * (`/me/stories/{id}/media`), and the photos bought from event
 * photographers (`/me/purchased-photos`). Every response is parsed with
 * zod (src/schemas/story.ts); a body that does not match throws a `server`
 * AppError so the screen shows an error state, never invented data.
 */

import type { z } from 'zod';

import { apiClient } from '@/api/client';
import { AppError, toAppError } from '@/api/errors';
import {
  editableStorySchema,
  purchasedPhotoSchema,
  storyMediaResponseSchema,
  storyMediaSchema,
  type EditableStory,
  type MediaRole,
  type PurchasedPhotosPage,
  type StoryMedia,
  type StoryMediaPayload,
  type StoryTextField,
  type StoryVisibility,
} from '@/schemas/story';
import { t } from '@/i18n';

export type StoryPatch = Partial<Record<StoryTextField, string | null>> & { visibility?: StoryVisibility };

export interface StoryUploadFile {
  uri: string;
  name: string;
  type: string;
}

function parsed<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new AppError({ kind: 'server', message: t('Respuesta inesperada del servidor.') });
  }
  return result.data;
}

/** Rows that do not match the contract are dropped instead of breaking the whole gallery. */
function parsedList<T>(schema: z.ZodType<T>, rows: unknown): T[] {
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((row) => {
    const result = schema.safeParse(row);
    return result.success ? [result.data] : [];
  });
}

const path = (publicId: string) => `me/stories/${encodeURIComponent(publicId)}`;

/** `GET /me/stories/{publicId}` — the full editable story (owner only). */
export async function getEditableStory(publicId: string): Promise<EditableStory> {
  try {
    const { data } = await apiClient.get<{ data: unknown }>(path(publicId));
    return parsed(editableStorySchema, data.data);
  } catch (error) {
    throw toAppError(error);
  }
}

/** `PATCH /me/stories/{publicId}` — any subset of the editable fields. */
export async function updateStory(publicId: string, patch: StoryPatch): Promise<EditableStory> {
  try {
    const { data } = await apiClient.patch<{ data: unknown }>(path(publicId), patch);
    return parsed(editableStorySchema, data.data);
  } catch (error) {
    throw toAppError(error);
  }
}

/** `GET /me/stories/{publicId}/media` — items in display order + the quota of each kind. */
export async function getStoryMedia(publicId: string): Promise<StoryMediaPayload> {
  try {
    const { data } = await apiClient.get<unknown>(`${path(publicId)}/media`);
    const body = parsed(storyMediaResponseSchema, data);
    const items = parsedList(storyMediaSchema, body.data).sort((a, b) => a.sort_order - b.sort_order);
    return { items, quota: body.meta.quota };
  } catch (error) {
    throw toAppError(error);
  }
}

/**
 * `POST /me/stories/{publicId}/media` (multipart) → the created item
 * (null when the 201 body could not be read — the file IS stored).
 * Rejects with code `MEDIA_LIMIT_REACHED` (details: kind, limit, used,
 * can_expand) when the story is full. `signal` cancels the transfer.
 */
export async function uploadStoryMedia(
  publicId: string,
  file: StoryUploadFile,
  role: MediaRole,
  options: { onProgress?: (percent: number) => void; signal?: AbortSignal; durationSeconds?: number | null } = {},
): Promise<StoryMedia | null> {
  const form = new FormData();
  // React Native's FormData takes {uri, name, type} directly (same as src/api/eventMedia.ts).
  form.append('file', file as unknown as Blob);
  form.append('role', role);
  if (options.durationSeconds) form.append('duration_seconds', String(options.durationSeconds));

  try {
    const { data } = await apiClient.post<{ data: unknown }>(`${path(publicId)}/media`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: role === 'photo' ? 120_000 : 600_000,
      signal: options.signal,
      onUploadProgress: (event) => {
        if (!options.onProgress || !event.total) return;
        options.onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
      },
    });
    // 201 = stored. A body we cannot read must not turn a finished upload into a
    // "failed" one (retrying would duplicate it): the gallery refetch shows the item.
    const item = storyMediaSchema.safeParse(data?.data);
    return item.success ? item.data : null;
  } catch (error) {
    throw toAppError(error);
  }
}

/** `DELETE /me/stories/{publicId}/media/{uuid}` → 204. */
export async function deleteStoryMedia(publicId: string, uuid: string): Promise<void> {
  try {
    await apiClient.delete(`${path(publicId)}/media/${encodeURIComponent(uuid)}`);
  } catch (error) {
    throw toAppError(error);
  }
}

/** `POST /me/stories/{publicId}/media/reorder` `{order: [uuid]}` → 204. */
export async function reorderStoryMedia(publicId: string, order: string[]): Promise<void> {
  try {
    await apiClient.post(`${path(publicId)}/media/reorder`, { order });
  } catch (error) {
    throw toAppError(error);
  }
}

interface PageBody {
  data?: unknown;
  links?: { next?: unknown } | null;
  meta?: { current_page?: unknown; last_page?: unknown } | null;
}

/** `GET /me/purchased-photos?page=` — photos the athlete bought from event photographers. */
export async function getPurchasedPhotos(page: number): Promise<PurchasedPhotosPage> {
  try {
    const { data } = await apiClient.get<PageBody>('me/purchased-photos', { params: { page } });
    if (!data || !Array.isArray(data.data)) {
      throw new AppError({ kind: 'server', message: t('Respuesta inesperada del servidor.') });
    }
    const current = typeof data.meta?.current_page === 'number' ? data.meta.current_page : page;
    const last = typeof data.meta?.last_page === 'number' ? data.meta.last_page : null;
    const hasMore = last !== null ? current < last : typeof data.links?.next === 'string' && data.links.next !== '';
    return { items: parsedList(purchasedPhotoSchema, data.data), page: current, hasMore };
  } catch (error) {
    throw toAppError(error);
  }
}

/** `POST /me/stories/{publicId}/media/import` `{sale_ids}` → the created items (may reject with `MEDIA_LIMIT_REACHED`). */
export async function importPurchasedPhotos(publicId: string, saleIds: (number | string)[]): Promise<StoryMedia[]> {
  try {
    const { data } = await apiClient.post<{ data: unknown }>(`${path(publicId)}/media/import`, { sale_ids: saleIds }, { timeout: 60_000 });
    return parsedList(storyMediaSchema, data.data);
  } catch (error) {
    throw toAppError(error);
  }
}
