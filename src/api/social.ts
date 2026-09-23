import { apiClient } from '@/api/client';
import { toAppError } from '@/api/errors';
import type { ApiSuccessEnvelope, PaginatedResponse } from '@/types/api';
import type {
  AthleteSummary,
  CreateMomentInput,
  CursorPage,
  ExplorePayload,
  FollowState,
  LegacyMoment,
  MomentComment,
  ReactionState,
  ReactionType,
  ReportReason,
  ReportTargetType,
  SearchResults,
} from '@/types/social';
import { uuidv4 } from '@/utils/uuid';

async function request<T>(fn: () => Promise<{ data: T }>): Promise<T> {
  try {
    const { data } = await fn();
    return data;
  } catch (error) {
    throw toAppError(error);
  }
}

// --- Feed / explore / search -------------------------------------------------

export type FeedScope = 'following' | 'discover';

export function fetchFeed(scope: FeedScope, cursor: string | null): Promise<CursorPage<LegacyMoment>> {
  return request(() =>
    apiClient.get<CursorPage<LegacyMoment>>('feed', { params: { scope, ...(cursor ? { cursor } : {}) } }),
  );
}

export async function fetchExplore(): Promise<ExplorePayload> {
  return (await request(() => apiClient.get<ApiSuccessEnvelope<ExplorePayload>>('explore'))).data;
}

export type SearchType = 'all' | 'athletes' | 'events' | 'products';

export async function search(q: string, type: SearchType = 'all'): Promise<SearchResults> {
  return (await request(() => apiClient.get<ApiSuccessEnvelope<SearchResults>>('search', { params: { q, type } }))).data;
}

// --- Moments -----------------------------------------------------------------

export async function fetchMoment(uuid: string): Promise<LegacyMoment> {
  return (await request(() => apiClient.get<ApiSuccessEnvelope<LegacyMoment>>(`moments/${uuid}`))).data;
}

/**
 * Multipart only when there are photos. The Idempotency-Key makes a
 * double-tap or a retried timeout publish exactly one Moment — the caller
 * keeps the same key for retries of the same draft.
 */
export async function createMoment(input: CreateMomentInput, idempotencyKey: string = uuidv4()): Promise<LegacyMoment> {
  const headers = { 'Idempotency-Key': idempotencyKey };

  if (!input.photos || input.photos.length === 0) {
    return (await request(() => apiClient.post<ApiSuccessEnvelope<LegacyMoment>>('moments', input, { headers }))).data;
  }

  const form = new FormData();
  form.append('type', input.type);
  form.append('visibility', input.visibility);
  if (input.caption) form.append('caption', input.caption);
  if (input.event_participant_id) form.append('event_participant_id', String(input.event_participant_id));
  if (input.medal_uuid) form.append('medal_uuid', input.medal_uuid);
  if (input.gear_uuid) form.append('gear_uuid', input.gear_uuid);
  input.event_media_uuids?.forEach((uuid) => form.append('event_media_uuids[]', uuid));
  if (input.metrics) {
    for (const [key, value] of Object.entries(input.metrics)) {
      if (value === undefined || value === null) continue;
      form.append(`metrics[${key}]`, typeof value === 'boolean' ? (value ? '1' : '0') : String(value));
    }
  }
  // React Native's FormData accepts {uri,name,type} file descriptors.
  input.photos.forEach((photo) => form.append('photos[]', photo as unknown as Blob));

  return (
    await request(() =>
      apiClient.post<ApiSuccessEnvelope<LegacyMoment>>('moments', form, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      }),
    )
  ).data;
}

export async function updateMoment(
  uuid: string,
  patch: { caption?: string | null; visibility?: LegacyMoment['visibility'] },
): Promise<LegacyMoment> {
  return (await request(() => apiClient.patch<ApiSuccessEnvelope<LegacyMoment>>(`moments/${uuid}`, patch))).data;
}

export async function deleteMoment(uuid: string): Promise<void> {
  await request(() => apiClient.delete(`moments/${uuid}`));
}

/** Idempotent on the server: PUT adds, DELETE removes — retries are safe. */
export async function setReaction(uuid: string, type: ReactionType, active: boolean): Promise<ReactionState> {
  const call = active
    ? () => apiClient.put<ApiSuccessEnvelope<ReactionState>>(`moments/${uuid}/reactions/${type}`)
    : () => apiClient.delete<ApiSuccessEnvelope<ReactionState>>(`moments/${uuid}/reactions/${type}`);
  return (await request(call)).data;
}

// --- Comments ----------------------------------------------------------------

export function fetchComments(uuid: string, page: number): Promise<PaginatedResponse<MomentComment>> {
  return request(() => apiClient.get<PaginatedResponse<MomentComment>>(`moments/${uuid}/comments`, { params: { page } }));
}

export async function postComment(uuid: string, body: string, idempotencyKey: string): Promise<MomentComment> {
  return (
    await request(() =>
      apiClient.post<ApiSuccessEnvelope<MomentComment>>(`moments/${uuid}/comments`, { body }, { headers: { 'Idempotency-Key': idempotencyKey } }),
    )
  ).data;
}

export async function deleteComment(commentUuid: string): Promise<void> {
  await request(() => apiClient.delete(`comments/${commentUuid}`));
}

// --- Athletes: follow / lists / moments / block ------------------------------

export async function setFollow(username: string, follow: boolean): Promise<FollowState> {
  const path = `athletes/${encodeURIComponent(username)}/follow`;
  const call = follow
    ? () => apiClient.post<ApiSuccessEnvelope<FollowState>>(path)
    : () => apiClient.delete<ApiSuccessEnvelope<FollowState>>(path);
  return (await request(call)).data;
}

export type ConnectionKind = 'followers' | 'following';

export function fetchConnections(username: string, kind: ConnectionKind, page: number): Promise<PaginatedResponse<AthleteSummary>> {
  return request(() =>
    apiClient.get<PaginatedResponse<AthleteSummary>>(`athletes/${encodeURIComponent(username)}/${kind}`, { params: { page } }),
  );
}

export function fetchAthleteMoments(username: string, cursor: string | null): Promise<CursorPage<LegacyMoment>> {
  return request(() =>
    apiClient.get<CursorPage<LegacyMoment>>(`athletes/${encodeURIComponent(username)}/moments`, {
      params: cursor ? { cursor } : {},
    }),
  );
}

export async function setBlock(username: string, block: boolean): Promise<void> {
  const path = `athletes/${encodeURIComponent(username)}/block`;
  await request(() => (block ? apiClient.post(path) : apiClient.delete(path)));
}

export function fetchBlocks(page: number): Promise<PaginatedResponse<AthleteSummary>> {
  return request(() => apiClient.get<PaginatedResponse<AthleteSummary>>('me/blocks', { params: { page } }));
}

export async function report(input: {
  target_type: ReportTargetType;
  target: string;
  reason: ReportReason;
  details?: string;
}): Promise<void> {
  await request(() => apiClient.post('reports', input));
}
