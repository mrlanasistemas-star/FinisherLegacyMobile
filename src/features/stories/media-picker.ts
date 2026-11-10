/**
 * Picking photos / a video from the phone for a story and handing them to
 * the upload queue. Uses the system picker (no storage permission on
 * Android 13+ or iOS 14+). The quota decides how many can be chosen: the
 * places left minus what is already uploading. A video longer than the
 * backend's `max_seconds` is refused here with a clear message instead of
 * being uploaded and rejected.
 */

import * as ImagePicker from 'expo-image-picker';

import { t } from '@/i18n';
import type { MediaQuota, QuotaKind } from '@/schemas/story';

import { admit, durationProblem, slotsLeft } from './quota';
import { pendingCount, type NewUpload } from './upload-queue';
import { enqueueUploads, newUploadId, useUploadStore } from './upload-store';

/** The system picker gets slow past a few dozen items; more can be added in a second pass. */
const MAX_PER_PICK = 30;

export type PickOutcome =
  | { status: 'cancelled' }
  | { status: 'queued'; kind: QuotaKind; count: number; rejected: number }
  /** Nothing fits: the caller offers more space (or just the limit message). */
  | { status: 'limit'; kind: QuotaKind }
  | { status: 'error'; message: string };

function pending(storyId: string, kind: QuotaKind): number {
  return pendingCount(useUploadStore.getState().queue, storyId, kind);
}

function toUpload(storyId: string, role: 'photo' | 'video', asset: ImagePicker.ImagePickerAsset): NewUpload {
  return {
    id: newUploadId(),
    storyId,
    role,
    localUri: asset.uri,
    fileName: asset.fileName ?? null,
    mimeType: asset.mimeType ?? null,
    width: asset.width ?? 0,
    height: asset.height ?? 0,
    durationSeconds: role === 'video' && asset.duration && asset.duration > 0 ? Math.round(asset.duration / 1000) : null,
  };
}

export async function pickPhotos(storyId: string, quota: MediaQuota): Promise<PickOutcome> {
  const free = slotsLeft(quota, 'photos', pending(storyId, 'photos'));
  if (free <= 0) return { status: 'limit', kind: 'photos' };

  let result: ImagePicker.ImagePickerResult;
  try {
    result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: Math.min(free, MAX_PER_PICK),
      orderedSelection: true,
      quality: 1,
      exif: false,
    });
  } catch {
    return { status: 'error', message: t('No pudimos abrir tus fotos. Intenta de nuevo.') };
  }
  if (result.canceled || result.assets.length === 0) return { status: 'cancelled' };

  // Some Android pickers ignore the selection limit: admit only what fits now.
  const { accepted, rejected } = admit(quota, 'photos', result.assets.length, pending(storyId, 'photos'));
  if (accepted === 0) return { status: 'limit', kind: 'photos' };
  enqueueUploads(result.assets.slice(0, accepted).map((asset) => toUpload(storyId, 'photo', asset)));
  return { status: 'queued', kind: 'photos', count: accepted, rejected };
}

export async function pickVideo(storyId: string, quota: MediaQuota): Promise<PickOutcome> {
  if (slotsLeft(quota, 'videos', pending(storyId, 'videos')) <= 0) return { status: 'limit', kind: 'videos' };
  const maxSeconds = quota.videos.max_seconds;

  let result: ImagePicker.ImagePickerResult;
  try {
    result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsMultipleSelection: false,
      // Only honoured by some pickers; the real check is below.
      videoMaxDuration: maxSeconds ?? 0,
      quality: 1,
    });
  } catch {
    return { status: 'error', message: t('No pudimos abrir tus videos. Intenta de nuevo.') };
  }
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return { status: 'cancelled' };

  const problem = durationProblem(asset.duration, maxSeconds, 'videos');
  if (problem) return { status: 'error', message: problem };

  enqueueUploads([toUpload(storyId, 'video', asset)]);
  return { status: 'queued', kind: 'videos', count: 1, rejected: 0 };
}
