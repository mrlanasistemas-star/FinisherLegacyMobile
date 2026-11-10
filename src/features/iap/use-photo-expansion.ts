/**
 * React glue for "Ampliar espacio" on one Legacy story: the story's photo
 * quota (always from the backend, never hardcoded), the store product the
 * backend offers for it (price localized by the store SDK) and the
 * purchase / restore actions driven by purchase-flow's state machine.
 *
 * Also `useIapRecovery()` — mounted once at the app root: at start it
 * credits any unfinished store transaction (app killed mid-purchase,
 * Ask to Buy approved later, Android pending paid) and keeps listening.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useReducer, useRef } from 'react';

import { getIapOffer, getMyStories, getStory, getStoryQuota, type IapKind } from '@/api/iap';
import { useAuthStore } from '@/stores/authStore';
import { showToast } from '@/stores/toastStore';

import { getIapService } from './iap-service';
import { initialPurchaseState, MESSAGES, purchaseReducer, type PurchaseOutcome } from './purchase-flow';

/** Not persisted (root `iap` is not in the query persister allowlist). */
export const iapKeys = {
  all: ['iap'] as const,
  stories: ['iap', 'stories'] as const,
  story: (publicId: string) => ['iap', 'story', publicId] as const,
  quota: (publicId: string) => ['iap', 'quota', publicId] as const,
  offer: (publicId: string, platform: string, kind: IapKind = 'photos') => ['iap', 'offer', publicId, platform, kind] as const,
};

export function useMyStories() {
  return useQuery({ queryKey: iapKeys.stories, queryFn: getMyStories, staleTime: 60_000 });
}

export function useStory(publicId: string) {
  return useQuery({ queryKey: iapKeys.story(publicId), queryFn: () => getStory(publicId), enabled: publicId !== '' });
}

export function useStoryQuota(publicId: string) {
  return useQuery({ queryKey: iapKeys.quota(publicId), queryFn: () => getStoryQuota(publicId), enabled: publicId !== '' });
}

function grantedCount(outcomes: PurchaseOutcome[]): number {
  return outcomes.filter((o) => o.status === 'granted').length;
}

/** The story editor's media query (features/stories/use-stories.ts › storyKeys.media). */
const storyMediaKey = (publicId: string) => ['stories', 'media', publicId] as const;

export interface ExpansionPack {
  name: string;
  description: string | null;
  /** Units the pack adds to its kind (photos, videos or voice messages); null when unknown. */
  amount: number | null;
  /** Same as `amount` — kept for the photo-only call sites. */
  photos: number | null;
  billingPeriod: 'one_time' | 'semiannual' | 'annual' | null;
}

/**
 * @param kind    What to expand (the backend offers one pack per kind).
 * @param enabled False skips the offer request (e.g. the kind cannot be expanded).
 */
export function usePhotoExpansion(storyPublicId: string, kind: IapKind = 'photos', enabled = true) {
  const service = getIapService();
  const platform = service.platform;
  const available = service.isAvailable();
  const queryClient = useQueryClient();
  const [state, dispatch] = useReducer(purchaseReducer, initialPurchaseState);

  const offer = useQuery({
    queryKey: iapKeys.offer(storyPublicId, platform ?? 'none', kind),
    queryFn: () => getIapOffer(storyPublicId, platform as 'ios' | 'android', kind),
    enabled: enabled && available && platform !== null && storyPublicId !== '',
    staleTime: 5 * 60_000,
  });

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: iapKeys.quota(storyPublicId) });
    void queryClient.invalidateQueries({ queryKey: ['iap', 'offer', storyPublicId] });
    void queryClient.invalidateQueries({ queryKey: iapKeys.stories });
    void queryClient.invalidateQueries({ queryKey: storyMediaKey(storyPublicId) });
  }

  const productId = offer.data?.product_id ?? null;
  const offerAvailable = offer.data?.available ?? false;
  const offerReason = offer.data?.reason ?? null;

  // Load the store product once the backend told us which one.
  useEffect(() => {
    if (!available) {
      dispatch({ type: 'UNAVAILABLE', reason: 'no_module' });
      return;
    }
    if (!enabled) {
      dispatch({ type: 'UNAVAILABLE', reason: 'no_product' });
      return;
    }
    if (offer.isPending) return;
    if (offer.isError) {
      dispatch({ type: 'UNAVAILABLE', reason: 'store_error' });
      return;
    }
    if (!offerAvailable || !productId) {
      dispatch({ type: 'UNAVAILABLE', reason: offerReason === 'not_configured' ? 'not_configured' : 'no_product' });
      return;
    }

    let alive = true;
    dispatch({ type: 'LOAD' });
    service
      .loadProduct(productId)
      .then((product) => {
        if (!alive) return;
        dispatch(product ? { type: 'LOADED', product } : { type: 'UNAVAILABLE', reason: 'no_product' });
      })
      .catch(() => alive && dispatch({ type: 'UNAVAILABLE', reason: 'store_error' }));
    return () => {
      alive = false;
    };
  }, [available, enabled, service, offer.isPending, offer.isError, offerAvailable, offerReason, productId]);

  async function buy() {
    if (!state.product || !offer.data) return;
    dispatch({ type: 'BUY' });
    const result = await service.buy({
      product: state.product,
      storyPublicId,
      accountToken: offer.data.account_token,
      onVerifying: () => dispatch({ type: 'STORE_PURCHASED' }),
    });

    if (result.kind === 'store_failed') {
      dispatch({ type: 'STORE_FAILED', error: result.error });
      // A previous purchase of this pack was never consumed: credit it now.
      if (result.error.kind === 'already_owned' && grantedCount(await service.recover()) > 0) refresh();
      return;
    }

    dispatch({ type: 'OUTCOME', outcome: result.outcome });
    if (result.outcome.status === 'granted') refresh();
  }

  async function restore() {
    dispatch({ type: 'RESTORE' });
    const outcomes = await service.restore();
    const granted = grantedCount(outcomes);
    const pending = outcomes.find((o) => o.status !== 'granted');
    dispatch({ type: 'RESTORED', granted, message: granted > 0 ? MESSAGES.granted : (pending?.message ?? MESSAGES.restoredNone) });
    refresh();
  }

  function dismiss() {
    dispatch({ type: 'DISMISS' });
  }

  const rawPack = offer.data?.pack ?? null;
  const rawAmount = rawPack ? (rawPack.units ?? rawPack[kind] ?? rawPack.quantity ?? null) : null;
  const amount = rawAmount && rawAmount > 0 ? rawAmount : null;
  const pack: ExpansionPack | null = rawPack
    ? {
        name: rawPack.name,
        description: rawPack.description,
        amount,
        photos: amount,
        billingPeriod: rawPack.billing_period ?? offer.data?.billing_period ?? null,
      }
    : null;

  return {
    state,
    /** False → hide every purchase control (no native module, not configured, nothing on sale). */
    canOffer: state.phase !== 'unavailable' && state.phase !== 'idle',
    pack,
    buy,
    restore,
    dismiss,
  };
}

/** Root-level: retry unfinished store transactions at app start and keep the listener alive. */
export function useIapRecovery() {
  const status = useAuthStore((s) => s.status);
  const queryClient = useQueryClient();
  const ran = useRef(false);

  useEffect(() => {
    if (status !== 'authenticated') return;
    const service = getIapService();
    if (!service.isAvailable()) return;

    const off = service.subscribe((outcome) => {
      if (outcome.status !== 'granted') return;
      void queryClient.invalidateQueries({ queryKey: iapKeys.all });
    });

    if (!ran.current) {
      ran.current = true;
      service
        .recover()
        .then((outcomes) => {
          if (grantedCount(outcomes) > 0) showToast('Aplicamos una compra pendiente: tu recuerdo tiene más espacio para fotos.', 'success');
        })
        .catch(() => {});
    }

    return off;
  }, [status, queryClient]);
}
