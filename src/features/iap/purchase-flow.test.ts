/**
 * The "Ampliar espacio" purchase state machine and the per-transaction
 * rule: finish (consume) the store transaction ONLY after the backend
 * granted it, or when the backend says the store voided it.
 */

 
import { AppError } from '@/api/errors';
import type { IapPurchaseResult } from '@/schemas/iap';

import type { IapProduct, IapPurchase } from './iap-driver';
import { createMemoryIntentStore } from './pending-intents';
import { canBuy, initialPurchaseState, MESSAGES, processPurchase, purchaseReducer, type PurchaseState } from './purchase-flow';

// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

const product: IapProduct = {
  id: 'com.finisherlegacy.app.fotos10',
  title: '10 fotos más',
  description: '',
  displayPrice: '$99.00',
  currency: 'MXN',
  priceAmountMicros: 99_000_000,
};

const iosPurchase: IapPurchase = {
  productId: product.id,
  platform: 'ios',
  transactionId: '2000000000000001',
  purchaseToken: 'jws.payload.sig',
  state: 'purchased',
  raw: {},
};

const androidPurchase: IapPurchase = {
  productId: 'fotos_10',
  platform: 'android',
  transactionId: 'GPA.1',
  purchaseToken: 'play-token',
  state: 'purchased',
  raw: {},
};

function granted(replayed = false): IapPurchaseResult {
  return {
    purchase: { id: 'uuid', platform: 'ios', product_id: product.id, status: 'granted', story: 'abc12345', photos: 10, order_number: 'FL1' },
    replayed,
    quota: { story: 'abc12345', limit: 15, used: 5, remaining: 10, can_expand: true },
  };
}

function businessError(code: string, status = 422) {
  return new AppError({ kind: 'business_rule', code, status, message: code });
}

function deps(submit: jest.Mock, intents = createMemoryIntentStore()) {
  const finish = jest.fn().mockResolvedValue(undefined);
  return { submit, finish, intents };
}

const ready: PurchaseState = purchaseReducer(purchaseReducer(initialPurchaseState, { type: 'LOAD' }), { type: 'LOADED', product });

describe('state machine', () => {
  it('loads the store product, then buys → verifies → success', () => {
    expect(ready.phase).toBe('ready');
    expect(canBuy(ready)).toBe(true);

    const purchasing = purchaseReducer(ready, { type: 'BUY' });
    expect(purchasing.phase).toBe('purchasing');
    // A double tap while purchasing is ignored.
    expect(purchaseReducer(purchasing, { type: 'BUY' })).toBe(purchasing);

    const verifying = purchaseReducer(purchasing, { type: 'STORE_PURCHASED' });
    expect(verifying.phase).toBe('verifying');

    const done = purchaseReducer(verifying, {
      type: 'OUTCOME',
      outcome: { status: 'granted', finished: true, replayed: false, photos: 10, quota: granted().quota, storyPublicId: 'abc12345', message: MESSAGES.granted },
    });
    expect(done.phase).toBe('success');
    expect(done.photosAdded).toBe(10);
    expect(done.quota?.limit).toBe(15);
  });

  it('hides gracefully when IAP is unavailable and cannot buy', () => {
    const state = purchaseReducer(purchaseReducer(initialPurchaseState, { type: 'LOAD' }), { type: 'UNAVAILABLE', reason: 'no_module' });
    expect(state.phase).toBe('unavailable');
    expect(canBuy(state)).toBe(false);
    expect(purchaseReducer(state, { type: 'BUY' })).toBe(state);
  });

  it('cancelled, pending and store errors', () => {
    const purchasing = purchaseReducer(ready, { type: 'BUY' });

    const cancelled = purchaseReducer(purchasing, { type: 'STORE_FAILED', error: { kind: 'cancelled', code: 'user-cancelled', message: '', productId: null } });
    expect(cancelled.phase).toBe('cancelled');
    expect(cancelled.message).toBeNull();
    expect(canBuy(cancelled)).toBe(true);

    const pending = purchaseReducer(purchasing, { type: 'STORE_FAILED', error: { kind: 'pending', code: 'pending', message: '', productId: null } });
    expect(pending.phase).toBe('pending');
    expect(pending.message).toBe(MESSAGES.pending);

    const network = purchaseReducer(purchasing, { type: 'STORE_FAILED', error: { kind: 'network', code: 'network-error', message: '', productId: null } });
    expect(network.phase).toBe('error');
    expect(network.message).toMatch(/conexión/);

    const owned = purchaseReducer(purchasing, { type: 'STORE_FAILED', error: { kind: 'already_owned', code: 'already-owned', message: '', productId: null } });
    expect(owned.message).toBe(MESSAGES.alreadyOwned);
  });

  it('restore: busy guard and result', () => {
    const restoring = purchaseReducer(ready, { type: 'RESTORE' });
    expect(restoring.phase).toBe('restoring');
    expect(purchaseReducer(restoring, { type: 'BUY' })).toBe(restoring);
    expect(purchaseReducer(restoring, { type: 'RESTORED', granted: 0, message: MESSAGES.restoredNone }).phase).toBe('ready');
    expect(purchaseReducer(restoring, { type: 'RESTORED', granted: 1, message: MESSAGES.granted }).phase).toBe('success');
  });
});

describe('processPurchase: finish only after the backend grant', () => {
  it('grants, then finishes and forgets the intent', async () => {
    const order: string[] = [];
    const submit = jest.fn(async () => {
      order.push('submit');
      return granted();
    });
    const d = deps(submit as unknown as jest.Mock, createMemoryIntentStore([{ productId: product.id, storyPublicId: 'abc12345', createdAt: Date.now() }]));
    d.finish.mockImplementation(async () => {
      order.push('finish');
    });

    const outcome = await processPurchase(iosPurchase, 'abc12345', product, d);

    expect(outcome).toMatchObject({ status: 'granted', finished: true, photos: 10 });
    expect(order).toEqual(['submit', 'finish']);
    expect(submit).toHaveBeenCalledWith({
      platform: 'ios',
      product_id: product.id,
      story_public_id: 'abc12345',
      transaction_id: '2000000000000001',
      jws: 'jws.payload.sig',
      price_amount_micros: 99_000_000,
      currency: 'MXN',
    });
    expect(d.intents.all()).toEqual([]);
  });

  it('sends the Android purchase token', async () => {
    const submit = jest.fn().mockResolvedValue(granted());
    await processPurchase(androidPurchase, 'abc12345', null, deps(submit));
    expect(submit.mock.calls[0][0]).toMatchObject({ platform: 'android', product_id: 'fotos_10', purchase_token: 'play-token', price_amount_micros: null });
  });

  it.each([
    ['network failure', new AppError({ kind: 'network', message: 'x' }), 'retry_later'],
    ['timeout', new AppError({ kind: 'timeout', message: 'x' }), 'retry_later'],
    ['store outage', businessError('IAP_STORE_UNAVAILABLE', 503), 'retry_later'],
    ['not configured', businessError('IAP_NOT_CONFIGURED', 503), 'retry_later'],
    ['server 500', new AppError({ kind: 'server', status: 500, message: 'x' }), 'retry_later'],
    ['pending at the store', businessError('IAP_PURCHASE_PENDING', 409), 'pending'],
    ['product mismatch', businessError('IAP_PRODUCT_MISMATCH'), 'rejected'],
    ['unknown to the store', businessError('IAP_VERIFICATION_FAILED'), 'rejected'],
    ['other account', businessError('IAP_PURCHASE_OTHER_ACCOUNT', 409), 'rejected'],
  ])('%s → %s and the transaction stays unfinished', async (_label, error, status) => {
    const submit = jest.fn().mockRejectedValue(error);
    const d = deps(submit);
    const outcome = await processPurchase(iosPurchase, 'abc12345', product, d);
    expect(outcome.status).toBe(status);
    expect(outcome.finished).toBe(false);
    expect(d.finish).not.toHaveBeenCalled();
  });

  it('a refunded / cancelled purchase is finished (removed from the queue) without granting', async () => {
    const d = deps(jest.fn().mockRejectedValue(businessError('IAP_PURCHASE_NOT_VALID')));
    const outcome = await processPurchase(iosPurchase, 'abc12345', product, d);
    expect(outcome).toMatchObject({ status: 'rejected', finished: true, message: MESSAGES.invalid });
    expect(d.finish).toHaveBeenCalledTimes(1);
  });

  it('a pending store purchase never reaches the backend', async () => {
    const submit = jest.fn();
    const d = deps(submit);
    const outcome = await processPurchase({ ...androidPurchase, state: 'pending' }, 'abc12345', null, d);
    expect(outcome.status).toBe('pending');
    expect(submit).not.toHaveBeenCalled();
    expect(d.finish).not.toHaveBeenCalled();
  });

  it('a transaction found at launch uses the remembered story, or waits when none is known', async () => {
    const submit = jest.fn().mockResolvedValue(granted(true));
    const remembered = deps(submit, createMemoryIntentStore([{ productId: product.id, storyPublicId: 'zzz99999', createdAt: Date.now() }]));
    const outcome = await processPurchase(iosPurchase, null, null, remembered);
    expect(outcome).toMatchObject({ status: 'granted', replayed: true, message: MESSAGES.replayed });
    expect(submit.mock.calls[0][0].story_public_id).toBe('zzz99999');

    const unknown = deps(jest.fn());
    const waiting = await processPurchase(iosPurchase, null, null, unknown);
    expect(waiting).toMatchObject({ status: 'retry_later', message: MESSAGES.unknownStory });
    expect(unknown.submit).not.toHaveBeenCalled();
    expect(unknown.finish).not.toHaveBeenCalled();
  });

  it('a finish failure after the grant is reported as not finished (retried, idempotent)', async () => {
    const d = deps(jest.fn().mockResolvedValue(granted()));
    d.finish.mockRejectedValue(new Error('store busy'));
    const outcome = await processPurchase(iosPurchase, 'abc12345', product, d);
    expect(outcome).toMatchObject({ status: 'granted', finished: false });
  });
});
