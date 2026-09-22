import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';

import { checkout } from '@/api/checkout';
import { uuidv4 } from '@/utils/uuid';

/**
 * The Idempotency-Key is generated once per checkout attempt and reused
 * across retries of that SAME attempt (a timeout/network error must never
 * create a second Order) — `resetAttempt()` only after a definitive
 * terminal state (success, or the user abandons and starts over), never
 * automatically.
 */
export function useCheckout() {
  const idempotencyKeyRef = useRef<string | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => {
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = uuidv4();
      }
      return checkout(idempotencyKeyRef.current);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      idempotencyKeyRef.current = null;
    },
  });

  return {
    ...mutation,
    resetAttempt: () => {
      idempotencyKeyRef.current = null;
    },
  };
}
