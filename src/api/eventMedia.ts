import { apiClient } from '@/api/client';
import { toAppError } from '@/api/errors';
import type { AthleteEventMedia, MediaEntitlement } from '@/types/models';

export async function fetchEventMedia(participantId: number): Promise<AthleteEventMedia[]> {
  try {
    const { data } = await apiClient.get<{ data: AthleteEventMedia[] }>(`me/events/${participantId}/media`);
    return data.data;
  } catch (error) {
    throw toAppError(error);
  }
}

/**
 * Limits live on the backend (free tier + any Memory Pack) — the app reads
 * used/limit/remaining, max bytes and allowed MIME types from here instead
 * of hardcoding them. The server still re-checks everything on upload.
 */
export async function fetchMediaEntitlement(participantId: number): Promise<MediaEntitlement> {
  try {
    const { data } = await apiClient.get<{ data: MediaEntitlement }>(`me/events/${participantId}/media-entitlement`);
    return data.data;
  } catch (error) {
    throw toAppError(error);
  }
}

export interface UploadEventMediaFile {
  uri: string;
  name: string;
  type: string;
}

export async function uploadEventMedia(
  participantId: number,
  file: UploadEventMediaFile,
  isPublic: boolean,
  onProgress?: (percent: number) => void,
): Promise<AthleteEventMedia> {
  const form = new FormData();
  // React Native's FormData accepts {uri,name,type} directly — same
  // pattern already used by medal image uploads (src/api/medals.ts).
  form.append('file', file as unknown as Blob);
  form.append('is_public', isPublic ? '1' : '0');

  try {
    const { data } = await apiClient.post<{ data: AthleteEventMedia }>(`me/events/${participantId}/media`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
      onUploadProgress: (event) => {
        if (!onProgress || !event.total) return;
        onProgress(Math.round((event.loaded / event.total) * 100));
      },
    });
    return data.data;
  } catch (error) {
    throw toAppError(error);
  }
}

export async function updateEventMediaVisibility(uuid: string, isPublic: boolean): Promise<AthleteEventMedia> {
  try {
    const { data } = await apiClient.patch<{ data: AthleteEventMedia }>(`me/media/${uuid}`, { is_public: isPublic });
    return data.data;
  } catch (error) {
    throw toAppError(error);
  }
}

export async function deleteEventMedia(uuid: string): Promise<void> {
  try {
    await apiClient.delete(`me/media/${uuid}`);
  } catch (error) {
    throw toAppError(error);
  }
}

/** Persists a new order by media `uuid` — the backend rejects uuids from another participation. */
export async function reorderEventMedia(participantId: number, mediaUuids: string[]): Promise<AthleteEventMedia[]> {
  try {
    const { data } = await apiClient.post<{ data: AthleteEventMedia[] }>(`me/events/${participantId}/media/reorder`, {
      media_uuids: mediaUuids,
    });
    return data.data;
  } catch (error) {
    throw toAppError(error);
  }
}
