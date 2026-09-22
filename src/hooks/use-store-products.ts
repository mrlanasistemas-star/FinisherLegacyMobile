import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { fetchProduct, fetchProducts, type FetchProductsParams } from '@/api/storeProducts';

export function useProducts(filters: Omit<FetchProductsParams, 'page'> = {}) {
  return useInfiniteQuery({
    queryKey: ['store', 'products', filters],
    queryFn: ({ pageParam }) => fetchProducts({ page: pageParam, ...filters }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.page < lastPage.lastPage ? lastPage.page + 1 : undefined),
  });
}

export function useProduct(slug: string) {
  return useQuery({
    queryKey: ['store', 'products', slug],
    queryFn: () => fetchProduct(slug),
    enabled: !!slug,
  });
}
