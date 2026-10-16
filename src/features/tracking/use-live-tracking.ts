import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { fetchTriggeredSupportMessages, markSupportMessageConsumed } from '@/api/support';
import { createTrackingShare, revokeTrackingShare, type TrackingShare } from '@/api/tracking';
import { useEventParticipant } from '@/hooks/use-my-events';
import { useSupportSessions } from '@/hooks/use-support';
import { ensureOnline } from '@/utils/network';

import { updateTrackingRecord, useTrackingStore } from './tracking-storage';

export function useTrackingRecord() {
  return useTrackingStore((s) => s.record);
}

/** Re-renders every `intervalMs` — for the elapsed clock and "hace X s". */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function useCreateTrackingShare() {
  return useMutation({
    mutationFn: async (sessionUuid: string): Promise<TrackingShare> => {
      await ensureOnline();
      const share = await createTrackingShare(sessionUuid);
      await updateTrackingRecord((r) => (r.sessionUuid === sessionUuid ? { ...r, shares: [share, ...r.shares.filter((s) => s.uuid !== share.uuid)] } : r));
      return share;
    },
  });
}

export function useRevokeTrackingShare() {
  return useMutation({
    mutationFn: async (shareUuid: string) => {
      await ensureOnline();
      try {
        await revokeTrackingShare(shareUuid);
      } catch (error) {
        // Already gone server-side → still remove it here.
        if ((error as { status?: number }).status !== 404) throw error;
      }
      await updateTrackingRecord((r) => ({ ...r, shares: r.shares.filter((s) => s.uuid !== shareUuid) }));
    },
  });
}

/** Distance is bucketed to 100 m so the triggered-messages query doesn't refetch on every GPS fix. */
const DISTANCE_BUCKET_M = 100;

/**
 * Support messages that the athlete's team left for this race, revealed
 * by the distance actually covered (start / distance / goal triggers are
 * evaluated server-side). Linked through the participation's support
 * session; silently absent when there isn't one.
 */
export function useTrackingSupportMessages(participantId: number, distanceM: number, active: boolean) {
  const participant = useEventParticipant(participantId);
  const publicCode = participant.data?.supportSession?.public_code ?? null;
  const sessions = useSupportSessions();
  const supportSessionId = useMemo(() => {
    if (!publicCode) return null;
    for (const page of sessions.data?.pages ?? []) {
      const match = page.rows.find((row) => row.public_code === publicCode);
      if (match) return match.id;
    }
    return null;
  }, [publicCode, sessions.data]);

  const [consumed, setConsumed] = useState<number[]>([]);
  const bucket = Math.floor(distanceM / DISTANCE_BUCKET_M) * DISTANCE_BUCKET_M;

  const triggered = useQuery({
    queryKey: ['tracking', 'support-triggered', supportSessionId, bucket],
    queryFn: () => fetchTriggeredSupportMessages(supportSessionId as number, bucket, consumed),
    enabled: active && supportSessionId !== null,
    refetchInterval: active ? 60_000 : false,
    placeholderData: (previous) => previous,
  });

  const consume = useMutation({
    mutationFn: (messageId: number) => markSupportMessageConsumed(messageId),
    onMutate: (messageId) => setConsumed((ids) => [...ids, messageId]),
  });

  const messages = (triggered.data ?? []).filter((m) => !consumed.includes(m.id));
  return { supportSessionId, messages, consume: consume.mutate, eventName: participant.data?.participant.event ?? null, participant };
}
