import { apiClient } from '@/api/client';
import { toAppError } from '@/api/errors';
import type { NestedPaginatorEnvelope } from '@/types/api';
import type { AthleteHistoryRow, EventParticipantDetail } from '@/types/models';

export interface FetchMyEventsParams {
  page?: number;
  per_page?: number;
  from?: string;
  to?: string;
  event_id?: number;
  sport_id?: number;
  event_race_id?: number;
  legacy_plate?: string;
  athlete_owned_product_id?: number;
}

/**
 * `GET /me/events` — same controller/query as `/me/history` (product
 * consolidation brief: "no duplicar la Query"), so this single client
 * function covers both. Response is NOT the standard `{data,links,meta}`
 * shape — see `NestedPaginatorEnvelope` for why.
 */
export async function fetchMyEvents(
  params: FetchMyEventsParams = {},
): Promise<{ rows: AthleteHistoryRow[]; page: number; lastPage: number; total: number }> {
  try {
    const { data } = await apiClient.get<NestedPaginatorEnvelope<AthleteHistoryRow>>('me/events', {
      params,
    });
    return {
      rows: data.data.data,
      page: data.data.current_page,
      lastPage: data.data.last_page,
      total: data.data.total,
    };
  } catch (error) {
    throw toAppError(error);
  }
}

export async function fetchEventParticipant(participantId: number): Promise<EventParticipantDetail> {
  try {
    const { data } = await apiClient.get<{ data: EventParticipantDetail }>(`me/events/${participantId}`);
    return data.data;
  } catch (error) {
    throw toAppError(error);
  }
}
