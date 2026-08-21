import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { fetchEvent, fetchEvents } from '@/api/events';

export function useEvents() {
  return useInfiniteQuery({
    queryKey: ['events'],
    queryFn: ({ pageParam }) => fetchEvents({ page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.current_page < lastPage.meta.last_page ? lastPage.meta.current_page + 1 : undefined,
  });
}

export function useEvent(slug: string) {
  return useQuery({
    queryKey: ['events', slug],
    queryFn: () => fetchEvent(slug),
    enabled: !!slug,
  });
}
