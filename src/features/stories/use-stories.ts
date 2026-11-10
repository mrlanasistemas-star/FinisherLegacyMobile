/**
 * TanStack Query glue of the story editor: the editable story, its media
 * (polled while something is still "Procesando…"), optimistic delete /
 * reorder with rollback, the purchased-photos picker and the bridge that
 * refreshes the gallery when a background upload lands.
 *
 * Root key `stories` is NOT in the query persister allowlist on purpose:
 * media URLs may be signed and the quota must always be the server's.
 */

import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import {
  deleteStoryMedia,
  getEditableStory,
  getPurchasedPhotos,
  getStoryMedia,
  importPurchasedPhotos,
  reorderStoryMedia,
  updateStory,
  type StoryPatch,
} from '@/api/stories';
import { iapKeys } from '@/features/iap/use-photo-expansion';
import type { EditableStory, StoryMediaPayload } from '@/schemas/story';
import { useAuthStore } from '@/stores/authStore';
import { ensureOnline } from '@/utils/network';

import { applyLimit, kindForRole, limitFromError } from './quota';
import { onUploadSettled, resetUploads, useUploadStore } from './upload-store';

export const storyKeys = {
  all: ['stories'] as const,
  detail: (publicId: string) => ['stories', 'detail', publicId] as const,
  media: (publicId: string) => ['stories', 'media', publicId] as const,
  purchased: ['stories', 'purchased-photos'] as const,
};

const PROCESSING_POLL_MS = 4000;

export function useEditableStory(publicId: string) {
  return useQuery({
    queryKey: storyKeys.detail(publicId),
    queryFn: () => getEditableStory(publicId),
    enabled: publicId !== '',
  });
}

export function useStoryMedia(publicId: string, enabled = true) {
  return useQuery({
    queryKey: storyKeys.media(publicId),
    queryFn: () => getStoryMedia(publicId),
    enabled: enabled && publicId !== '',
    // Videos (and big photos) are transcoded server-side: keep asking until nothing is processing.
    refetchInterval: (query) => (query.state.data?.items.some((item) => item.status === 'processing') ? PROCESSING_POLL_MS : false),
  });
}

/** Everything that shows a story's cover / counters elsewhere in the app. */
export function invalidateStoryEverywhere(queryClient: QueryClient, publicId: string) {
  void queryClient.invalidateQueries({ queryKey: iapKeys.stories });
  void queryClient.invalidateQueries({ queryKey: iapKeys.story(publicId) });
  void queryClient.invalidateQueries({ queryKey: iapKeys.quota(publicId) });
}

export function useUpdateStory(publicId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: StoryPatch) => {
      await ensureOnline();
      return updateStory(publicId, patch);
    },
    onSuccess: (story: EditableStory) => {
      queryClient.setQueryData(storyKeys.detail(publicId), story);
      invalidateStoryEverywhere(queryClient, publicId);
    },
  });
}

export function useDeleteStoryMedia(publicId: string) {
  const queryClient = useQueryClient();
  const key = storyKeys.media(publicId);
  return useMutation({
    mutationFn: async (uuid: string) => {
      await ensureOnline();
      await deleteStoryMedia(publicId, uuid);
    },
    onMutate: async (uuid) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<StoryMediaPayload>(key);
      if (previous) {
        const removed = previous.items.find((item) => item.uuid === uuid);
        const quota = { ...previous.quota };
        if (removed) {
          const kind = kindForRole(removed.role);
          const bucket = quota[kind];
          quota[kind] = { ...bucket, used: Math.max(0, bucket.used - 1), remaining: Math.min(bucket.limit, bucket.remaining + 1) };
        }
        queryClient.setQueryData<StoryMediaPayload>(key, { items: previous.items.filter((item) => item.uuid !== uuid), quota });
      }
      return { previous };
    },
    onError: (_error, _uuid, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key });
      invalidateStoryEverywhere(queryClient, publicId);
    },
  });
}

/** Optimistic reorder by uuid; rolls back if the server rejects it. */
export function useReorderStoryMedia(publicId: string) {
  const queryClient = useQueryClient();
  const key = storyKeys.media(publicId);
  return useMutation({
    mutationFn: async (order: string[]) => {
      await ensureOnline();
      await reorderStoryMedia(publicId, order);
    },
    onMutate: async (order) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<StoryMediaPayload>(key);
      if (previous) {
        const rank = new Map(order.map((uuid, index) => [uuid, index]));
        const items = previous.items
          .map((item, index) => ({ ...item, sort_order: rank.get(item.uuid) ?? order.length + index }))
          .sort((a, b) => a.sort_order - b.sort_order);
        queryClient.setQueryData<StoryMediaPayload>(key, { ...previous, items });
      }
      return { previous };
    },
    onError: (_error, _order, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSuccess: () => invalidateStoryEverywhere(queryClient, publicId),
  });
}

export function usePurchasedPhotos(enabled = true) {
  return useInfiniteQuery({
    queryKey: storyKeys.purchased,
    queryFn: ({ pageParam }) => getPurchasedPhotos(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    enabled,
  });
}

/** Adds bought photos to the story; a limit error is reported so the editor offers more space. */
export function useImportPurchasedPhotos(publicId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (saleIds: (number | string)[]) => {
      await ensureOnline();
      return importPurchasedPhotos(publicId, saleIds);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: storyKeys.media(publicId) });
      void queryClient.invalidateQueries({ queryKey: storyKeys.purchased });
      invalidateStoryEverywhere(queryClient, publicId);
    },
    onError: (error) => {
      const limit = limitFromError(error, 'photos');
      if (!limit) return;
      const key = storyKeys.media(publicId);
      const current = queryClient.getQueryData<StoryMediaPayload>(key);
      if (current) queryClient.setQueryData<StoryMediaPayload>(key, { ...current, quota: applyLimit(current.quota, limit) });
      useUploadStore.getState().reportLimit(publicId, limit);
    },
  });
}

/**
 * Root-level (mounted once in app/_layout): when a queued upload finishes —
 * whatever screen is open — refresh that story's gallery and quota, and
 * drop the queue when the session ends.
 */
export function useStoryUploadBridge() {
  const queryClient = useQueryClient();
  const status = useAuthStore((state) => state.status);

  useEffect(
    () =>
      onUploadSettled((storyId, stored) => {
        void queryClient.invalidateQueries({ queryKey: storyKeys.media(storyId) });
        if (stored) {
          // The first photo becomes the cover.
          void queryClient.invalidateQueries({ queryKey: storyKeys.detail(storyId) });
          invalidateStoryEverywhere(queryClient, storyId);
        }
      }),
    [queryClient],
  );

  useEffect(() => {
    if (status === 'unauthenticated') resetUploads();
  }, [status]);
}
