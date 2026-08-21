import { apiClient } from '@/api/client';
import { toAppError } from '@/api/errors';
import type { PaginatedResponse } from '@/types/api';
import type { Medal, Visibility } from '@/types/models';

export interface LocalImage {
  uri: string;
  name: string;
  type: string;
}

export interface CreateMedalPayload {
  origin: 'registered' | 'manual';
  event_id?: number;
  event_edition_id?: number;
  event_race_id?: number;
  event_name_manual?: string;
  event_date?: string;
  city?: string;
  country?: string;
  distance_label?: string;
  official_time?: string;
  pace?: string;
  story?: string;
  visibility: Visibility;
  front_image: LocalImage;
  back_image?: LocalImage | null;
  gallery_images?: LocalImage[];
}

export type UpdateMedalPayload = Partial<Omit<CreateMedalPayload, 'origin' | 'front_image'>> & {
  visibility: Visibility;
  front_image?: LocalImage | null;
};

function appendMedalForm(form: FormData, payload: CreateMedalPayload | UpdateMedalPayload) {
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) continue;
    if (key === 'front_image' || key === 'back_image') {
      form.append(key, value);
      continue;
    }
    if (key === 'gallery_images' && Array.isArray(value)) {
      value.forEach((file) => {
        form.append('gallery_images[]', file);
      });
      continue;
    }
    form.append(key, String(value));
  }
}

export async function fetchMedals(page = 1): Promise<PaginatedResponse<Medal>> {
  try {
    const { data } = await apiClient.get<PaginatedResponse<Medal>>('medals', {
      params: { page },
    });
    return data;
  } catch (error) {
    throw toAppError(error);
  }
}

export async function fetchMedal(uuid: string): Promise<Medal> {
  try {
    const { data } = await apiClient.get<{ data: Medal }>(`medals/${uuid}`);
    return data.data;
  } catch (error) {
    throw toAppError(error);
  }
}

export async function createMedal(payload: CreateMedalPayload): Promise<Medal> {
  const form = new FormData();
  appendMedalForm(form, payload);

  try {
    const { data } = await apiClient.post<{ data: Medal }>('medals', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  } catch (error) {
    throw toAppError(error);
  }
}

export async function updateMedal(uuid: string, payload: UpdateMedalPayload): Promise<Medal> {
  const form = new FormData();
  appendMedalForm(form, payload);
  form.append('_method', 'PATCH');

  try {
    const { data } = await apiClient.post<{ data: Medal }>(`medals/${uuid}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  } catch (error) {
    throw toAppError(error);
  }
}

export async function deleteMedal(uuid: string): Promise<void> {
  try {
    await apiClient.delete(`medals/${uuid}`);
  } catch (error) {
    throw toAppError(error);
  }
}
