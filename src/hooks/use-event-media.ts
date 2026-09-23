import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  deleteEventMedia,
  fetchEventMedia,
  fetchMediaEntitlement,
  reorderEventMedia,
  updateEventMediaVisibility,
  uploadEventMedia,
  type UploadEventMediaFile,
} from '@/api/eventMedia';
import type { AthleteEventMedia } from '@/types/models';
import { ensureOnline } from '@/utils/network';

export function useEventMedia(participantId: number | null) {
  return useQuery({
    queryKey: ['me', 'events', participantId, 'media'],
    queryFn: () => fetchEventMedia(participantId as number),
    enabled: participantId !== null,
  });
}

/** Limits/used/remaining from the backend — refetched after every upload/delete (same `['me','events']` subtree). */
export function useMediaEntitlement(participantId: number | null) {
  return useQuery({
    queryKey: ['me', 'events', participantId, 'media-entitlement'],
    queryFn: () => fetchMediaEntitlement(participantId as number),
    enabled: participantId !== null,
  });
}

/** Optimistic reorder by uuid; rolls back if the server rejects it. */
export function useReorderEventMedia(participantId: number | null) {
  const queryClient = useQueryClient();
  const key = ['me', 'events', participantId, 'media'];

  return useMutation({
    mutationFn: async (orderedUuids: string[]) => {
      await ensureOnline();
      return reorderEventMedia(participantId as number, orderedUuids);
    },
    onMutate: (orderedUuids) => {
      const previous = queryClient.getQueryData<AthleteEventMedia[]>(key);
      if (previous) {
        const byUuid = new Map(previous.map((m) => [m.uuid, m]));
        queryClient.setQueryData(
          key,
          orderedUuids.map((uuid, index) => ({ ...(byUuid.get(uuid) as AthleteEventMedia), sort_order: index })).filter((m) => m.uuid),
        );
      }
      return { previous };
    },
    onError: (_error, _uuids, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSuccess: (media) => {
      queryClient.setQueryData(key, media);
      queryClient.invalidateQueries({ queryKey: ['me', 'events', participantId], exact: true });
    },
  });
}

/**
 * `participantId` accepts `null` purely so screens can call this hook
 * unconditionally (Rules of Hooks) even while a route param hasn't
 * resolved to a valid id yet — the mutation itself is never reachable from
 * the UI in that state (the screen renders an error/guard instead of the
 * interactive controls that would call `.mutate()`), so the `as number`
 * inside is safe in practice, not a type escape hatch for a real gap.
 */
export function useUploadEventMedia(participantId: number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      file,
      isPublic,
      onProgress,
    }: {
      file: UploadEventMediaFile;
      isPublic: boolean;
      onProgress?: (percent: number) => void;
    }) => uploadEventMedia(participantId as number, file, isPublic, onProgress),
    // Invalidate the whole `['me','events']` subtree, not just this
    // participant's media/detail queries — the "My Events" LIST row for
    // this participant also shows `media_count`, which would otherwise go
    // stale until an unrelated refetch (bug found in a hardening pass:
    // the narrower two-key invalidation this used to do never touched the
    // list query, keyed `['me','events', filters]`, since a filters object
    // never key-matches a participantId).
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'events'] });
    },
  });
}

export function useUpdateEventMediaVisibility(participantId: number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ uuid, isPublic }: { uuid: string; isPublic: boolean }) => updateEventMediaVisibility(uuid, isPublic),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'events'] });
    },
  });
}

export function useDeleteEventMedia(participantId: number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (uuid: string) => deleteEventMedia(uuid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'events'] });
    },
  });
}
