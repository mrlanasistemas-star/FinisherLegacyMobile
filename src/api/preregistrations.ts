import { apiClient } from '@/api/client';
import { toAppError } from '@/api/errors';

export interface PreregisterPayload {
  /** The race's public uuid, exactly as `GET /events/{slug}` exposes it. */
  event_race_uuid: string;
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
