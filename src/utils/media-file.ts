import type { ImagePickerAsset } from 'expo-image-picker';

import { compressImage } from '@/utils/image-compress';

export interface UploadDescriptor {
  uri: string;
  name: string;
  type: string;
}

/**
 * The file name must always agree with the bytes: every picked photo is
 * re-encoded to JPEG by `compressImage`, so its name must end in `.jpg` —
 * never `foto.png` / `IMG_0001.HEIC` labelled `image/jpeg`.
 */
export function jpegFileName(original: string | null | undefined, fallbackBase = 'foto'): string {
  const base = (original ?? '').replace(/\.[^./\\]+$/, '').replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '');
  return `${base || `${fallbackBase}-${Date.now()}`}.jpg`;
}

const VIDEO_EXTENSIONS: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
};

/** iOS records `video/quicktime` (.mov); Android usually `video/mp4`. Name and MIME always match. */
export function videoFileName(original: string | null | undefined, mimeType: string, fallbackBase = 'video'): string {
  const extension = VIDEO_EXTENSIONS[mimeType] ?? 'mp4';
  const base = (original ?? '').replace(/\.[^./\\]+$/, '').replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '');
  return `${base || `${fallbackBase}-${Date.now()}`}.${extension}`;
}

/** Normalizes a picker MIME (`video/mov`, missing, …) to what the backend's content sniffing will see. */
export function normalizeVideoMime(mimeType: string | null | undefined, fileName: string | null | undefined): string {
  const lower = (mimeType ?? '').toLowerCase();
  if (lower === 'video/quicktime' || lower === 'video/mov' || /\.mov$/i.test(fileName ?? '')) return 'video/quicktime';
  if (lower === 'video/webm') return 'video/webm';
  return 'video/mp4';
}

/** Compress (≤2000px, JPEG 80%) and describe a picked photo for multipart upload. */
export async function prepareImageUpload(asset: ImagePickerAsset, fallbackBase = 'foto'): Promise<UploadDescriptor> {
  const compressed = await compressImage(asset.uri, asset.width, asset.height);
  return { uri: compressed.uri, name: jpegFileName(asset.fileName, fallbackBase), type: 'image/jpeg' };
}

export function prepareVideoUpload(asset: ImagePickerAsset, fallbackBase = 'video'): UploadDescriptor {
  const type = normalizeVideoMime(asset.mimeType, asset.fileName);
  return { uri: asset.uri, name: videoFileName(asset.fileName, type, fallbackBase), type };
}
