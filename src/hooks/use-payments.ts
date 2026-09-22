import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';

import { createOnlinePayment } from '@/api/payments';
import { uuidv4 } from '@/utils/uuid';

export function useCreateOnlinePayment(orderUuid: string) {
  const idempotencyKeyRef = useRef<string | null>(null);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = uuidv4();
      }
      return createOnlinePayment(orderUuid, idempotencyKeyRef.current);
    },
    // Broad `['orders']` prefix, not just this order's detail key — it also
    // matches `['orders']` (the list), which shows a payment_status badge
    // per row that would otherwise go stale (same class of bug fixed in
    // use-event-media.ts/use-event-gear.ts during this hardening pass).
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      idempotencyKeyRef.current = null;
    },
  });
}
