import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'notifications'] });
    },
  });
}
