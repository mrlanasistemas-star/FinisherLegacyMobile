import { apiClient } from '@/api/client';
import { toAppError } from '@/api/errors';
import type { PaginatedResponse } from '@/types/api';
import type { EventDetail, EventEditionCard } from '@/types/models';

export interface FetchEventsParams {
  page?: number;
  q?: string;
  sport?: string;
  status?: string;
}

export async function fetchEvents(
  params: FetchEventsParams = {},
): Promise<PaginatedResponse<EventEditionCard>> {
  try {
    const { data } = await apiClient.get<PaginatedResponse<EventEditionCard>>('events', {
      params,
    });
    return data;
  } catch (error) {
    throw toAppError(error);
  }
}

export async function fetchEvent(slug: string): Promise<EventDetail> {
  try {
    const { data } = await apiClient.get<{ data: EventDetail }>(
      `events/${encodeURIComponent(slug)}`,
    );
    return data.data;
  } catch (error) {
    throw toAppError(error);
  }
}
