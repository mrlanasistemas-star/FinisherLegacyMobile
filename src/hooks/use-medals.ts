import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { fetchMedal, fetchMedals } from '@/api/medals';

export function useMedals() {
  return useInfiniteQuery({
    queryKey: ['medals'],
    queryFn: ({ pageParam }) => fetchMedals(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.current_page < lastPage.meta.last_page ? lastPage.meta.current_page + 1 : undefined,
  });
}

export function useMedal(uuid: string) {
  return useQuery({
    queryKey: ['medals', uuid],
    queryFn: () => fetchMedal(uuid),
    enabled: !!uuid,
  });
}
