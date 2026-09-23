import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { fetchProduct, fetchProducts, type FetchProductsParams } from '@/api/storeProducts';
import { queryKeys } from '@/hooks/query-keys';

export function useProducts(filters: Omit<FetchProductsParams, 'page'> = {}) {
  return useInfiniteQuery({
    queryKey: queryKeys.products(filters),
    queryFn: ({ pageParam }) => fetchProducts({ page: pageParam, ...filters }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.page < lastPage.lastPage ? lastPage.page + 1 : undefined),
    placeholderData: (previous) => previous,
  });
}

export function useProduct(slug: string) {
  return useQuery({
    queryKey: queryKeys.product(slug),
    queryFn: () => fetchProduct(slug),
    enabled: !!slug,
  });
}
