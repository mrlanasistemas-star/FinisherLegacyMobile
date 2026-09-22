import { apiClient } from '@/api/client';
import { toAppError } from '@/api/errors';
import type { FlatMetaPaginatedResponse } from '@/types/api';
import type {
  SupportSessionDetail,
  SupportSessionManifest,
  SupportSessionSummary,
  SupportTriggeredMessage,
} from '@/types/models';

export async function fetchSupportSessions(
  page = 1,
): Promise<{ rows: SupportSessionSummary[]; page: number; lastPage: number; total: number }> {
  try {
    const { data } = await apiClient.get<FlatMetaPaginatedResponse<SupportSessionSummary>>('me/support-sessions', {
      params: { page },
    });
    return { rows: data.data, page: data.meta.current_page, lastPage: data.meta.last_page, total: data.meta.total };
  } catch (error) {
    throw toAppError(error);
  }
}

export interface CreateSupportSessionPayload {
  title: string;
  event_participant_id?: number;
  target_distance_meters?: number;
}

export async function createSupportSession(payload: CreateSupportSessionPayload): Promise<SupportSessionSummary> {
  try {
    const { data } = await apiClient.post<{ data: SupportSessionSummary }>('me/support-sessions', payload);
    return data.data;
  } catch (error) {
    throw toAppError(error);
  }
}

export async function fetchSupportSession(id: number): Promise<SupportSessionDetail> {
  try {
    const { data } = await apiClient.get<{ data: SupportSessionDetail }>(`me/support-sessions/${id}`);
    return data.data;
  } catch (error) {
    throw toAppError(error);
  }
}

export async function fetchSupportSessionManifest(id: number): Promise<SupportSessionManifest> {
  try {
    const { data } = await apiClient.get<{ data: SupportSessionManifest }>(`me/support-sessions/${id}/manifest`);
    return data.data;
  } catch (error) {
    throw toAppError(error);
  }
}

export async function fetchTriggeredSupportMessages(
  id: number,
  distanceMeters: number,
  consumedIds: number[] = [],
): Promise<SupportTriggeredMessage[]> {
  try {
    const { data } = await apiClient.get<{ data: SupportTriggeredMessage[] }>(`me/support-sessions/${id}/triggered`, {
      params: { distance_meters: distanceMeters, consumed_ids: consumedIds },
    });
    return data.data;
  } catch (error) {
    throw toAppError(error);
  }
}

export async function markSupportMessageConsumed(messageId: number): Promise<void> {
  try {
    await apiClient.post(`me/support-messages/${messageId}/consumed`);
  } catch (error) {
    throw toAppError(error);
  }
}
