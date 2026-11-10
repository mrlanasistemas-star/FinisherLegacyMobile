import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import { confirmActivation, failActivation, startActivation } from '@/api/activation';
import { useAuthStore } from '@/stores/authStore';
import { haptics } from '@/utils/haptics';

import { confirmPending, pruneStalePending, runActivation, type ActivationDeps, type ActivationOutcome, type ActivationRequest, type SessionProgress } from './activation-session';
import { nativeNfcDriver } from './nfc-driver';
import { securePendingActivationStore } from './pending-activation';
import { resolveWebOrigin } from './url-policy';

export const webOrigin = resolveWebOrigin(process.env.EXPO_PUBLIC_WEB_URL);

/** Production wiring of the activation session (real driver, API, SecureStore). */
export function useActivationDeps(onProgress?: (p: SessionProgress) => void): ActivationDeps {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const progressRef = useRef(onProgress);
  useEffect(() => {
    progressRef.current = onProgress;
  }, [onProgress]);

  return useMemo<ActivationDeps>(
    () => ({
      driver: nativeNfcDriver(),
      api: { start: startActivation, confirm: confirmActivation, fail: failActivation },
      pending: securePendingActivationStore,
      origin: webOrigin,
      userId,
      onProgress: (p) => {
        if (p === 'detected') haptics.light();
        progressRef.current?.(p);
      },
    }),
    [userId],
  );
}

function hapticFor(outcome: ActivationOutcome) {
  if (outcome.type === 'activated') haptics.success();
  else if (outcome.type === 'failed' && outcome.failure.kind === 'cancelled') return;
  else if (outcome.type === 'failed') haptics.error();
  else haptics.warning();
}

export function useActivationRunner(onProgress?: (p: SessionProgress) => void) {
  const deps = useActivationDeps(onProgress);
  const queryClient = useQueryClient();

  const finish = useCallback(
    (outcome: ActivationOutcome) => {
      hapticFor(outcome);
      if (outcome.type === 'activated') queryClient.invalidateQueries().catch(() => {});
      return outcome;
    },
    [queryClient],
  );

  const run = useCallback(async (request: ActivationRequest) => finish(await runActivation(deps, request)), [deps, finish]);
  const retryConfirm = useCallback(async () => {
    const outcome = await confirmPending(deps);
    return outcome ? finish(outcome) : null;
  }, [deps, finish]);

  return { run, retryConfirm, deps };
}

/**
 * Silent crash recovery: if a previous run wrote and verified a chip but
 * never reached `confirm`, confirm it now. Mount once near the root (it is
 * also run by the activation screen itself). Never shows UI on its own.
 */
export function usePendingActivationRecovery() {
  const status = useAuthStore((s) => s.status);
  const deps = useActivationDeps();
  const ran = useRef(false);

  useEffect(() => {
    if (status !== 'authenticated' || ran.current) return;
    ran.current = true;
    (async () => {
      await pruneStalePending(deps);
      await confirmPending(deps);
    })().catch(() => {});
  }, [status, deps]);
}
