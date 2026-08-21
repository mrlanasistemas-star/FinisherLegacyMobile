import { apiClient } from '@/api/client';
import { toAppError } from '@/api/errors';
import type { Preregistration } from '@/types/models';

export interface PreregisterPayload {
  event_race_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  bib_number?: string;
}

export async function preregister(
  editionId: number,
  payload: PreregisterPayload,
): Promise<{ token: string; status: string }> {
  try {
    const { data } = await apiClient.post<{ data: { token: string; status: string } }>(
      `events/${editionId}/preregister`,
      payload,
    );
    return data.data;
  } catch (error) {
    throw toAppError(error);
  }
}

export async function fetchPreregistration(token: string): Promise<Preregistration> {
  try {
    const { data } = await apiClient.get<{ data: Preregistration }>(
      `preregistrations/${encodeURIComponent(token)}`,
    );
    return data.data;
  } catch (error) {
    throw toAppError(error);
  }
}
