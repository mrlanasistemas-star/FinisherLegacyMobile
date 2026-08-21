import { apiClient } from '@/api/client';
import { toAppError } from '@/api/errors';
import type { ApiSuccessEnvelope } from '@/types/api';
import type { AthleteProfile, Visibility } from '@/types/models';

export interface UpdateProfilePayload {
  username: string;
  bio?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  main_sport_id?: number | null;
  profile_visibility: Visibility;
  profile_photo?: { uri: string; name: string; type: string } | null;
  cover_photo?: { uri: string; name: string; type: string } | null;
}

export async function fetchProfile(): Promise<AthleteProfile | null> {
  try {
    const { data } = await apiClient.get<ApiSuccessEnvelope<AthleteProfile | null>>('profile');
    return data.data;
  } catch (error) {
    throw toAppError(error);
  }
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<AthleteProfile> {
  const form = new FormData();
  form.append('username', payload.username);
  form.append('profile_visibility', payload.profile_visibility);
  if (payload.bio) form.append('bio', payload.bio);
  if (payload.city) form.append('city', payload.city);
  if (payload.state) form.append('state', payload.state);
  if (payload.country) form.append('country', payload.country);
  if (payload.main_sport_id) form.append('main_sport_id', String(payload.main_sport_id));
  if (payload.profile_photo) {
    // @ts-expect-error React Native's FormData accepts { uri, name, type }.
    form.append('profile_photo', payload.profile_photo);
  }
  if (payload.cover_photo) {
    // @ts-expect-error React Native's FormData accepts { uri, name, type }.
    form.append('cover_photo', payload.cover_photo);
  }
  // Laravel doesn't parse PATCH multipart bodies — the documented workaround
  // is a POST with a spoofed method field.
  form.append('_method', 'PATCH');

  try {
    const { data } = await apiClient.post<ApiSuccessEnvelope<AthleteProfile>>('profile', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  } catch (error) {
    throw toAppError(error);
  }
}
