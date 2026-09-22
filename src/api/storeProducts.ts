import { apiClient } from '@/api/client';
import { toAppError } from '@/api/errors';
import type { FlatMetaPaginatedResponse } from '@/types/api';
import type { ProductDetail, ProductSummary } from '@/types/models';

export interface FetchProductsParams {
  page?: number;
  category?: string;
  type?: string;
}

export async function fetchProducts(
  params: FetchProductsParams = {},
): Promise<{ rows: ProductSummary[]; page: number; lastPage: number; total: number }> {
  try {
    const { data } = await apiClient.get<FlatMetaPaginatedResponse<ProductSummary>>('store/products', { params });
    return { rows: data.data, page: data.meta.current_page, lastPage: data.meta.last_page, total: data.meta.total };
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
