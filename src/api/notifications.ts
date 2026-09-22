import { apiClient } from '@/api/client';
import { toAppError } from '@/api/errors';
import type { NestedPaginatorEnvelope } from '@/types/api';
import type { AppNotification } from '@/types/models';

/**
 * `GET /me/notifications` passes a raw paginator into the shared
 * `respond()` helper — same non-standard nesting as `/me/events`, see
 * `NestedPaginatorEnvelope`. There is no unread-count endpoint; the badge
 * is derived client-side from `read_at === null` on fetched pages.
 */
export async function fetchNotifications(
  page = 1,
): Promise<{ rows: AppNotification[]; page: number; lastPage: number; total: number }> {
  try {
    const { data } = await apiClient.get<NestedPaginatorEnvelope<AppNotification>>('me/notifications', {
      params: { page },
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

export async function markNotificationRead(id: string): Promise<void> {
  try {
    await apiClient.post(`me/notifications/${encodeURIComponent(id)}/read`);
  } catch (error) {
    throw toAppError(error);
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  try {
    await apiClient.post('me/notifications/read-all');
  } catch (error) {
    throw toAppError(error);
  }
}
