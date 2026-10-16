import { canStartPayment, extractStripeParams, isAwaitingSettlement, isTerminalSuccess, phaseFromOrder, phaseFromSheet, settlementPollInterval } from './payment-flow';

describe('payment flow', () => {
  it('never reports success until the server says paid', () => {
    expect(phaseFromOrder({ payment_state: 'pending', payable: true }, true)).toBe('confirming');
    expect(phaseFromOrder({ payment_state: 'paid', payable: false }, true)).toBe('paid');
  });

  it('distinguishes processing, failed and expired', () => {
    expect(phaseFromOrder({ payment_state: 'processing', payable: true }, true)).toBe('processing');
    expect(phaseFromOrder({ payment_state: 'failed', payable: true }, false)).toBe('failed');
    expect(phaseFromOrder({ payment_state: 'cancelled', payable: false }, false)).toBe('expired');
    expect(phaseFromOrder({ payment_state: 'pending', payable: false }, false)).toBe('expired');
  });

  it('maps the payment sheet result without trusting it for "paid"', () => {
    expect(phaseFromSheet({ status: 'completed' })).toBe('confirming');
    expect(phaseFromSheet({ status: 'canceled' })).toBe('cancelled');
    expect(phaseFromSheet({ status: 'failed', message: 'declined' })).toBe('failed');
  });

  it('only allows (re)starting a payment from retryable phases', () => {
    expect(canStartPayment('review')).toBe(true);
    expect(canStartPayment('failed')).toBe(true);
    expect(canStartPayment('cancelled')).toBe(true);
    expect(canStartPayment('confirming')).toBe(false);
    expect(canStartPayment('paid')).toBe(false);
    expect(isTerminalSuccess('processing')).toBe(true);
    expect(isTerminalSuccess('failed')).toBe(false);
  });
});

describe('stripe params', () => {
  const base = { client_payload: {} };

  it('prefers the top-level contract fields and falls back to client_payload', () => {
    expect(extractStripeParams({ ...base, client_secret: 'pi_1_secret_2', publishable_key: 'pk_test_1' })).toEqual({ clientSecret: 'pi_1_secret_2', publishableKey: 'pk_test_1' });
    expect(extractStripeParams({ client_payload: { client_secret: 'pi_secret', publishable_key: 'pk_live_x' } })).toEqual({ clientSecret: 'pi_secret', publishableKey: 'pk_live_x' });
  });

  it('never accepts anything but a publishable key', () => {
    expect(extractStripeParams({ ...base, client_secret: 'pi_secret', publishable_key: 'sk_live_oops' })).toBeNull();
    expect(extractStripeParams({ ...base, client_secret: 'pi_secret', publishable_key: 'rk_live_oops' })).toBeNull();
    expect(extractStripeParams({ ...base, client_secret: '', publishable_key: 'pk_test' })).toBeNull();
    expect(extractStripeParams({ ...base, publishable_key: 'pk_test' })).toBeNull();
  });
});

describe('settlement polling', () => {
  it('polls fast first, then slower, then stops', () => {
    expect(settlementPollInterval(0)).toBe(4000);
    expect(settlementPollInterval(90_000)).toBe(10_000);
    expect(settlementPollInterval(5 * 60_000)).toBe(false);
  });

  it('only watches processing orders', () => {
    expect(isAwaitingSettlement({ payment_state: 'processing' })).toBe(true);
    expect(isAwaitingSettlement({ payment_state: 'paid' })).toBe(false);
  });
});
