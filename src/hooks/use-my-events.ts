import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { fetchEventParticipant, fetchMyEvents, type FetchMyEventsParams } from '@/api/meEvents';

export function useMyEvents(filters: Omit<FetchMyEventsParams, 'page'> = {}) {
  return useInfiniteQuery({
    queryKey: ['me', 'events', filters],
    queryFn: ({ pageParam }) => fetchMyEvents({ page: pageParam, ...filters }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.page < lastPage.lastPage ? lastPage.page + 1 : undefined),
  });
}

export function useEventParticipant(participantId: number | null) {
  return useQuery({
    queryKey: ['me', 'events', participantId],
    queryFn: () => fetchEventParticipant(participantId as number),
    enabled: participantId !== null,
  });
}
