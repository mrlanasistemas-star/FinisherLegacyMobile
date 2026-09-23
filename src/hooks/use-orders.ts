import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { fetchOrder, fetchOrders } from '@/api/orders';
import { queryKeys } from '@/hooks/query-keys';

export function useOrders() {
  return useInfiniteQuery({
    queryKey: queryKeys.orders,
    queryFn: ({ pageParam }) => fetchOrders(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.current_page < last.meta.last_page ? last.meta.current_page + 1 : undefined),
  });
}

export function useOrder(uuid: string) {
  return useQuery({
    queryKey: queryKeys.order(uuid),
    queryFn: () => fetchOrder(uuid),
    enabled: !!uuid,
  });
}
