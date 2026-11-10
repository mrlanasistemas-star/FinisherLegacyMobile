import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';

import {
  fetchNotificationPreferences,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  updateNotificationPreferences,
  type NotificationPreferencesPatch,
} from '@/api/notifications';
import type { NotificationPreferences } from '@/types/models';

export function useNotifications({ enabled = true }: { enabled?: boolean } = {}) {
  return useInfiniteQuery({
    queryKey: ['me', 'notifications'],
    queryFn: ({ pageParam }) => fetchNotifications(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.page < lastPage.lastPage ? lastPage.page + 1 : undefined),
    enabled,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    // Optimistic: the row and the bell badge update on tap, not after a round trip.
    onMutate: (id: string) => {
      const now = new Date().toISOString();
      queryClient.setQueryData<InfiniteData<NotificationsPage>>(['me', 'notifications'], (data) =>
        data
          ? {
              ...data,
              pages: data.pages.map((page, index) => ({
                ...page,
                rows: page.rows.map((row) => (row.id === id && row.read_at === null ? { ...row, read_at: now } : row)),
                unreadCount: index === 0 && page.unreadCount ? Math.max(0, page.unreadCount - 1) : page.unreadCount,
              })),
            }
          : data,
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'notifications'] });
    },
  });
}

type NotificationsPage = Awaited<ReturnType<typeof fetchNotifications>>;

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'notifications'] });
    },
  });
}

/** Real unread total from the server (first page's `meta.unread_count`). */
export function useUnreadNotificationsCount({ enabled = true }: { enabled?: boolean } = {}): number {
  const { data } = useNotifications({ enabled });
  const first = data?.pages[0];
  if (!first) return 0;
  return first.unreadCount ?? first.rows.filter((row) => row.read_at === null).length;
}

const PREFERENCES_KEY = ['me', 'notification-preferences'] as const;

export function useNotificationPreferences() {
  return useQuery({ queryKey: PREFERENCES_KEY, queryFn: fetchNotificationPreferences });
}

/** Optimistic: the switch moves at once and rolls back if the save fails. */
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patch: NotificationPreferencesPatch) => updateNotificationPreferences(patch),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: PREFERENCES_KEY });
      const previous = queryClient.getQueryData<NotificationPreferences>(PREFERENCES_KEY);
      if (previous) {
        queryClient.setQueryData<NotificationPreferences>(PREFERENCES_KEY, {
          ...previous,
          categories: previous.categories.map((row) => ({ ...row, ...(patch[row.key] ?? {}) })),
        });
      }
      return { previous };
    },
    onError: (_error, _patch, context) => {
      if (context?.previous) queryClient.setQueryData(PREFERENCES_KEY, context.previous);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(PREFERENCES_KEY, data);
    },
  });
}
