/**
 * IapService with a fake store driver: the full buy flow (store sheet →
 * backend → finish), cancellation, the intent remembered for recovery,
 * unfinished transactions at launch and de-duplication of replays.
 */

 
import type { IapPurchaseResult } from '@/schemas/iap';

import type { IapDriver, IapProduct, IapPurchase, IapStoreError } from './iap-driver';
import { IapService } from './iap-service';
import { createMemoryIntentStore } from './pending-intents';

// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

jest.mock('@/api/iap', () => ({ submitIapPurchase: jest.fn() }));

const product: IapProduct = { id: 'fotos_10', title: '10 fotos', description: '', displayPrice: 'MX$99.00', currency: 'MXN', priceAmountMicros: 99_000_000 };

const purchase: IapPurchase = { productId: 'fotos_10', platform: 'android', transactionId: 'GPA.1', purchaseToken: 'tok-1', state: 'purchased', raw: {} };

const result: IapPurchaseResult = {
  purchase: { id: 'u', platform: 'android', product_id: 'fotos_10', status: 'granted', story: 'abc12345', photos: 10, order_number: 'FL1' },
  replayed: false,
  quota: { story: 'abc12345', limit: 15, used: 5, remaining: 10, can_expand: true },
};

function fakeDriver(overrides: Partial<IapDriver> = {}) {
  let onPurchase: ((p: IapPurchase) => void) | null = null;
  let onError: ((e: IapStoreError) => void) | null = null;
  const driver: IapDriver & { emitPurchase: (p: IapPurchase) => void; emitError: (e: IapStoreError) => void } = {
    platform: 'android',
    isAvailable: () => true,
    connect: jest.fn().mockResolvedValue(true),
    disconnect: jest.fn().mockResolvedValue(undefined),
    fetchProduct: jest.fn().mockResolvedValue(product),
    requestPurchase: jest.fn().mockResolvedValue(undefined),
    onPurchase: (l) => {
      onPurchase = l;
      return () => (onPurchase = null);
    },
    onError: (l) => {
      onError = l;
      return () => (onError = null);
    },
    finish: jest.fn().mockResolvedValue(undefined),
    unfinished: jest.fn().mockResolvedValue([]),
    sync: jest.fn().mockResolvedValue(undefined),
    emitPurchase: (p) => onPurchase?.(p),
    emitError: (e) => onError?.(e),
    ...overrides,
  };
  return driver;
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('IapService', () => {
  it('buy: store sheet → backend grant → finish, in that order', async () => {
    const driver = fakeDriver();
    const calls: string[] = [];
    const submit = jest.fn(async () => {
      calls.push('submit');
      return result;
    });
    (driver.finish as jest.Mock).mockImplementation(async () => {
      calls.push('finish');
    });
    const intents = createMemoryIntentStore();
    const service = new IapService({ driver, submit, intents });
    const onVerifying = jest.fn();

    const pending = service.buy({ product, storyPublicId: 'abc12345', accountToken: 'acct-uuid', onVerifying });
    await flush();

    // The story is remembered before the sheet opens (crash-safe).
    expect(intents.all()).toEqual([expect.objectContaining({ productId: 'fotos_10', storyPublicId: 'abc12345' })]);
    expect(driver.requestPurchase).toHaveBeenCalledWith('fotos_10', 'acct-uuid');

    driver.emitPurchase(purchase);
    const outcome = await pending;

    expect(onVerifying).toHaveBeenCalled();
    expect(outcome).toEqual({ kind: 'outcome', outcome: expect.objectContaining({ status: 'granted', finished: true }) });
    expect(calls).toEqual(['submit', 'finish']);
    expect(intents.all()).toEqual([]);
  });

  it('buy: cancelling the store sheet resolves "cancelled" and forgets the intent; nothing reaches the backend', async () => {
    const driver = fakeDriver();
    const submit = jest.fn();
    const intents = createMemoryIntentStore();
    const service = new IapService({ driver, submit, intents });

    const pending = service.buy({ product, storyPublicId: 'abc12345', accountToken: null });
    await flush();
    driver.emitError({ kind: 'cancelled', code: 'user-cancelled', message: '', productId: 'fotos_10' });

    expect(await pending).toEqual({ kind: 'store_failed', error: expect.objectContaining({ kind: 'cancelled' }) });
    await flush();
    expect(submit).not.toHaveBeenCalled();
    expect(driver.finish).not.toHaveBeenCalled();
    expect(intents.all()).toEqual([]);
  });

  it('buy: a backend outage keeps the transaction unfinished and the intent for the next launch', async () => {
    const driver = fakeDriver();
    const { AppError } = jest.requireActual('@/api/errors');
    const submit = jest.fn().mockRejectedValue(new AppError({ kind: 'network', message: 'offline' }));
    const intents = createMemoryIntentStore();
    const service = new IapService({ driver, submit, intents });

    const pending = service.buy({ product, storyPublicId: 'abc12345', accountToken: null });
    await flush();
    driver.emitPurchase(purchase);

    expect(await pending).toEqual({ kind: 'outcome', outcome: expect.objectContaining({ status: 'retry_later', finished: false }) });
    expect(driver.finish).not.toHaveBeenCalled();
    expect(intents.all()).toHaveLength(1);
  });

  it('recover at launch: grants unfinished purchases with the remembered story, skips pending ones', async () => {
    const pendingOne: IapPurchase = { ...purchase, purchaseToken: 'tok-pending', state: 'pending' };
    const driver = fakeDriver({ unfinished: jest.fn().mockResolvedValue([purchase, pendingOne]) });
    const submit = jest.fn().mockResolvedValue(result);
    const intents = createMemoryIntentStore([{ productId: 'fotos_10', storyPublicId: 'abc12345', createdAt: Date.now() }]);
    const service = new IapService({ driver, submit, intents });
    const heard = jest.fn();
    service.subscribe(heard);

    const outcomes = await service.recover();

    expect(outcomes).toEqual([expect.objectContaining({ status: 'granted' })]);
    expect(submit).toHaveBeenCalledTimes(1);
    expect(driver.finish).toHaveBeenCalledTimes(1);
    expect(heard).toHaveBeenCalledWith(expect.objectContaining({ status: 'granted', storyPublicId: 'abc12345' }));
  });

  it('the same transaction delivered twice at once (listener replay + recover) is sent once', async () => {
    let release: (value: IapPurchaseResult) => void = () => {};
    const submit = jest.fn(() => new Promise<IapPurchaseResult>((resolve) => (release = resolve)));
    const driver = fakeDriver({ unfinished: jest.fn().mockResolvedValue([purchase]) });
    const intents = createMemoryIntentStore([{ productId: 'fotos_10', storyPublicId: 'abc12345', createdAt: Date.now() }]);
    const service = new IapService({ driver, submit, intents });

    await service.ensureConnected();
    driver.emitPurchase(purchase); // unsolicited replay
    const recovering = service.recover();
    await flush();
    release(result);
    await recovering;

    expect(submit).toHaveBeenCalledTimes(1);
  });

  it('is unavailable without the native module and never touches the store', async () => {
    const driver = fakeDriver({ isAvailable: () => false });
    const service = new IapService({ driver, submit: jest.fn(), intents: createMemoryIntentStore() });

    expect(service.isAvailable()).toBe(false);
    expect(await service.loadProduct('fotos_10')).toBeNull();
    expect(await service.recover()).toEqual([]);
    expect(driver.connect).not.toHaveBeenCalled();
  });

  it('restore: syncs with the store, then recovers', async () => {
    const driver = fakeDriver();
    const service = new IapService({ driver, submit: jest.fn(), intents: createMemoryIntentStore() });
    await service.restore();
    expect(driver.sync).toHaveBeenCalled();
    expect(driver.unfinished).toHaveBeenCalled();
  });
});
