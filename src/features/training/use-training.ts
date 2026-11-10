import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData, type QueryClient } from '@tanstack/react-query';

import {
  blockTrainingSender,
  createTrainingLink,
  deleteTrainingMessage,
  fetchTrainingLinks,
  fetchTrainingMessages,
  markTrainingMessageListened,
  revokeTrainingLink,
  setTrainingMessageFavorite,
} from '@/api/training';
import { queryKeys } from '@/hooks/query-keys';
import { isProcessing, type CreateTrainingLinkInput, type TrainingFilter, type TrainingLink, type TrainingMessage, type TrainingMessagesPage } from '@/schemas/training';
import { haptics } from '@/utils/haptics';
import { ensureOnline } from '@/utils/network';

import { removeDownload, useOfflineStore } from './offline-cache';
import { removeFromQueue, updateMessage } from './player-controller';

/**
 * TanStack Query layer for Entrenamientos: the paginated inbox per filter,
 * share links, and the optimistic writes (favorite, hide, block, listened)
 * that update every cached list, the player queue and the offline copy at
 * once — and roll back if the server says no.
 */

type MessagesData = InfiniteData<TrainingMessagesPage>;

export function useTrainingMessages(filter: TrainingFilter) {
  return useInfiniteQuery({
    queryKey: queryKeys.trainingMessages(filter),
    queryFn: ({ pageParam }) => fetchTrainingMessages(filter, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.current_page < last.meta.last_page ? last.meta.current_page + 1 : undefined),
    // 404 while the backend ships the feature: show the error state at once.
    retry: (count, error) => count < 2 && !(error && typeof error === 'object' && 'kind' in error && error.kind === 'not_found'),
    // A voice note still processing becomes playable within seconds: poll until it is.
    refetchInterval: (query) => (query.state.data?.pages.some((page) => page.data.some(isProcessing)) ? 4000 : false),
  });
}

/** Messages that can enter a play queue right now (voice notes still processing are left out). */
export function playable(messages: TrainingMessage[]): TrainingMessage[] {
  return messages.filter((m) => !isProcessing(m));
}

export function flattenMessages(data: MessagesData | undefined): TrainingMessage[] {
  const seen = new Set<string>();
  const out: TrainingMessage[] = [];
  for (const page of data?.pages ?? []) {
    for (const message of page.data) {
      if (seen.has(message.uuid)) continue;
      seen.add(message.uuid);
      out.push(message);
    }
  }
  return out;
}

/** A message as currently cached in any inbox list (used to pick up a re-signed audio URL). */
export function findCachedMessage(client: QueryClient, uuid: string): TrainingMessage | null {
  for (const [, data] of client.getQueriesData<MessagesData>({ queryKey: queryKeys.trainingMessagesAll })) {
    for (const page of data?.pages ?? []) {
      const found = page.data.find((m) => m.uuid === uuid);
      if (found) return found;
    }
  }
  return null;
}

type Snapshot = [readonly unknown[], MessagesData | undefined][];

function snapshot(client: QueryClient): Snapshot {
  return client.getQueriesData<MessagesData>({ queryKey: queryKeys.trainingMessagesAll });
}

function restore(client: QueryClient, saved: Snapshot | undefined) {
  saved?.forEach(([key, data]) => client.setQueryData(key, data));
}

/** Applies `edit` to every cached page of every filter. `edit` returns null to drop a row. */
function editEverywhere(
  client: QueryClient,
  edit: (message: TrainingMessage) => TrainingMessage | null,
  metaEdit?: (meta: TrainingMessagesPage['meta'], removed: TrainingMessage[]) => TrainingMessagesPage['meta'],
) {
  client.setQueriesData<MessagesData>({ queryKey: queryKeys.trainingMessagesAll }, (data) => {
    if (!data) return data;
    return {
      ...data,
      pages: data.pages.map((page) => {
        const removed: TrainingMessage[] = [];
        const rows = page.data.flatMap((message) => {
          const edited = edit(message);
          if (!edited) removed.push(message);
          return edited ? [edited] : [];
        });
        return { data: rows, meta: metaEdit ? metaEdit(page.meta, removed) : page.meta };
      }),
    };
  });
}

export function useToggleFavorite() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ uuid, favorite }: { uuid: string; favorite: boolean }) => {
      await ensureOnline();
      await setTrainingMessageFavorite(uuid, favorite);
    },
    onMutate: async ({ uuid, favorite }) => {
      haptics.light();
      await client.cancelQueries({ queryKey: queryKeys.trainingMessagesAll });
      const saved = snapshot(client);
      editEverywhere(client, (m) => (m.uuid === uuid ? { ...m, favorite } : m));
      updateMessage(uuid, { favorite });
      useOfflineStore.getState().patchMessage(uuid, { favorite });
      return { saved };
    },
    onError: (_error, { uuid, favorite }, context) => {
      restore(client, context?.saved);
      updateMessage(uuid, { favorite: !favorite });
      useOfflineStore.getState().patchMessage(uuid, { favorite: !favorite });
    },
    onSettled: () => client.invalidateQueries({ queryKey: queryKeys.trainingMessages('favorites') }),
  });
}

function removeOptimistically(client: QueryClient, uuids: string[]) {
  editEverywhere(
    client,
    (m) => (uuids.includes(m.uuid) ? null : m),
    (meta, removed) => ({
      ...meta,
      total: Math.max(0, meta.total - removed.length),
      unheard_count: Math.max(0, meta.unheard_count - removed.filter((m) => !m.listened_at).length),
    }),
  );
}

/** "Ocultar" (swipe) — DELETE on the server. */
export function useHideMessage() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (uuid: string) => {
      await ensureOnline();
      await deleteTrainingMessage(uuid);
    },
    onMutate: async (uuid) => {
      await client.cancelQueries({ queryKey: queryKeys.trainingMessagesAll });
      const saved = snapshot(client);
      removeOptimistically(client, [uuid]);
      return { saved };
    },
    onSuccess: (_data, uuid) => {
      removeFromQueue([uuid]);
      removeDownload(uuid);
    },
    onError: (_error, _uuid, context) => restore(client, context?.saved),
    onSettled: () => client.invalidateQueries({ queryKey: queryKeys.trainingMessagesAll }),
  });
}

/** Blocks the sender of a message: their messages leave the inbox and their link can't send more. */
export function useBlockSender() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (message: TrainingMessage) => {
      await ensureOnline();
      await blockTrainingSender(message.uuid);
    },
    onMutate: async (message) => {
      await client.cancelQueries({ queryKey: queryKeys.trainingMessagesAll });
      const saved = snapshot(client);
      removeOptimistically(client, [message.uuid]);
      return { saved };
    },
    onSuccess: (_data, message) => {
      removeFromQueue([message.uuid]);
      removeDownload(message.uuid);
    },
    onError: (_error, _message, context) => restore(client, context?.saved),
    // The server knows which other messages came from that sender.
    onSettled: () => client.invalidateQueries({ queryKey: queryKeys.trainingMessagesAll }),
  });
}

/**
 * The player's auto "listened" mark. Silent: optimistic in every list, the
 * unheard counter drops, and a failure just lets the next refresh decide.
 */
export async function markListenedEverywhere(client: QueryClient, uuid: string) {
  const now = new Date().toISOString();
  editEverywhere(
    client,
    (m) => (m.uuid === uuid ? { ...m, listened_at: m.listened_at ?? now } : m),
    (meta) => meta,
  );
  // Counter: one fewer unheard, once.
  client.setQueriesData<MessagesData>({ queryKey: queryKeys.trainingMessagesAll }, (data) =>
    data ? { ...data, pages: data.pages.map((page) => ({ ...page, meta: { ...page.meta, unheard_count: Math.max(0, page.meta.unheard_count - 1) } })) } : data,
  );
  useOfflineStore.getState().patchMessage(uuid, { listened_at: now });
  try {
    await ensureOnline();
    await markTrainingMessageListened(uuid);
  } catch {
    // Offline or transient: harmless, it will be heard again or refreshed.
  } finally {
    void client.invalidateQueries({ queryKey: queryKeys.trainingMessages('unheard') });
  }
}

export function useTrainingLinks() {
  return useQuery({
    queryKey: queryKeys.trainingLinks,
    queryFn: fetchTrainingLinks,
    retry: (count, error) => count < 2 && !(error && typeof error === 'object' && 'kind' in error && error.kind === 'not_found'),
  });
}

export function useCreateTrainingLink() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTrainingLinkInput): Promise<TrainingLink> => {
      await ensureOnline();
      return createTrainingLink(input);
    },
    onSuccess: (link) => {
      haptics.success();
      client.setQueryData<TrainingLink[]>(queryKeys.trainingLinks, (links) => [link, ...(links ?? []).filter((l) => l.uuid !== link.uuid)]);
    },
    onSettled: () => client.invalidateQueries({ queryKey: queryKeys.trainingLinks }),
  });
}

export function useRevokeTrainingLink() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (uuid: string) => {
      await ensureOnline();
      await revokeTrainingLink(uuid);
    },
    onMutate: async (uuid) => {
      await client.cancelQueries({ queryKey: queryKeys.trainingLinks });
      const previous = client.getQueryData<TrainingLink[]>(queryKeys.trainingLinks);
      const now = new Date().toISOString();
      client.setQueryData<TrainingLink[]>(queryKeys.trainingLinks, (links) => links?.map((l) => (l.uuid === uuid ? { ...l, revoked_at: now } : l)));
      return { previous };
    },
    onError: (_error, _uuid, context) => client.setQueryData(queryKeys.trainingLinks, context?.previous),
    onSettled: () => client.invalidateQueries({ queryKey: queryKeys.trainingLinks }),
  });
}
