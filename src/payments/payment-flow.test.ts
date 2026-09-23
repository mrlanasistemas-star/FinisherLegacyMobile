import { canStartPayment, isTerminalSuccess, phaseFromOrder, phaseFromSheet } from './payment-flow';

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
