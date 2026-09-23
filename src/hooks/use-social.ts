import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import {
  createMoment,
  deleteComment,
  deleteMoment,
  fetchAthleteMoments,
  fetchBlocks,
  fetchComments,
  fetchConnections,
  fetchExplore,
  fetchFeed,
  fetchMoment,
  postComment,
  report,
  search,
  setBlock,
  setFollow,
  setReaction,
  updateMoment,
  type ConnectionKind,
  type FeedScope,
  type SearchType,
} from '@/api/social';
import { fetchPublicAthlete } from '@/api/athletes';
import { applyReactionState, bumpComments, toggleFollowState, toggleReaction } from '@/features/social/moment-state';
import { queryKeys } from '@/hooks/query-keys';
import type { PaginatedResponse } from '@/types/api';
import type { PublicAthlete } from '@/types/models';
import type { CreateMomentInput, CursorPage, ExplorePayload, LegacyMoment, MomentComment, ReactionType } from '@/types/social';
import { haptics } from '@/utils/haptics';
import { ensureOnline } from '@/utils/network';
import { uuidv4 } from '@/utils/uuid';

// ---------------------------------------------------------------------------
// Cache helpers — one Moment can be on screen in several lists at once
// (feed, explore, a profile, its detail). Update it everywhere.
// ---------------------------------------------------------------------------

function updateMomentEverywhere(client: QueryClient, uuid: string, update: (moment: LegacyMoment) => LegacyMoment) {
  const patchPages = (data: InfiniteData<CursorPage<LegacyMoment>> | undefined) =>
    data
      ? { ...data, pages: data.pages.map((page) => ({ ...page, data: page.data.map((m) => (m.uuid === uuid ? update(m) : m)) })) }
      : data;

  client.setQueriesData<InfiniteData<CursorPage<LegacyMoment>>>({ queryKey: queryKeys.feedAll }, patchPages);
  client.setQueriesData<InfiniteData<CursorPage<LegacyMoment>>>(
    { predicate: (q) => q.queryKey[0] === 'athlete' && q.queryKey[2] === 'moments' },
    patchPages,
  );
  client.setQueryData<ExplorePayload>(queryKeys.explore, (data) =>
    data ? { ...data, moments: data.moments.map((m) => (m.uuid === uuid ? update(m) : m)) } : data,
  );
  client.setQueriesData<PublicAthlete>({ predicate: (q) => q.queryKey[0] === 'athlete' && q.queryKey.length === 2 }, (data) =>
    data ? { ...data, recent_moments: data.recent_moments.map((m) => (m.uuid === uuid ? update(m) : m)) } : data,
  );
  client.setQueryData<LegacyMoment>(queryKeys.moment(uuid), (data) => (data ? update(data) : data));
}

function findCachedMoment(client: QueryClient, uuid: string): LegacyMoment | undefined {
  const direct = client.getQueryData<LegacyMoment>(queryKeys.moment(uuid));
  if (direct) return direct;

  for (const [, data] of client.getQueriesData<InfiniteData<CursorPage<LegacyMoment>>>({ queryKey: queryKeys.feedAll })) {
    const found = data?.pages.flatMap((p) => p.data).find((m) => m.uuid === uuid);
    if (found) return found;
  }
  return client.getQueryData<ExplorePayload>(queryKeys.explore)?.moments.find((m) => m.uuid === uuid);
}

// ---------------------------------------------------------------------------
// Feed / explore / search
// ---------------------------------------------------------------------------

export function useFeed(scope: FeedScope) {
  return useInfiniteQuery({
    queryKey: queryKeys.feed(scope),
    queryFn: ({ pageParam }) => fetchFeed(scope, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.meta.next_cursor ?? undefined,
  });
}

export function useExplore() {
  return useQuery({ queryKey: queryKeys.explore, queryFn: fetchExplore, staleTime: 60_000 });
}

/** Debounced value — search waits for a 350ms pause instead of firing per keystroke. */
export function useDebouncedValue<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function useSearch(term: string, type: SearchType = 'all') {
  const q = useDebouncedValue(term.trim(), 350);
  return useQuery({
    queryKey: queryKeys.search(q, type),
    queryFn: () => search(q, type),
    enabled: q.length >= 2,
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  });
}

// ---------------------------------------------------------------------------
// Moments
// ---------------------------------------------------------------------------

export function useMoment(uuid: string) {
  const client = useQueryClient();
  return useQuery({
    queryKey: queryKeys.moment(uuid),
    queryFn: () => fetchMoment(uuid),
    enabled: !!uuid,
    placeholderData: () => findCachedMoment(client, uuid),
  });
}

/**
 * Keeps one Idempotency-Key per draft: a timeout + retry publishes once.
 * `reset()` after success or when the athlete discards the draft.
 */
export function useCreateMoment() {
  const client = useQueryClient();
  const keyRef = useRef<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (input: CreateMomentInput) => {
      await ensureOnline();
      keyRef.current ??= uuidv4();
      return createMoment(input, keyRef.current);
    },
    onSuccess: () => {
      keyRef.current = null;
      haptics.success();
      client.invalidateQueries({ queryKey: queryKeys.feedAll });
      client.invalidateQueries({ queryKey: queryKeys.profile });
      client.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'athlete' });
    },
  });

  return {
    ...mutation,
    resetDraft: () => {
      keyRef.current = null;
    },
  };
}

export function useUpdateMoment(uuid: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Parameters<typeof updateMoment>[1]) => {
      await ensureOnline();
      return updateMoment(uuid, patch);
    },
    onSuccess: (moment) => updateMomentEverywhere(client, uuid, () => moment),
  });
}

export function useDeleteMoment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (uuid: string) => {
      await ensureOnline();
      await deleteMoment(uuid);
      return uuid;
    },
    onSuccess: (uuid) => {
      client.removeQueries({ queryKey: queryKeys.moment(uuid) });
      client.invalidateQueries({ queryKey: queryKeys.feedAll });
      client.invalidateQueries({ queryKey: queryKeys.profile });
      client.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'athlete' });
    },
  });
}

/** Optimistic toggle; rolls back on failure; server counts win on success. */
export function useReaction() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ uuid, type, active }: { uuid: string; type: ReactionType; active: boolean }) => {
      await ensureOnline();
      return setReaction(uuid, type, active);
    },
    onMutate: ({ uuid, type, active }) => {
      haptics.light();
      const previous = findCachedMoment(client, uuid);
      updateMomentEverywhere(client, uuid, (m) => toggleReaction(m, type, active));
      return { previous };
    },
    onError: (_error, { uuid }, context) => {
      if (context?.previous) {
        const previous = context.previous;
        updateMomentEverywhere(client, uuid, () => previous);
      }
    },
    onSuccess: (state, { uuid }) => updateMomentEverywhere(client, uuid, (m) => applyReactionState(m, state)),
  });
}

// ---------------------------------------------------------------------------
// Comments ("mensajes de apoyo")
// ---------------------------------------------------------------------------

export function useComments(uuid: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.momentComments(uuid),
    queryFn: ({ pageParam }) => fetchComments(uuid, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.current_page < last.meta.last_page ? last.meta.current_page + 1 : undefined),
    enabled: !!uuid,
  });
}

export function usePostComment(uuid: string) {
  const client = useQueryClient();
  const keyRef = useRef<string | null>(null);

  return useMutation({
    mutationFn: async (body: string) => {
      await ensureOnline();
      keyRef.current ??= uuidv4();
      return postComment(uuid, body, keyRef.current);
    },
    onSuccess: (comment) => {
      keyRef.current = null;
      client.setQueryData<InfiniteData<PaginatedResponse<MomentComment>>>(queryKeys.momentComments(uuid), (data) => {
        if (!data || data.pages.length === 0) return data;
        const pages = [...data.pages];
        const last = pages[pages.length - 1];
        pages[pages.length - 1] = { ...last, data: [...last.data, comment] };
        return { ...data, pages };
      });
      updateMomentEverywhere(client, uuid, (m) => bumpComments(m, 1));
    },
  });
}

export function useDeleteComment(momentUuid: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (commentUuid: string) => {
      await ensureOnline();
      await deleteComment(commentUuid);
      return commentUuid;
    },
    onSuccess: (commentUuid) => {
      client.setQueryData<InfiniteData<PaginatedResponse<MomentComment>>>(queryKeys.momentComments(momentUuid), (data) =>
        data ? { ...data, pages: data.pages.map((p) => ({ ...p, data: p.data.filter((c) => c.uuid !== commentUuid) })) } : data,
      );
      updateMomentEverywhere(client, momentUuid, (m) => bumpComments(m, -1));
    },
  });
}

// ---------------------------------------------------------------------------
// Athletes: profile, follow, lists, block, report
// ---------------------------------------------------------------------------

export function useAthlete(username: string) {
  return useQuery({
    queryKey: queryKeys.athlete(username),
    queryFn: () => fetchPublicAthlete(username),
    enabled: !!username,
  });
}

export function useAthleteMoments(username: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.athleteMoments(username),
    queryFn: ({ pageParam }) => fetchAthleteMoments(username, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.meta.next_cursor ?? undefined,
    enabled: !!username,
  });
}

export function useFollow(username: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (follow: boolean) => {
      await ensureOnline();
      return setFollow(username, follow);
    },
    onMutate: (follow) => {
      haptics.light();
      const previous = client.getQueryData<PublicAthlete>(queryKeys.athlete(username));
      if (previous) {
        const next = toggleFollowState(
          { is_following: previous.viewer.is_following, followers_count: previous.stats.followers, following_count: previous.stats.following },
          follow,
        );
        client.setQueryData<PublicAthlete>(queryKeys.athlete(username), {
          ...previous,
          viewer: { ...previous.viewer, is_following: next.is_following },
          stats: { ...previous.stats, followers: next.followers_count },
        });
      }
      return { previous };
    },
    onError: (_error, _follow, context) => {
      if (context?.previous) client.setQueryData(queryKeys.athlete(username), context.previous);
    },
    onSuccess: (state) => {
      client.setQueryData<PublicAthlete>(queryKeys.athlete(username), (data) =>
        data
          ? {
              ...data,
              viewer: { ...data.viewer, is_following: state.is_following },
              stats: { ...data.stats, followers: state.followers_count, following: state.following_count },
            }
          : data,
      );
      client.invalidateQueries({ queryKey: queryKeys.feed('following') });
      client.invalidateQueries({ queryKey: queryKeys.explore });
      client.invalidateQueries({ queryKey: queryKeys.followers(username) });
      client.invalidateQueries({ queryKey: queryKeys.profile });
      client.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'following' || q.queryKey[0] === 'followers' });
    },
  });
}

export function useConnections(username: string, kind: ConnectionKind) {
  return useInfiniteQuery({
    queryKey: kind === 'followers' ? queryKeys.followers(username) : queryKeys.following(username),
    queryFn: ({ pageParam }) => fetchConnections(username, kind, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.current_page < last.meta.last_page ? last.meta.current_page + 1 : undefined),
    enabled: !!username,
  });
}

export function useBlock(username: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (block: boolean) => {
      await ensureOnline();
      await setBlock(username, block);
      return block;
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: queryKeys.athlete(username) });
      client.invalidateQueries({ queryKey: queryKeys.feedAll });
      client.invalidateQueries({ queryKey: queryKeys.explore });
      client.invalidateQueries({ queryKey: queryKeys.blocks });
    },
  });
}

export function useBlocks() {
  return useInfiniteQuery({
    queryKey: queryKeys.blocks,
    queryFn: ({ pageParam }) => fetchBlocks(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.current_page < last.meta.last_page ? last.meta.current_page + 1 : undefined),
  });
}

export function useReport() {
  return useMutation({
    mutationFn: async (input: Parameters<typeof report>[0]) => {
      await ensureOnline();
      await report(input);
    },
  });
}
