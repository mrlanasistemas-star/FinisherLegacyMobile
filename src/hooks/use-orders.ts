import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { fetchOrder, fetchOrders } from '@/api/orders';

export function useOrders() {
  return useInfiniteQuery({
    queryKey: ['orders'],
    queryFn: ({ pageParam }) => fetchOrders(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => (lastPage.hasMore ? allPages.length + 1 : undefined),
  });
}

export function useOrder(uuid: string) {
  return useQuery({
    queryKey: ['orders', uuid],
    queryFn: () => fetchOrder(uuid),
    enabled: !!uuid,
  });
}
