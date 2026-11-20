import { apiClient } from '@/api/client';
import { toAppError } from '@/api/errors';

/**
 * Familia y enlaces de seguimiento — backend contract in
 * docs/renovacion/familia.md (finisherLegacy repo). A family link never
 * grants location by itself: positions only come through an explicit share
 * the athlete starts (`shareTrackingSession`), which ends with the session.
 */

export interface FamilyPerson {
  name: string;
  username: string | null;
  avatar_url: string | null;
}

export type FamilyLinkStatus = 'pending' | 'accepted' | 'declined' | 'revoked';

/** A person in MY family (I invited them). */
export interface FamilyLink {
  uuid: string;
  label: string | null;
  status: FamilyLinkStatus;
  /** `link` = invite link not opened yet; `account` = a known person. */
  kind: 'link' | 'account';
  contact: FamilyPerson | null;
  invite_expires_at: string | null;
  accepted_at: string | null;
  created_at: string | null;
  /** Only in the create response of a link invite — shown once. */
  invite_url?: string | null;
}

/** Someone who invited me / whose family I am. */
export interface FamilyMembership {
  uuid: string;
  label: string | null;
  status: FamilyLinkStatus;
  athlete: FamilyPerson;
  accepted_at: string | null;
  created_at: string | null;
  is_own?: boolean;
}

export interface FamilyOverview {
  links: FamilyLink[];
  invitations: FamilyMembership[];
  memberships: FamilyMembership[];
  following_count: number;
}

/** One live share I receive ("Siguiendo a…"). */
export interface FollowingItem {
  uuid: string;
  athlete: FamilyPerson;
  event_name: string | null;
  status: 'active' | 'paused';
  started_at: string | null;
  last_update_at: string | null;
  distance_m: number;
  expires_at: string;
  ends_with_session: boolean;
}

/** Same shape as the public `/live/{token}` snapshot. */
export interface LiveSnapshot {
  athlete: { display_name: string; avatar_url: string | null };
  event: { name: string | null; race: string | null };
  status: 'waiting' | 'active' | 'paused' | 'stopped';
  last_point: { lat: number; lng: number; recorded_at: string } | null;
  distance_m: number;
  race_distance_m: number | null;
  progress: number | null;
  battery: number | null;
  started_at: string | null;
  stopped_at: string | null;
  path: [number, number][];
  channel: string;
  expires_at: string;
}

export type ShareDuration = 'until_stop' | '2h' | '6h' | '24h';

/** An open share of one of my sessions (control screen). */
export interface SessionShare {
  uuid: string;
  audience: 'link' | 'family';
  family_link_uuid: string | null;
  label: string | null;
  contact: FamilyPerson | null;
  expires_at: string;
  ends_with_session: boolean;
  last_viewed_at: string | null;
  created_at: string | null;
}

export interface SessionSharingState {
  session: {
    uuid: string;
    event_participant_id: number;
    event_name: string | null;
    status: 'active' | 'stopped' | (string & {});
    started_at: string;
  };
  shares: SessionShare[];
}

export interface SharingOverview {
  sessions: SessionSharingState[];
  family: FamilyLink[];
}

export interface SharePayload {
  family: 'all' | 'selected' | 'none';
  family_link_ids?: string[];
  public_link?: boolean;
  duration: ShareDuration;
}

export interface ShareResult extends SessionSharingState {
  link: { uuid: string; url: string; expires_at: string } | null;
}

async function call<T>(run: () => Promise<{ data: { data: T } }>): Promise<T> {
  try {
    const { data } = await run();
    return data.data;
  } catch (error) {
    throw toAppError(error);
  }
}

export const fetchFamily = () => call(() => apiClient.get<{ data: FamilyOverview }>('family'));

export const inviteFamily = (payload: { email?: string | null; label?: string | null }) =>
  call(() => apiClient.post<{ data: FamilyLink }>('family/links', payload));

export const updateFamilyLabel = (uuid: string, label: string | null) =>
  call(() => apiClient.patch<{ data: FamilyLink }>(`family/links/${uuid}`, { label }));

export async function removeFamilyLink(uuid: string): Promise<void> {
  try {
    await apiClient.delete(`family/links/${uuid}`);
  } catch (error) {
    throw toAppError(error);
  }
}

export const acceptFamilyInvitation = (uuid: string) =>
  call(() => apiClient.post<{ data: FamilyMembership }>(`family/links/${uuid}/accept`));

export const declineFamilyInvitation = (uuid: string) =>
  call(() => apiClient.post<{ data: FamilyMembership }>(`family/links/${uuid}/decline`));

export const previewFamilyInvite = (token: string) =>
  call(() => apiClient.get<{ data: FamilyMembership }>(`family/invites/${token}`));

export const acceptFamilyInvite = (token: string) =>
  call(() => apiClient.post<{ data: FamilyMembership }>(`family/invites/${token}/accept`));

export async function declineFamilyInvite(token: string): Promise<void> {
  try {
    await apiClient.post(`family/invites/${token}/decline`);
  } catch (error) {
    throw toAppError(error);
  }
}

export const fetchFollowing = () => call(() => apiClient.get<{ data: FollowingItem[] }>('family/following'));

/** 404 = no access / revoked, 410 = it ended (stopped or time up). */
export const fetchFollowingSnapshot = (shareUuid: string) =>
  call(() => apiClient.get<{ data: LiveSnapshot }>(`family/following/${shareUuid}`));

/** Public share link opened in the app (`/live/{token}`), no session needed. */
export const fetchPublicLiveSnapshot = (token: string) => call(() => apiClient.get<{ data: LiveSnapshot }>(`live/${token}`));

export const fetchSharingOverview = () => call(() => apiClient.get<{ data: SharingOverview }>('me/tracking/sharing'));

export const shareTrackingSession = (sessionUuid: string, payload: SharePayload) =>
  call(() => apiClient.post<{ data: ShareResult }>(`tracking/sessions/${sessionUuid}/sharing`, payload));

export const stopSharingSession = (sessionUuid: string) =>
  call(() => apiClient.delete<{ data: { revoked: number } }>(`tracking/sessions/${sessionUuid}/sharing`));

export async function revokeSessionShare(shareUuid: string): Promise<void> {
  try {
    await apiClient.delete(`tracking/shares/${shareUuid}`);
  } catch (error) {
    throw toAppError(error);
  }
}
