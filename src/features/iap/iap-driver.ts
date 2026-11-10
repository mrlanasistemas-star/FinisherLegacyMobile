/**
 * Thin wrapper over `expo-iap` (StoreKit 2 on iOS, Google Play Billing on
 * Android) — the only file that touches the native module. Everything
 * above it (iap-service, purchase-flow, the screens) talks to this
 * interface, which is what the unit tests fake.
 *
 * The library throws at import time when its native module is missing
 * (Expo Go, a dev client built before expo-iap was added, web), so it is
 * required lazily and the failure becomes `isAvailable() === false`; the
 * UI then hides "Ampliar espacio" instead of showing a red screen. Same
 * pattern as features/nfc/nfc-driver.ts.
 *
 * Photo expansions are CONSUMABLES: `finish()` consumes (Android) /
 * finishes (iOS) so the same pack can be bought again for another story.
 */

import type * as ExpoIap from 'expo-iap';
import { Platform } from 'react-native';

import { t } from '@/i18n';

export type StorePlatform = 'ios' | 'android';

export interface IapProduct {
  id: string;
  title: string;
  description: string;
  /** Localized, formatted by the store (e.g. "$99.00 MXN"). Never computed by us. */
  displayPrice: string;
  currency: string | null;
  /** Price in micros as the store SDK reports it (informative for the backend). */
  priceAmountMicros: number | null;
}

export interface IapPurchase {
  productId: string;
  platform: StorePlatform;
  /** iOS transaction id (StoreKit 2) / Android Play orderId when present. */
  transactionId: string | null;
  /** Android purchase token / iOS JWS representation. */
  purchaseToken: string | null;
  state: 'purchased' | 'pending' | 'unknown';
  /** The library object, needed to finish the transaction. */
  raw: unknown;
}

export type IapErrorKind = 'cancelled' | 'pending' | 'already_owned' | 'network' | 'unavailable' | 'unknown';

export interface IapStoreError {
  kind: IapErrorKind;
  code: string | null;
  message: string;
  productId: string | null;
}

export interface IapDriver {
  readonly platform: StorePlatform | null;
  /** False when the native module isn't in this binary. */
  isAvailable(): boolean;
  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
  fetchProduct(sku: string): Promise<IapProduct | null>;
  /** Starts the store sheet. The outcome arrives through onPurchase / onError. */
  requestPurchase(sku: string, accountToken: string | null): Promise<void>;
  onPurchase(listener: (purchase: IapPurchase) => void): () => void;
  onError(listener: (error: IapStoreError) => void): () => void;
  /** Consumes / finishes. Call ONLY after the backend granted the purchase. */
  finish(purchase: IapPurchase): Promise<void>;
  /** Unfinished / unconsumed purchases still held by the store. */
  unfinished(): Promise<IapPurchase[]>;
  /** Re-syncs with the store (iOS AppStore.sync — may prompt for the Apple ID password). */
  sync(): Promise<void>;
}

type Module = typeof ExpoIap;

let cached: { module: Module | null } | null = null;

function loadModule(): Module | null {
  if (cached) return cached.module;
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    cached = { module: null };
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo-iap') as Module;
    cached = { module: typeof mod?.initConnection === 'function' ? mod : null };
  } catch {
    cached = { module: null };
  }
  return cached.module;
}

const PENDING_CODES = new Set(['pending', 'deferred-payment']);
const NETWORK_CODES = new Set(['network-error', 'service-disconnected', 'service-timeout', 'connection-closed', 'remote-error', 'init-connection', 'not-prepared']);
const UNAVAILABLE_CODES = new Set(['iap-not-available', 'billing-unavailable', 'feature-not-supported', 'item-unavailable', 'sku-not-found']);

export function classifyStoreError(error: unknown): IapStoreError {
  const record = (error && typeof error === 'object' ? error : {}) as { code?: unknown; message?: unknown; productId?: unknown };
  const code = typeof record.code === 'string' ? record.code : null;
  const kind: IapErrorKind =
    code === 'user-cancelled'
      ? 'cancelled'
      : code !== null && PENDING_CODES.has(code)
        ? 'pending'
        : code === 'already-owned'
          ? 'already_owned'
          : code !== null && NETWORK_CODES.has(code)
            ? 'network'
            : code !== null && UNAVAILABLE_CODES.has(code)
              ? 'unavailable'
              : 'unknown';
  return {
    kind,
    code,
    message: typeof record.message === 'string' ? record.message : t('Error de la tienda'),
    productId: typeof record.productId === 'string' ? record.productId : null,
  };
}

function toPurchase(raw: unknown, platform: StorePlatform): IapPurchase | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as { productId?: unknown; id?: unknown; transactionId?: unknown; purchaseToken?: unknown; purchaseState?: unknown };
  if (typeof p.productId !== 'string') return null;
  const transactionId = typeof p.transactionId === 'string' && p.transactionId !== '' ? p.transactionId : typeof p.id === 'string' && platform === 'ios' ? p.id : null;
  const state = p.purchaseState === 'purchased' || p.purchaseState === 'pending' ? p.purchaseState : 'unknown';
  return {
    productId: p.productId,
    platform,
    transactionId,
    purchaseToken: typeof p.purchaseToken === 'string' && p.purchaseToken !== '' ? p.purchaseToken : null,
    // iOS StoreKit 2 only delivers verified, completed transactions here.
    state: platform === 'ios' && state === 'unknown' ? 'purchased' : state,
    raw,
  };
}

function toProduct(raw: unknown): IapProduct | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as { id?: unknown; title?: unknown; displayName?: unknown; description?: unknown; displayPrice?: unknown; currency?: unknown; price?: unknown };
  if (typeof p.id !== 'string' || typeof p.displayPrice !== 'string' || p.displayPrice === '') return null;
  return {
    id: p.id,
    title: typeof p.displayName === 'string' && p.displayName ? p.displayName : typeof p.title === 'string' ? p.title : '',
    description: typeof p.description === 'string' ? p.description : '',
    displayPrice: p.displayPrice,
    currency: typeof p.currency === 'string' && p.currency ? p.currency : null,
    priceAmountMicros: typeof p.price === 'number' && Number.isFinite(p.price) ? Math.round(p.price * 1_000_000) : null,
  };
}

export function createExpoIapDriver(): IapDriver {
  const platform: StorePlatform | null = Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : null;

  function mod(): Module {
    const m = loadModule();
    if (!m) throw Object.assign(new Error('IAP no disponible'), { code: 'iap-not-available' });
    return m;
  }

  return {
    platform,
    isAvailable: () => loadModule() !== null,

    async connect() {
      try {
        return Boolean(await mod().initConnection());
      } catch {
        return false;
      }
    },

    async disconnect() {
      try {
        await loadModule()?.endConnection();
      } catch {
        // Nothing to do.
      }
    },

    async fetchProduct(sku) {
      const result = await mod().fetchProducts({ skus: [sku], type: 'in-app' });
      const list = Array.isArray(result) ? result : [];
      return list.map(toProduct).find((p): p is IapProduct => p !== null && p.id === sku) ?? null;
    },

    async requestPurchase(sku, accountToken) {
      await mod().requestPurchase({
        type: 'in-app',
        request: {
          apple: { sku, ...(accountToken ? { appAccountToken: accountToken } : {}) },
          google: { skus: [sku], ...(accountToken ? { obfuscatedAccountId: accountToken } : {}) },
        },
      });
    },

    onPurchase(listener) {
      const m = loadModule();
      if (!m || !platform) return () => {};
      const sub = m.purchaseUpdatedListener((raw) => {
        const purchase = toPurchase(raw, platform);
        if (purchase) listener(purchase);
      });
      return () => sub.remove();
    },

    onError(listener) {
      const m = loadModule();
      if (!m) return () => {};
      const sub = m.purchaseErrorListener((raw) => listener(classifyStoreError(raw)));
      return () => sub.remove();
    },

    async finish(purchase) {
      await mod().finishTransaction({ purchase: purchase.raw as ExpoIap.Purchase, isConsumable: true });
    },

    async unfinished() {
      if (!platform) return [];
      const list = await mod().getAvailablePurchases({ onlyIncludeActiveItemsIOS: false, alsoPublishToEventListenerIOS: false });
      return (Array.isArray(list) ? list : []).map((raw) => toPurchase(raw, platform)).filter((p): p is IapPurchase => p !== null);
    },

    async sync() {
      await mod().restorePurchases();
    },
  };
}
