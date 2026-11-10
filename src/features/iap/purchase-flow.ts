/**
 * Pure logic of the "Ampliar espacio" in-app purchase (no React, no native
 * module — unit tested in purchase-flow.test.ts):
 *
 *  - `purchaseReducer`: the screen's state machine
 *    idle → loading → ready → purchasing → verifying → success
 *    with the side exits unavailable / pending / cancelled / error and the
 *    "Restaurar compras" branch (restoring).
 *  - `processPurchase`: what to do with ONE store transaction. The golden
 *    rule: the store transaction is finished (consumed) ONLY after the
 *    backend verified it and granted the space — or when the backend says
 *    the purchase is definitively void (refunded / cancelled). Any network,
 *    store or configuration failure leaves it unfinished, so it is retried
 *    on the next launch / restore and the user never pays for nothing.
 */

import { AppError } from '@/api/errors';
import type { SubmitPurchaseBody } from '@/api/iap';
import type { IapPurchaseResult, StoryQuota } from '@/schemas/iap';

import type { IapProduct, IapPurchase, IapStoreError } from './iap-driver';
import type { PendingIntentStore } from './pending-intents';

/* ------------------------------------------------------------------ */
/* State machine                                                       */
/* ------------------------------------------------------------------ */

export type PurchasePhase =
  | 'idle'
  | 'loading'
  | 'unavailable'
  | 'ready'
  | 'purchasing'
  | 'verifying'
  | 'pending'
  | 'success'
  | 'cancelled'
  | 'error'
  | 'restoring';

export type UnavailableReason = 'no_module' | 'not_configured' | 'no_product' | 'store_error';

export interface PurchaseState {
  phase: PurchasePhase;
  product: IapProduct | null;
  unavailable: UnavailableReason | null;
  message: string | null;
  /** Photos added by the last grant (success screen). */
  photosAdded: number | null;
  quota: StoryQuota | null;
}

export type PurchaseEvent =
  | { type: 'LOAD' }
  | { type: 'LOADED'; product: IapProduct }
  | { type: 'UNAVAILABLE'; reason: UnavailableReason }
  | { type: 'BUY' }
  | { type: 'STORE_PURCHASED' }
  | { type: 'STORE_FAILED'; error: IapStoreError }
  | { type: 'OUTCOME'; outcome: PurchaseOutcome }
  | { type: 'RESTORE' }
  | { type: 'RESTORED'; granted: number; message: string }
  | { type: 'DISMISS' };

export const initialPurchaseState: PurchaseState = {
  phase: 'idle',
  product: null,
  unavailable: null,
  message: null,
  photosAdded: null,
  quota: null,
};

const BUYABLE: PurchasePhase[] = ['ready', 'cancelled', 'error', 'success', 'pending'];

export function canBuy(state: PurchaseState): boolean {
  return state.product !== null && BUYABLE.includes(state.phase);
}

export function isBusy(state: PurchaseState): boolean {
  return state.phase === 'purchasing' || state.phase === 'verifying' || state.phase === 'restoring' || state.phase === 'loading';
}

export function purchaseReducer(state: PurchaseState, event: PurchaseEvent): PurchaseState {
  switch (event.type) {
    case 'LOAD':
      return { ...initialPurchaseState, phase: 'loading' };
    case 'LOADED':
      return { ...state, phase: 'ready', product: event.product, unavailable: null, message: null };
    case 'UNAVAILABLE':
      return { ...state, phase: 'unavailable', product: null, unavailable: event.reason, message: null };
    case 'BUY':
      return canBuy(state) ? { ...state, phase: 'purchasing', message: null, photosAdded: null } : state;
    case 'STORE_PURCHASED':
      return state.phase === 'purchasing' || state.phase === 'pending' ? { ...state, phase: 'verifying' } : state;
    case 'STORE_FAILED': {
      if (state.phase !== 'purchasing') return state;
      const { kind } = event.error;
      if (kind === 'cancelled') return { ...state, phase: 'cancelled', message: null };
      if (kind === 'pending') return { ...state, phase: 'pending', message: MESSAGES.pending };
      return { ...state, phase: 'error', message: storeErrorMessage(event.error) };
    }
    case 'OUTCOME':
      return applyOutcome(state, event.outcome);
    case 'RESTORE':
      return isBusy(state) ? state : { ...state, phase: 'restoring', message: null };
    case 'RESTORED':
      return state.phase === 'restoring'
        ? { ...state, phase: event.granted > 0 ? 'success' : state.product ? 'ready' : 'idle', message: event.message, photosAdded: null }
        : state;
    case 'DISMISS':
      return isBusy(state) ? state : { ...state, phase: state.product ? 'ready' : state.unavailable ? 'unavailable' : 'idle', message: null };
  }
}

function applyOutcome(state: PurchaseState, outcome: PurchaseOutcome): PurchaseState {
  switch (outcome.status) {
    case 'granted':
      return { ...state, phase: 'success', message: outcome.message, photosAdded: outcome.photos, quota: outcome.quota ?? state.quota };
    case 'pending':
      return { ...state, phase: 'pending', message: outcome.message };
    case 'retry_later':
    case 'rejected':
      return { ...state, phase: 'error', message: outcome.message };
  }
}

/* ------------------------------------------------------------------ */
/* Copy                                                                */
/* ------------------------------------------------------------------ */

export const MESSAGES = {
  granted: 'Listo. Ya tienes más espacio para fotos en este recuerdo.',
  replayed: 'Esta compra ya estaba aplicada a tu recuerdo.',
  pending: 'Tu pago está pendiente de aprobación. Te daremos el espacio en cuanto la tienda lo confirme; no tienes que volver a comprar.',
  retry: 'Tu compra quedó registrada en la tienda, pero no pudimos confirmarla todavía. Lo intentaremos de nuevo automáticamente; no se te cobrará dos veces.',
  network: 'Sin conexión. Tu compra está a salvo: la confirmaremos en cuanto vuelvas a tener Internet.',
  invalid: 'La tienda indica que esta compra fue cancelada o reembolsada, así que no se agregó espacio.',
  mismatch: 'No pudimos asociar esta compra a tu recuerdo. Escríbenos desde Soporte y lo resolvemos; tu compra está a salvo.',
  otherAccount: 'Esta compra pertenece a otra cuenta de Finisher Legacy. Inicia sesión con esa cuenta para usarla.',
  unknownStory: 'Encontramos una compra sin terminar. Abre el recuerdo para el que la hiciste y toca "Restaurar compras".',
  storeError: 'La tienda no pudo completar la compra. Intenta de nuevo en un momento.',
  alreadyOwned: 'Tenías una compra anterior sin terminar. La aplicamos; vuelve a intentar si quieres más espacio.',
  restoredNone: 'No encontramos compras pendientes. Tus ampliaciones ya aplicadas siguen en tu recuerdo.',
} as const;

export function storeErrorMessage(error: IapStoreError): string {
  switch (error.kind) {
    case 'network':
      return 'No pudimos conectar con la tienda. Revisa tu conexión e intenta de nuevo.';
    case 'already_owned':
      return MESSAGES.alreadyOwned;
    case 'unavailable':
      return 'Esta ampliación no está disponible en la tienda en este momento.';
    default:
      return MESSAGES.storeError;
  }
}

/* ------------------------------------------------------------------ */
/* One transaction                                                     */
/* ------------------------------------------------------------------ */

export type PurchaseOutcome =
  | { status: 'granted'; finished: boolean; replayed: boolean; photos: number | null; quota: StoryQuota | null; storyPublicId: string; message: string }
  | { status: 'pending'; finished: false; message: string }
  /** Unfinished on purpose: retried on the next launch / restore. */
  | { status: 'retry_later'; finished: false; message: string }
  /** The backend refused it for good. `finished` only when the store says it is void. */
  | { status: 'rejected'; finished: boolean; message: string };

export interface ProcessDeps {
  submit: (body: SubmitPurchaseBody) => Promise<IapPurchaseResult>;
  finish: (purchase: IapPurchase) => Promise<void>;
  intents: PendingIntentStore;
}

/** Codes the backend may answer that mean "try again later" (keep the transaction). */
const RETRYABLE_CODES = new Set(['IAP_STORE_UNAVAILABLE', 'IAP_NOT_CONFIGURED']);

export function buildSubmitBody(purchase: IapPurchase, storyPublicId: string, product: IapProduct | null): SubmitPurchaseBody {
  const sameProduct = product !== null && product.id === purchase.productId;
  return {
    platform: purchase.platform,
    product_id: purchase.productId,
    story_public_id: storyPublicId,
    ...(purchase.platform === 'ios' ? { transaction_id: purchase.transactionId, jws: purchase.purchaseToken } : { purchase_token: purchase.purchaseToken }),
    price_amount_micros: sameProduct ? product.priceAmountMicros : null,
    currency: sameProduct ? product.currency : null,
  };
}

/**
 * @param storyPublicId The story the user is buying for right now, or null
 *   for a transaction found at launch / restore (looked up in the intents).
 */
export async function processPurchase(purchase: IapPurchase, storyPublicId: string | null, product: IapProduct | null, deps: ProcessDeps): Promise<PurchaseOutcome> {
  if (purchase.state === 'pending') {
    return { status: 'pending', finished: false, message: MESSAGES.pending };
  }

  const story = storyPublicId ?? (await deps.intents.get(purchase.productId))?.storyPublicId ?? null;
  if (!story) {
    return { status: 'retry_later', finished: false, message: MESSAGES.unknownStory };
  }

  const hasId = purchase.platform === 'ios' ? !!purchase.transactionId : !!purchase.purchaseToken;
  if (!hasId) {
    return { status: 'retry_later', finished: false, message: MESSAGES.retry };
  }

  let result: IapPurchaseResult;
  try {
    result = await deps.submit(buildSubmitBody(purchase, story, product));
  } catch (error) {
    return outcomeFromError(error, purchase, deps);
  }

  // Backend granted (or had already granted) → now, and only now, finish.
  let finished = true;
  try {
    await deps.finish(purchase);
    await deps.intents.clear(purchase.productId);
  } catch {
    // Retried later; the backend replay is idempotent (200, no second grant).
    finished = false;
  }

  return {
    status: 'granted',
    finished,
    replayed: result.replayed,
    photos: result.purchase.photos,
    quota: result.quota,
    storyPublicId: result.purchase.story ?? story,
    message: result.replayed ? MESSAGES.replayed : MESSAGES.granted,
  };
}

async function outcomeFromError(error: unknown, purchase: IapPurchase, deps: ProcessDeps): Promise<PurchaseOutcome> {
  if (!(error instanceof AppError)) {
    return { status: 'retry_later', finished: false, message: MESSAGES.retry };
  }

  if (error.kind === 'network' || error.kind === 'timeout') {
    return { status: 'retry_later', finished: false, message: MESSAGES.network };
  }

  if (error.code === 'IAP_PURCHASE_PENDING') {
    return { status: 'pending', finished: false, message: MESSAGES.pending };
  }

  if (error.code === 'IAP_PURCHASE_NOT_VALID') {
    // Refunded / cancelled by the store: nothing to grant, clear it from the queue.
    try {
      await deps.finish(purchase);
      await deps.intents.clear(purchase.productId);
      return { status: 'rejected', finished: true, message: MESSAGES.invalid };
    } catch {
      return { status: 'rejected', finished: false, message: MESSAGES.invalid };
    }
  }

  if (error.code === 'IAP_PURCHASE_OTHER_ACCOUNT') {
    return { status: 'rejected', finished: false, message: MESSAGES.otherAccount };
  }

  if (error.code === 'IAP_PRODUCT_MISMATCH' || error.code === 'IAP_VERIFICATION_FAILED' || error.kind === 'not_found' || error.kind === 'validation') {
    // Kept unfinished: paid money must never disappear because of a
    // configuration problem; support can fix it and the retry will grant.
    return { status: 'rejected', finished: false, message: MESSAGES.mismatch };
  }

  if ((error.code && RETRYABLE_CODES.has(error.code)) || error.kind === 'server' || error.kind === 'rate_limited' || error.kind === 'unauthenticated') {
    return { status: 'retry_later', finished: false, message: MESSAGES.retry };
  }

  return { status: 'retry_later', finished: false, message: MESSAGES.retry };
}
