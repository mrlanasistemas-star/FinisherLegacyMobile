/**
 * Owns the store connection and its listeners for the whole app session
 * and turns store events into backend grants (purchase-flow.processPurchase).
 *
 *  - `buy()`       — one purchase started from "Ampliar espacio".
 *  - `recover()`   — unfinished transactions held by the store (app start,
 *                    after "Restaurar compras", after "already owned").
 *  - unsolicited   — a transaction the store delivers on its own (StoreKit
 *                    replays unfinished ones at launch, Ask to Buy approved
 *                    later, an Android pending purchase paid in cash) is
 *                    processed too, and `subscribe()` listeners hear about
 *                    every grant so screens refresh the quota.
 *
 * The same transaction is never processed twice at the same time (listener
 * replay + recover() at launch); the backend is idempotent anyway.
 */

import { submitIapPurchase, type SubmitPurchaseBody } from '@/api/iap';
import { t } from '@/i18n';
import type { IapPurchaseResult } from '@/schemas/iap';

import { classifyStoreError, createExpoIapDriver, type IapDriver, type IapProduct, type IapPurchase, type IapStoreError } from './iap-driver';
import { asyncPendingIntentStore, type PendingIntentStore } from './pending-intents';
import { processPurchase, type PurchaseOutcome } from './purchase-flow';

export interface IapServiceDeps {
  driver: IapDriver;
  submit: (body: SubmitPurchaseBody) => Promise<IapPurchaseResult>;
  intents: PendingIntentStore;
  now?: () => number;
}

export type BuyResult = { kind: 'outcome'; outcome: PurchaseOutcome } | { kind: 'store_failed'; error: IapStoreError };

interface ActiveBuy {
  sku: string;
  storyPublicId: string;
  product: IapProduct;
  onVerifying?: () => void;
  resolve: (result: BuyResult) => void;
}

function purchaseKey(p: IapPurchase): string {
  return `${p.platform}:${p.transactionId ?? p.purchaseToken ?? p.productId}`;
}

export class IapService {
  private connecting: Promise<boolean> | null = null;
  private unsubscribers: (() => void)[] = [];
  private active: ActiveBuy | null = null;
  private inFlight = new Map<string, Promise<PurchaseOutcome>>();
  private listeners = new Set<(outcome: PurchaseOutcome) => void>();
  private readonly now: () => number;

  constructor(private readonly deps: IapServiceDeps) {
    this.now = deps.now ?? Date.now;
  }

  get platform() {
    return this.deps.driver.platform;
  }

  isAvailable(): boolean {
    return this.deps.driver.platform !== null && this.deps.driver.isAvailable();
  }

  /** Connects once and attaches the listeners; false when the store is unreachable. */
  ensureConnected(): Promise<boolean> {
    if (!this.isAvailable()) return Promise.resolve(false);
    if (!this.connecting) {
      this.connecting = this.deps.driver.connect().then((ok) => {
        if (!ok) {
          this.connecting = null;
          return false;
        }
        this.unsubscribers.push(
          this.deps.driver.onPurchase((p) => void this.handlePurchase(p)),
          this.deps.driver.onError((e) => this.handleError(e)),
        );
        return true;
      });
    }
    return this.connecting;
  }

  async loadProduct(sku: string): Promise<IapProduct | null> {
    if (!(await this.ensureConnected())) return null;
    return this.deps.driver.fetchProduct(sku);
  }

  subscribe(listener: (outcome: PurchaseOutcome) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async buy(params: { product: IapProduct; storyPublicId: string; accountToken: string | null; onVerifying?: () => void }): Promise<BuyResult> {
    if (this.active) {
      return { kind: 'store_failed', error: { kind: 'unknown', code: 'busy', message: t('Ya hay una compra en curso.'), productId: params.product.id } };
    }
    if (!(await this.ensureConnected())) {
      return { kind: 'store_failed', error: { kind: 'network', code: 'not-connected', message: t('Sin conexión con la tienda'), productId: params.product.id } };
    }

    // Remembered BEFORE the store sheet opens: if the app dies mid-purchase,
    // recover() still knows which story to credit.
    await this.deps.intents.save({ productId: params.product.id, storyPublicId: params.storyPublicId, createdAt: this.now() });

    return new Promise<BuyResult>((resolve) => {
      this.active = { sku: params.product.id, storyPublicId: params.storyPublicId, product: params.product, onVerifying: params.onVerifying, resolve };
      this.deps.driver.requestPurchase(params.product.id, params.accountToken).catch((error: unknown) => {
        this.handleError({ ...classifyStoreError(error), productId: params.product.id });
      });
    });
  }

  /** Processes every unfinished transaction the store still holds. */
  async recover(): Promise<PurchaseOutcome[]> {
    if (!(await this.ensureConnected())) return [];
    let purchases: IapPurchase[] = [];
    try {
      purchases = await this.deps.driver.unfinished();
    } catch {
      return [];
    }
    const outcomes: PurchaseOutcome[] = [];
    for (const purchase of purchases) {
      if (purchase.state !== 'purchased') continue;
      outcomes.push(await this.process(purchase, null, null));
    }
    return outcomes;
  }

  /** "Restaurar compras": store sync (best effort) + recover(). */
  async restore(): Promise<PurchaseOutcome[]> {
    if (!(await this.ensureConnected())) return [];
    try {
      await this.deps.driver.sync();
    } catch {
      // The user may dismiss the Apple ID prompt; unfinished ones are still listed.
    }
    return this.recover();
  }

  dispose() {
    this.unsubscribers.forEach((off) => off());
    this.unsubscribers = [];
    this.connecting = null;
    void this.deps.driver.disconnect();
  }

  private async handlePurchase(purchase: IapPurchase) {
    const active = this.active;
    if (active && purchase.productId === active.sku) {
      this.active = null;
      // A pending one (Ask to Buy, cash payment) is resolved as "pending" by
      // processPurchase without calling the backend; it is granted later.
      if (purchase.state !== 'pending') active.onVerifying?.();
      active.resolve({ kind: 'outcome', outcome: await this.process(purchase, active.storyPublicId, active.product) });
      return;
    }

    if (purchase.state === 'purchased') {
      await this.process(purchase, null, null);
    }
  }

  private handleError(error: IapStoreError) {
    const active = this.active;
    if (!active || (error.productId && error.productId !== active.sku)) return;
    this.active = null;
    if (error.kind === 'cancelled') {
      void this.deps.intents.clear(active.sku);
    }
    active.resolve({ kind: 'store_failed', error });
  }

  private process(purchase: IapPurchase, storyPublicId: string | null, product: IapProduct | null): Promise<PurchaseOutcome> {
    const key = purchaseKey(purchase);
    const existing = this.inFlight.get(key);
    if (existing) return existing;

    const run = processPurchase(purchase, storyPublicId, product, {
      submit: this.deps.submit,
      finish: (p) => this.deps.driver.finish(p),
      intents: this.deps.intents,
    })
      .then((outcome) => {
        if (outcome.status === 'granted') this.listeners.forEach((l) => l(outcome));
        return outcome;
      })
      .finally(() => this.inFlight.delete(key));

    this.inFlight.set(key, run);
    return run;
  }
}

let shared: IapService | null = null;

/** The app-wide instance (real expo-iap driver, real API, AsyncStorage intents). */
export function getIapService(): IapService {
  if (!shared) {
    shared = new IapService({ driver: createExpoIapDriver(), submit: submitIapPurchase, intents: asyncPendingIntentStore });
  }
  return shared;
}
