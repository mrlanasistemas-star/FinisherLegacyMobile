/**
 * In-app purchase of photo space for a Legacy story (StoreKit 2 / Google
 * Play Billing — backend docs/renovacion/compras-dentro-de-app.md). The
 * backend re-verifies every transaction with Apple / Google; the app only
 * sends identifiers. Prices are never read from here: the localized price
 * always comes from the store SDK.
 */

import { z } from 'zod';

import { apiClient } from '@/api/client';
import { AppError, toAppError } from '@/api/errors';
import {
  iapOfferSchema,
  iapPurchaseResultSchema,
  quotaSchema,
  storySummarySchema,
  type IapOffer,
  type IapPurchaseResult,
  type StoryQuota,
  type StorySummary,
} from '@/schemas/iap';
import { t } from '@/i18n';

export interface SubmitPurchaseBody {
  platform: 'ios' | 'android';
  product_id: string;
  story_public_id: string;
  transaction_id?: string | null;
  purchase_token?: string | null;
  jws?: string | null;
  price_amount_micros?: number | null;
  currency?: string | null;
}

function parsed<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new AppError({ kind: 'server', message: t('Respuesta inesperada del servidor.') });
  }
  return result.data;
}

export type IapKind = 'photos' | 'videos' | 'audio';

/** `GET /iap/offer?story=&platform=&kind=` — which store product to load, plus the account token. */
export async function getIapOffer(storyPublicId: string, platform: 'ios' | 'android', kind: IapKind = 'photos'): Promise<IapOffer> {
  try {
    const { data } = await apiClient.get<{ data: unknown }>('iap/offer', { params: { story: storyPublicId, platform, kind } });
    return parsed(iapOfferSchema, data.data);
  } catch (error) {
    throw toAppError(error);
  }
}

/** `POST /iap/purchases` — 201 granted, 200 replay. Throws AppError (code IAP_*) otherwise. */
export async function submitIapPurchase(body: SubmitPurchaseBody): Promise<IapPurchaseResult> {
  try {
    const { data } = await apiClient.post<{ data: unknown }>('iap/purchases', body, { timeout: 30000 });
    return parsed(iapPurchaseResultSchema, data.data);
  } catch (error) {
    throw toAppError(error);
  }
}

/** `GET /stories/{publicId}/quota` — owner only. */
export async function getStoryQuota(storyPublicId: string): Promise<StoryQuota> {
  try {
    const { data } = await apiClient.get<{ data: unknown }>(`stories/${storyPublicId}/quota`);
    return parsed(quotaSchema, data.data);
  } catch (error) {
    throw toAppError(error);
  }
}

/** `GET /me/stories` — the caller's Legacy stories. */
export async function getMyStories(): Promise<StorySummary[]> {
  try {
    const { data } = await apiClient.get<{ data: unknown }>('me/stories');
    const rows = Array.isArray(data.data) ? data.data : [];
    return rows.flatMap((row) => {
      const result = storySummarySchema.safeParse(row);
      return result.success ? [result.data] : [];
    });
  } catch (error) {
    throw toAppError(error);
  }
}

/** `GET /stories/{publicId}` — a story the caller may see. */
export async function getStory(storyPublicId: string): Promise<StorySummary> {
  try {
    const { data } = await apiClient.get<{ data: unknown }>(`stories/${storyPublicId}`);
    return parsed(storySummarySchema, data.data);
  } catch (error) {
    throw toAppError(error);
  }
}
