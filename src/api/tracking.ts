import { apiClient } from '@/api/client';
import { toAppError } from '@/api/errors';
import type { TrackingPoint } from '@/features/tracking/points';

/**
 * Live tracking (consolidation contract, A8). Endpoints are additive on
 * `/api/v1`; on a server that doesn't have them yet every call fails with a
 * 404 that the UI turns into "todavía no está disponible".
 */

export interface TrackingSession {
  uuid: string;
  status: 'active' | 'stopped' | (string & {});
  started_at: string;
  stopped_at?: string | null;
  source: 'mobile_gps' | (string & {});
  batch_max?: number;
}

export interface TrackingShare {
  uuid: string;
  token: string;
  /** Public web page `/live/{token}` — what family opens, no account needed. */
  url: string;
  expires_at: string | null;
}

export interface PointsAccepted {
  accepted: number;
  last_recorded_at: string | null;
}

/** One active session per participation; returns the existing active one if present. */
export async function startTrackingSession(participantId: number): Promise<TrackingSession> {
  try {
    const { data } = await apiClient.post<{ data: TrackingSession }>(`me/events/${participantId}/tracking/sessions`, { source: 'mobile_gps' });
    return data.data;
  } catch (error) {
    throw toAppError(error);
  }
}

/**
 * 1..100 points. `token` lets the background task authenticate when the app
 * was relaunched headless and the in-memory session isn't hydrated yet.
 */
export async function uploadTrackingPoints(sessionUuid: string, points: TrackingPoint[], token?: string | null): Promise<PointsAccepted> {
  try {
    const { data } = await apiClient.post<{ data: PointsAccepted }>(
      `tracking/sessions/${sessionUuid}/points`,
      { points },
      token ? { headers: { Authorization: `Bearer ${token}` }, timeout: 20000 } : { timeout: 20000 },
    );
    return data.data;
  } catch (error) {
    throw toAppError(error);
  }
}

export async function stopTrackingSession(sessionUuid: string, token?: string | null): Promise<TrackingSession> {
  try {
    const { data } = await apiClient.post<{ data: TrackingSession }>(
      `tracking/sessions/${sessionUuid}/stop`,
      {},
      token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
    );
    return data.data;
  } catch (error) {
    throw toAppError(error);
  }
}

export async function createTrackingShare(sessionUuid: string): Promise<TrackingShare> {
  try {
    const { data } = await apiClient.post<{ data: TrackingShare }>(`tracking/sessions/${sessionUuid}/shares`);
    return data.data;
  } catch (error) {
    throw toAppError(error);
  }
}

export async function revokeTrackingShare(shareUuid: string): Promise<void> {
  try {
    await apiClient.delete(`tracking/shares/${shareUuid}`);
  } catch (error) {
    throw toAppError(error);
  }
}
