/**
 * TanStack glue of the optional content PIN. Query root `content-pin` is
 * not in the persister allowlist (nothing about the PIN is ever written to
 * disk). See src/stores/contentPinStore.ts for the in-memory grant.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';

import { getContentPinStatus, lockContent, setItemPinProtection, type ProtectableType } from '@/api/contentPin';
import { AppError } from '@/api/errors';
import { useContentPinStore } from '@/stores/contentPinStore';
import { ensureOnline } from '@/utils/network';

export const contentPinKeys = {
  status: ['content-pin', 'status'] as const,
};

export function useContentPinStatus(enabled = true) {
  return useQuery({ queryKey: contentPinKeys.status, queryFn: getContentPinStatus, enabled, staleTime: 0 });
}

/** The server said "this item is locked" (423). */
export function isContentLockedError(error: unknown): boolean {
  return error instanceof AppError && error.code === 'CONTENT_LOCKED';
}

export function pinErrorCode(error: unknown): string | undefined {
  return error instanceof AppError ? error.code : undefined;
}

/** Seconds left until `until` (ms epoch), ticking every second. 0 when past/null. */
export function useCountdown(until: number | null): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (until === null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [until]);

  return until === null ? 0 : Math.max(0, Math.ceil((until - now) / 1000));
}

/** `retry_after` of a PIN_LOCKED error, or of the status, as an absolute ms epoch. */
export function lockoutUntil(error: unknown): number | null {
  if (error instanceof AppError && error.code === 'PIN_LOCKED') {
    const seconds = Number(error.details?.retry_after ?? 0);
    return seconds > 0 ? Date.now() + seconds * 1000 : null;
  }
  return null;
}

/** Human message of a PIN error (remaining attempts come in the server message). */
export function pinErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AppError) {
    return error.fieldErrors ? (Object.values(error.fieldErrors)[0]?.[0] ?? error.message) : error.message;
  }
  return fallback;
}

export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function openContentUnlock() {
  router.push('/settings/pin-unlock' as Href);
}

/** "Bloquear ahora": revoke server-side (best effort), then forget locally. */
export async function lockContentNow() {
  try {
    await lockContent();
  } catch {
    // The grant expires on its own in minutes; forgetting it locally is what matters.
  }
  useContentPinStore.getState().lock();
}

export function useSetItemProtection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { type: ProtectableType; id: string; protected: boolean }) => {
      await ensureOnline();
      return setItemPinProtection(input.type, input.id, input.protected);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries();
    },
  });
}
