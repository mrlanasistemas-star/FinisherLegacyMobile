import { apiClient } from '@/api/client';
import { toAppError } from '@/api/errors';
import type { FlatMetaPaginatedResponse } from '@/types/api';
import type { ProductCategoryOption, ProductDetail, ProductSummary } from '@/types/models';

export interface FetchProductsParams {
  page?: number;
  /** Category slug (from `meta.categories`). */
  category?: string;
  type?: string;
  q?: string;
  sort?: 'name' | 'newest';
}

export interface ProductsPage {
  rows: ProductSummary[];
  page: number;
  lastPage: number;
  total: number;
  categories: ProductCategoryOption[];
}

export async function fetchProducts(params: FetchProductsParams = {}): Promise<ProductsPage> {
  try {
    const { data } = await apiClient.get<FlatMetaPaginatedResponse<ProductSummary> & { meta: { categories?: ProductCategoryOption[] } }>(
      'store/products',
      { params },
    );
    return {
      rows: data.data,
      page: data.meta.current_page,
      lastPage: data.meta.last_page,
      total: data.meta.total,
      categories: data.meta.categories ?? [],
    };
  } catch (error) {
    throw toAppError(error);
  }
}

export async function fetchProduct(slug: string): Promise<ProductDetail> {
  try {
    const { data } = await apiClient.get<{ data: ProductDetail }>(`store/products/${encodeURIComponent(slug)}`);
    return data.data;
  } catch (error) {
    throw toAppError(error);
  }
}
