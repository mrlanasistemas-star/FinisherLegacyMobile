/**
 * Optional content PIN ("NIP") — `/api/v1/me/pin/*` (backend
 * App\Services\Privacy\ContentPin). The PIN only ever travels in a request
 * body over TLS: it is never stored, logged or cached on the phone. A
 * successful unlock returns a short-lived grant that lives in memory only
 * (src/stores/contentPinStore.ts) and goes back as `X-Content-Unlock`.
 */

import { apiClient } from '@/api/client';
import { toAppError } from '@/api/errors';
import type { ApiSuccessEnvelope } from '@/types/api';

export const CONTENT_UNLOCK_HEADER = 'X-Content-Unlock';

export interface ContentPinStatus {
  enabled: boolean;
  unlocked: boolean;
  locked_until: string | null;
  retry_after: number | null;
  failed_attempts: number;
  remaining_attempts: number;
  max_attempts: number;
  min_length: number;
  max_length: number;
  grant_ttl_seconds: number;
  set_at: string | null;
  protected_counts: { stories: number; moments: number; media: number };
  recovery: { password: boolean; email_code: boolean };
}

export interface ContentUnlockGrant {
  unlock_token: string;
  expires_at: string;
  expires_in: number;
}

export type ProtectableType = 'story' | 'moment' | 'media';

async function call<T>(fn: () => Promise<{ data: ApiSuccessEnvelope<T> }>): Promise<T> {
  try {
    const { data } = await fn();
    return data.data;
  } catch (error) {
    throw toAppError(error);
  }
}

export const getContentPinStatus = () => call<ContentPinStatus>(() => apiClient.get('me/pin'));

export const enableContentPin = (pin: string, pinConfirmation: string) =>
  call<ContentPinStatus>(() => apiClient.post('me/pin', { pin, pin_confirmation: pinConfirmation }));

export const changeContentPin = (currentPin: string, pin: string, pinConfirmation: string) =>
  call<ContentPinStatus>(() => apiClient.put('me/pin', { current_pin: currentPin, pin, pin_confirmation: pinConfirmation }));

/** Re-auth with the PIN or the account password. Items stay private. */
export const disableContentPin = (input: { pin: string } | { password: string }) =>
  call<ContentPinStatus>(() => apiClient.delete('me/pin', { data: input }));

export const unlockContent = (pin: string) => call<ContentUnlockGrant>(() => apiClient.post('me/pin/unlock', { pin }));

/** Revokes the grant this request carries (the interceptor adds it). */
export const lockContent = () => call<{ locked: boolean }>(() => apiClient.post('me/pin/lock'));

export const sendContentPinRecoveryCode = () => call<{ sent: boolean }>(() => apiClient.post('me/pin/recovery-code'));

export const resetContentPin = (input: ({ password: string } | { code: string }) & { pin: string; pin_confirmation: string }) =>
  call<ContentPinStatus>(() => apiClient.post('me/pin/reset', input));

/** Protecting needs no unlock; removing the protection does (423 otherwise). */
export const setItemPinProtection = (type: ProtectableType, id: string, isProtected: boolean) =>
  call<{ type: ProtectableType; id: string; pin_protected: boolean }>(() =>
    apiClient.put('me/pin/items', { type, id, protected: isProtected }),
  );
