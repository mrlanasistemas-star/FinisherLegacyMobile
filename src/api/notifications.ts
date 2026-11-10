import { apiClient } from '@/api/client';
import { toAppError } from '@/api/errors';
import type { NestedPaginatorEnvelope } from '@/types/api';
import type { AppNotification, NotificationCategoryKey, NotificationPreferences } from '@/types/models';

/**
 * `GET /me/notifications` passes a raw paginator into the shared
 * `respond()` helper — same non-standard nesting as `/me/events`, see
 * `NestedPaginatorEnvelope`. `meta.unread_count` is the real unread total
 * (not just the loaded page) — the badge reads it. Same rows and read state
 * as the web notification center.
 */
export async function fetchNotifications(
  page = 1,
): Promise<{ rows: AppNotification[]; page: number; lastPage: number; total: number; unreadCount: number | null }> {
  try {
    const { data } = await apiClient.get<NestedPaginatorEnvelope<AppNotification>>('me/notifications', {
      params: { page },
    });
    return {
      rows: data.data.data,
      page: data.data.current_page,
      lastPage: data.data.last_page,
      total: data.data.total,
      unreadCount: data.meta?.unread_count ?? null,
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

const reportedOpens = new Set<string>();

/**
 * `POST /notifications/{id}/opened` — tells the backend a push campaign was
 * tapped. `id` = the push `data.campaign_id`, or the notification-center id
 * of a broadcast row. Fire-and-forget: reported once per id per app run,
 * never throws, and a failure is ignored (a later tap may retry).
 */
export function reportNotificationOpened(id: string): void {
  if (!id || reportedOpens.has(id)) return;
  reportedOpens.add(id);
  apiClient.post(`notifications/${encodeURIComponent(id)}/opened`).catch(() => {
    reportedOpens.delete(id);
  });
}

export async function markAllNotificationsRead(): Promise<void> {
  try {
    await apiClient.post('me/notifications/read-all');
  } catch (error) {
    throw toAppError(error);
  }
}

/** Per-category in-app + push switches (same storage as web Ajustes › Notificaciones). */
export async function fetchNotificationPreferences(): Promise<NotificationPreferences> {
  try {
    const { data } = await apiClient.get<{ data: NotificationPreferences }>('me/notifications/preferences');
    return data.data;
  } catch (error) {
    throw toAppError(error);
  }
}

export type NotificationPreferencesPatch = Partial<Record<NotificationCategoryKey, { in_app?: boolean; push?: boolean }>>;

export async function updateNotificationPreferences(preferences: NotificationPreferencesPatch): Promise<NotificationPreferences> {
  try {
    const { data } = await apiClient.put<{ data: NotificationPreferences }>('me/notifications/preferences', { preferences });
    return data.data;
  } catch (error) {
    throw toAppError(error);
  }
}
