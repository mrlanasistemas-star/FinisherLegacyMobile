import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  acceptFamilyInvitation,
  acceptFamilyInvite,
  declineFamilyInvitation,
  declineFamilyInvite,
  fetchFamily,
  fetchFollowing,
  fetchFollowingSnapshot,
  fetchPublicLiveSnapshot,
  fetchSharingOverview,
  inviteFamily,
  previewFamilyInvite,
  removeFamilyLink,
  revokeSessionShare,
  shareTrackingSession,
  stopSharingSession,
  updateFamilyLabel,
  type SharePayload,
} from '@/api/family';

/** Live views refresh this often (the server also throttles `live-view`). */
const LIVE_REFRESH_MS = 20_000;

const keys = {
  family: ['family'] as const,
  following: ['family', 'following'] as const,
  sharing: ['family', 'sharing'] as const,
};

/** 404/410 mean "no longer available" — never retry those. */
function retryUnlessGone(count: number, error: unknown): boolean {
  const status = (error as { status?: number }).status;
  return status !== 404 && status !== 410 && status !== 403 && count < 2;
}

export function useFamily() {
  return useQuery({ queryKey: keys.family, queryFn: fetchFamily });
}

export function useFollowing() {
  return useQuery({ queryKey: keys.following, queryFn: fetchFollowing, refetchInterval: 60_000 });
}

/** A share I receive. Stops polling as soon as it is gone (404/410). */
export function useFollowingSnapshot(shareUuid: string | null) {
  return useQuery({
    queryKey: [...keys.following, shareUuid],
    queryFn: () => fetchFollowingSnapshot(shareUuid as string),
    enabled: !!shareUuid,
    retry: retryUnlessGone,
    refetchInterval: (query) => (query.state.error ? false : LIVE_REFRESH_MS),
  });
}

/** A public share link opened in the app. */
export function usePublicLiveSnapshot(token: string | null) {
  return useQuery({
    queryKey: ['live', token],
    queryFn: () => fetchPublicLiveSnapshot(token as string),
    enabled: !!token,
    retry: retryUnlessGone,
    refetchInterval: (query) => (query.state.error ? false : LIVE_REFRESH_MS),
  });
}

export function useSharingOverview(refetchWhileOpen = true) {
  return useQuery({ queryKey: keys.sharing, queryFn: fetchSharingOverview, refetchInterval: refetchWhileOpen ? 30_000 : false });
}

export function useFamilyInvitePreview(token: string | null) {
  return useQuery({
    queryKey: ['family', 'invite', token],
    queryFn: () => previewFamilyInvite(token as string),
    enabled: !!token,
    retry: retryUnlessGone,
  });
}

/** Every family mutation refreshes the whole family + sharing state. */
function useFamilyMutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () => queryClient.invalidateQueries({ queryKey: keys.family }),
  });
}

export const useInviteFamily = () => useFamilyMutation(inviteFamily);
export const useUpdateFamilyLabel = () => useFamilyMutation(({ uuid, label }: { uuid: string; label: string | null }) => updateFamilyLabel(uuid, label));
export const useRemoveFamilyLink = () => useFamilyMutation(removeFamilyLink);
export const useAcceptFamilyInvitation = () => useFamilyMutation(acceptFamilyInvitation);
export const useDeclineFamilyInvitation = () => useFamilyMutation(declineFamilyInvitation);
export const useAcceptFamilyInvite = () => useFamilyMutation(acceptFamilyInvite);
export const useDeclineFamilyInvite = () => useFamilyMutation(declineFamilyInvite);

export const useShareTrackingSession = () =>
  useFamilyMutation(({ sessionUuid, payload }: { sessionUuid: string; payload: SharePayload }) => shareTrackingSession(sessionUuid, payload));
export const useStopSharingSession = () => useFamilyMutation(stopSharingSession);
export const useRevokeSessionShare = () =>
  useFamilyMutation(async (shareUuid: string) => {
    try {
      await revokeSessionShare(shareUuid);
    } catch (error) {
      // Already gone server-side → nothing left to revoke.
      if ((error as { status?: number }).status !== 404) throw error;
    }
  });
