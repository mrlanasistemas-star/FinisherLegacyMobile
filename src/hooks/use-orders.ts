import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { fetchOrder, fetchOrders } from '@/api/orders';
import { queryKeys } from '@/hooks/query-keys';
import { isAwaitingSettlement, settlementPollInterval } from '@/payments/payment-flow';

export function useOrders() {
  return useInfiniteQuery({
    queryKey: queryKeys.orders,
    queryFn: ({ pageParam }) => fetchOrders(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.current_page < last.meta.last_page ? last.meta.current_page + 1 : undefined),
  });
}

interface UseOrderOptions {
  /** Default true. */
  enabled?: boolean;
  /**
   * Keep polling while the server reports the payment as `processing` —
   * the webhook settles it; the app only listens, never decides.
   */
  watchSettlement?: boolean;
}

export function useOrder(uuid: string, { enabled = true, watchSettlement = false }: UseOrderOptions = {}) {
  const [startedAt] = useState(() => Date.now());

  return useQuery({
    queryKey: queryKeys.order(uuid),
    queryFn: () => fetchOrder(uuid),
    enabled: !!uuid && enabled,
    refetchInterval: (query) => {
      const order = query.state.data;
      if (!watchSettlement || !order || !isAwaitingSettlement(order)) return false;
      return settlementPollInterval(Date.now() - startedAt);
    },
  });
}
