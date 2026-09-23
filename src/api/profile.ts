import { apiClient } from '@/api/client';
import { toAppError } from '@/api/errors';
import type { ApiSuccessEnvelope } from '@/types/api';
import type { AthleteProfile, MyProfileResponse, Visibility } from '@/types/models';

export interface UploadFile {
  uri: string;
  name: string;
  type: string;
}

export interface UpdateProfilePayload {
  username: string;
  bio?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  main_sport_id?: number | null;
  profile_visibility: Visibility;
  profile_photo?: UploadFile | null;
  cover_photo?: UploadFile | null;
  remove_profile_photo?: boolean;
  remove_cover_photo?: boolean;
}

/** `GET /profile` — identity (Legacy ID), public profile, stats and social counts in one call. */
export async function fetchProfile(): Promise<MyProfileResponse> {
  try {
    const { data } = await apiClient.get<ApiSuccessEnvelope<MyProfileResponse>>('profile');
    return data.data;
  } catch (error) {
    throw toAppError(error);
  }
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<AthleteProfile> {
  const form = new FormData();
  form.append('username', payload.username);
  form.append('profile_visibility', payload.profile_visibility);
  // Always sent (empty string → null server-side), so clearing a field
  // actually clears it instead of silently keeping the old value.
  form.append('bio', payload.bio ?? '');
  form.append('city', payload.city ?? '');
  form.append('state', payload.state ?? '');
  form.append('country', payload.country ?? '');
  if (payload.main_sport_id) form.append('main_sport_id', String(payload.main_sport_id));
  if (payload.profile_photo) {
    form.append('profile_photo', payload.profile_photo as unknown as Blob);
  } else if (payload.remove_profile_photo) {
    form.append('remove_profile_photo', '1');
  }
  if (payload.cover_photo) {
    form.append('cover_photo', payload.cover_photo as unknown as Blob);
  } else if (payload.remove_cover_photo) {
    form.append('remove_cover_photo', '1');
  }
  // Laravel doesn't parse PATCH multipart bodies — the documented workaround
  // is a POST with a spoofed method field.
  form.append('_method', 'PATCH');

  try {
    const { data } = await apiClient.post<ApiSuccessEnvelope<AthleteProfile>>('profile', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
    return data.data;
  } catch (error) {
    throw toAppError(error);
  }
}
