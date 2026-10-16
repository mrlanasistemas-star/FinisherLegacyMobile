import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';

import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from '@/api/notifications';

export function useNotifications() {
  return useInfiniteQuery({
    queryKey: ['me', 'notifications'],
    queryFn: ({ pageParam }) => fetchNotifications(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.page < lastPage.lastPage ? lastPage.page + 1 : undefined),
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
export function useUnreadNotificationsCount(): number {
  const { data } = useNotifications();
  const first = data?.pages[0];
  if (!first) return 0;
  return first.unreadCount ?? first.rows.filter((row) => row.read_at === null).length;
}
