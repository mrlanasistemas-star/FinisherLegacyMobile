import { apiClient } from '@/api/client';
import { toAppError } from '@/api/errors';
import type { LegacyPlateModel } from '@/types/models';

/** Public, not paginated — only active models. */
export async function fetchLegacyPlateModels(): Promise<LegacyPlateModel[]> {
  try {
    const { data } = await apiClient.get<{ data: LegacyPlateModel[] }>('legacy-plate-models');
    return data.data;
  } catch (error) {
    throw toAppError(error);
  }
}
