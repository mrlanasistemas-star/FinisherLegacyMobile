import { apiClient } from '@/api/client';
import { toAppError } from '@/api/errors';
import type { AthleteEventMedia } from '@/types/models';

/**
 * Real free limits — `config('finisher.event_media')` on the backend,
 * confirmed by reading the config file, not the product brief. Client-side
 * validation only; the server is always the authority and re-checks MIME
 * from real file content, never the extension.
 */
export const EVENT_MEDIA_LIMITS = {
  freeImages: 5,
  freeVideos: 1,
  maxImageBytes: 8 * 1024 * 1024,
  maxVideoBytes: 100 * 1024 * 1024,
  imageMimes: ['image/jpeg', 'image/png', 'image/webp'] as const,
  videoMimes: ['video/mp4', 'video/webm'] as const,
};

export async function fetchEventMedia(participantId: number): Promise<AthleteEventMedia[]> {
  try {
    const { data } = await apiClient.get<{ data: AthleteEventMedia[] }>(`me/events/${participantId}/media`);
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

// NOTE: `POST /me/events/{participant}/media/reorder` deliberately has no
// client here. It requires an internal integer `media_ids[]` (the row's
// primary key), but `AthleteEventMediaResource` — the only way the client
// ever sees a media item — exposes `uuid` only, never that integer id.
// There is no legitimate way for the app to construct a valid request.
// See docs/MOBILE_BACKEND_REQUIREMENTS.md — one-field backend fix needed
// (`'id' => $this->id` in the Resource) before drag-to-reorder can be real.
