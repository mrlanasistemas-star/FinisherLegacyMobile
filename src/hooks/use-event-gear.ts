import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { addEventGear, fetchEventGear, removeEventGear } from '@/api/eventGear';

export function useEventGear(participantId: number | null) {
  return useQuery({
    queryKey: ['me', 'events', participantId, 'gear'],
    queryFn: () => fetchEventGear(participantId as number),
    enabled: participantId !== null,
  });
}

/** See the note on `useUploadEventMedia` in use-event-media.ts — same reasoning for accepting `null`. */
export function useAddEventGear(participantId: number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ athleteOwnedProductUuid, notes }: { athleteOwnedProductUuid: string; notes?: string }) =>
      addEventGear(participantId as number, athleteOwnedProductUuid, notes),
    // Same `['me','events']` broad-prefix fix as use-event-media.ts — the
    // "My Events" list row shows `gear_count`, which a narrower
    // invalidation never touched.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'events'] });
    },
  });
}

export function useRemoveEventGear(participantId: number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (gearUuid: string) => removeEventGear(participantId as number, gearUuid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'events'] });
    },
  });
}
