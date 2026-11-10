import { apiClient } from '@/api/client';
import { toAppError } from '@/api/errors';
import { parseTagDesign } from '@/schemas/store';
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

/**
 * `tag_design` is additive and drives drawn artwork: run it through the
 * zod schema so a malformed or missing one is `null` (black-and-gold
 * fallback), never a crash inside a grid card.
 */
export function normalizeProduct<T extends { tag_design?: unknown }>(product: T): T {
  return { ...product, tag_design: parseTagDesign(product.tag_design) };
}

function normalizeDetail(product: ProductDetail): ProductDetail {
  return {
    ...normalizeProduct(product),
    variants: (product.variants ?? []).map((variant) => (variant.tag_design === undefined ? variant : normalizeProduct(variant))),
  };
}

export async function fetchProducts(params: FetchProductsParams = {}): Promise<ProductsPage> {
  try {
    const { data } = await apiClient.get<FlatMetaPaginatedResponse<ProductSummary> & { meta: { categories?: ProductCategoryOption[] } }>(
      'store/products',
      { params },
    );
    return {
      rows: data.data.map(normalizeProduct),
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
    return normalizeDetail(data.data);
  } catch (error) {
    throw toAppError(error);
  }
}
