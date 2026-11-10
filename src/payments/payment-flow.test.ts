import { beginAwaitingCheckoutReturn, isAwaitingCheckoutReturn } from './checkout-return';
import {
  browserOutcome,
  canStartPayment,
  CHECKOUT_RETURN_URL,
  isAwaitingSettlement,
  isTerminalSuccess,
  phaseAfterPolling,
  phaseFromOrder,
  phaseFromSessionError,
  settlementPollInterval,
} from './payment-flow';

const returned = { type: 'returned' } as const;
const closed = { type: 'closed' } as const;

describe('in-app browser result', () => {
  it('only a redirect to our return deep link counts as "returned" — and it never means paid', () => {
    expect(browserOutcome({ type: 'success', url: `${CHECKOUT_RETURN_URL}?order=abc` })).toEqual(returned);
    expect(browserOutcome({ type: 'success', url: 'https://evil.example/checkout/return' })).toEqual(closed);
    expect(browserOutcome({ type: 'cancel' })).toEqual(closed);
    expect(browserOutcome({ type: 'dismiss' })).toEqual(closed);
    expect(browserOutcome({ type: 'locked' })).toEqual(closed);
  });

  it('matches the backend return URL', () => {
    expect(CHECKOUT_RETURN_URL).toBe('finisherlegacy://checkout/return');
  });
});

describe('return flow: the server decides', () => {
  it('never reports success until the server says paid', () => {
    expect(phaseFromOrder({ payment_state: 'pending', payable: true }, returned)).toBe('confirming');
    expect(phaseFromOrder({ payment_state: 'paid', payable: false }, returned)).toBe('paid');
    // Even if the browser was closed, a server-side "paid" wins.
    expect(phaseFromOrder({ payment_state: 'paid', payable: false }, closed)).toBe('paid');
  });

  it('shows processing (3-D Secure / bank) and failure with retry', () => {
    expect(phaseFromOrder({ payment_state: 'processing', payable: true }, returned)).toBe('processing');
    expect(phaseFromOrder({ payment_state: 'failed', payable: true }, returned)).toBe('failed');
    expect(canStartPayment('failed')).toBe(true);
  });

  it('closing the browser without paying is "sin terminar", retryable', () => {
    expect(phaseFromOrder({ payment_state: 'pending', payable: true }, closed)).toBe('cancelled');
    expect(canStartPayment('cancelled')).toBe(true);
  });

  it('expired or cancelled orders cannot be paid again', () => {
    expect(phaseFromOrder({ payment_state: 'cancelled', payable: false }, returned)).toBe('expired');
    expect(phaseFromOrder({ payment_state: 'pending', payable: false }, returned)).toBe('expired');
    expect(phaseFromOrder({ payment_state: 'failed', payable: false }, returned)).toBe('expired');
    expect(canStartPayment('expired')).toBe(false);
  });

  it('digital-goods orders are never payable in the app', () => {
    expect(phaseFromOrder({ payment_state: 'pending', payable: true, app_payable: false }, null)).toBe('not_app_payable');
    expect(canStartPayment('not_app_payable')).toBe(false);
  });

  it('an unpaid order opened from "Mis pedidos" starts at review, not as an error', () => {
    expect(phaseFromOrder({ payment_state: 'pending', payable: true }, null)).toBe('review');
    expect(phaseFromOrder({ payment_state: 'pending', payable: true, app_payable: true }, null)).toBe('review');
  });

  it('when the polls run out, "confirming" becomes an honest "pending" (check again / retry)', () => {
    expect(phaseAfterPolling('confirming')).toBe('pending');
    expect(phaseAfterPolling('paid')).toBe('paid');
    expect(canStartPayment('pending')).toBe(true);
  });

  it('only allows (re)starting a payment from retryable phases', () => {
    expect(canStartPayment('review')).toBe(true);
    expect(canStartPayment('in_browser')).toBe(false);
    expect(canStartPayment('confirming')).toBe(false);
    expect(canStartPayment('paid')).toBe(false);
    expect(isTerminalSuccess('processing')).toBe(true);
    expect(isTerminalSuccess('pending')).toBe(false);
  });
});

describe('checkout-session errors', () => {
  it('maps the backend codes', () => {
    expect(phaseFromSessionError({ status: 501 })).toBe('unavailable');
    expect(phaseFromSessionError({ status: 409, code: 'ORDER_EXPIRED' })).toBe('expired');
    expect(phaseFromSessionError({ status: 409, code: 'ORDER_NOT_PAYABLE' })).toBe('expired');
    expect(phaseFromSessionError({ status: 409, code: 'ORDER_NOT_APP_PAYABLE' })).toBe('not_app_payable');
    // Already paid → go read the server, never assume.
    expect(phaseFromSessionError({ status: 409, code: 'PAYMENT_ALREADY_RECORDED' })).toBe('confirming');
    expect(phaseFromSessionError({ status: 500, code: 'INTERNAL_ERROR' })).toBeNull();
    expect(phaseFromSessionError(null)).toBeNull();
  });
});

describe('checkout return deep link guard', () => {
  it('is on only while the browser is open, and ending twice is harmless', () => {
    expect(isAwaitingCheckoutReturn()).toBe(false);
    const end = beginAwaitingCheckoutReturn();
    expect(isAwaitingCheckoutReturn()).toBe(true);
    end();
    end();
    expect(isAwaitingCheckoutReturn()).toBe(false);
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
