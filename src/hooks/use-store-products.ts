import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { fetchCollection, fetchCollections } from '@/api/collections';
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

/** Published tag collections (empty on backends without the endpoint). */
export function useCollections() {
  return useQuery({
    queryKey: queryKeys.collections,
    queryFn: fetchCollections,
  });
}

export function useCollection(slug: string) {
  return useQuery({
    queryKey: queryKeys.collection(slug),
    queryFn: () => fetchCollection(slug),
    enabled: !!slug,
  });
}
