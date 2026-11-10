import { apiClient } from '@/api/client';
import { AppError, toAppError } from '@/api/errors';
import { normalizeProduct } from '@/api/storeProducts';
import { parseCollection, parseCollections, type StoreCollection } from '@/schemas/store';
import type { ProductSummary } from '@/types/models';

export type StoreCollectionDetail = Omit<StoreCollection, 'products'> & { products: ProductSummary[] };

/**
 * Published Finisher Legacy Tag collections. An older backend without the
 * endpoint (404) reads as "no collections yet" — the store simply hides
 * the carousel instead of showing an error.
 */
export async function fetchCollections(): Promise<StoreCollection[]> {
  try {
    const { data } = await apiClient.get<{ data: unknown }>('store/collections');
    return parseCollections(data.data);
  } catch (error) {
    const appError = toAppError(error);
    if (appError.kind === 'not_found') return [];
    throw appError;
  }
}

export async function fetchCollection(slug: string): Promise<StoreCollectionDetail> {
  try {
    const { data } = await apiClient.get<{ data: unknown }>(`store/collections/${encodeURIComponent(slug)}`);
    const collection = parseCollection(data.data);
    if (!collection) throw new AppError({ kind: 'server', message: 'No pudimos leer esta colección.' });
    return { ...collection, products: (collection.products ?? []).map((row) => normalizeProduct(row as ProductSummary)) };
  } catch (error) {
    throw toAppError(error);
  }
}
