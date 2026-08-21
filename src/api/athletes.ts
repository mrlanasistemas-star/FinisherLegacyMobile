import { apiClient } from '@/api/client';
import { toAppError } from '@/api/errors';
import type { PublicAthlete } from '@/types/models';

export async function fetchPublicAthlete(username: string): Promise<PublicAthlete> {
  try {
    const { data } = await apiClient.get<{ data: PublicAthlete }>(
      `athletes/${encodeURIComponent(username)}`,
    );
    return data.data;
  } catch (error) {
    throw toAppError(error);
  }
}
