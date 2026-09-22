import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createSupportSession,
  fetchSupportSession,
  fetchSupportSessionManifest,
  fetchSupportSessions,
  fetchTriggeredSupportMessages,
  markSupportMessageConsumed,
  type CreateSupportSessionPayload,
} from '@/api/support';

export function useSupportSessions() {
  return useInfiniteQuery({
    queryKey: ['me', 'support-sessions'],
    queryFn: ({ pageParam }) => fetchSupportSessions(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.page < lastPage.lastPage ? lastPage.page + 1 : undefined),
  });
}

export function useSupportSession(id: number | null) {
  return useQuery({
    queryKey: ['me', 'support-sessions', id],
    queryFn: () => fetchSupportSession(id as number),
    enabled: id !== null,
  });
}

export function useSupportSessionManifest(id: number | null) {
  return useQuery({
    queryKey: ['me', 'support-sessions', id, 'manifest'],
    queryFn: () => fetchSupportSessionManifest(id as number),
    enabled: id !== null,
  });
}

export function useTriggeredSupportMessages(id: number | null, distanceMeters: number, consumedIds: number[]) {
  return useQuery({
    queryKey: ['me', 'support-sessions', id, 'triggered', distanceMeters, consumedIds],
    queryFn: () => fetchTriggeredSupportMessages(id as number, distanceMeters, consumedIds),
    enabled: id !== null,
  });
}

export function useCreateSupportSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateSupportSessionPayload) => createSupportSession(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'support-sessions'] });
    },
  });
}

export function useMarkSupportMessageConsumed(sessionId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (messageId: number) => markSupportMessageConsumed(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'support-sessions', sessionId] });
    },
  });
}
