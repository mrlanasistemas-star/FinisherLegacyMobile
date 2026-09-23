import { orderTimeline } from './order-timeline';

import type { Order } from '@/types/models';

const base: Pick<Order, 'status' | 'payment_state' | 'fulfillment_status' | 'created_at' | 'cancelled_at' | 'completed_at' | 'payment'> = {
  status: 'pending',
  payment_state: 'pending',
  fulfillment_status: 'unfulfilled',
  created_at: '2026-09-20T10:00:00Z',
  cancelled_at: null,
  completed_at: null,
  payment: null,
};

describe('orderTimeline', () => {
  it('shows payment as the current step for a new order', () => {
    const steps = orderTimeline(base);
    expect(steps.map((s) => [s.key, s.state])).toEqual([
      ['created', 'done'],
      ['paid', 'current'],
      ['preparing', 'upcoming'],
      ['delivered', 'upcoming'],
    ]);
  });

  it('moves to preparing once paid', () => {
    const steps = orderTimeline({ ...base, status: 'confirmed', payment_state: 'paid' });
    expect(steps.find((s) => s.key === 'paid')?.state).toBe('done');
    expect(steps.find((s) => s.key === 'preparing')?.state).toBe('current');
  });

  it('never shows paid when the payment failed', () => {
    const steps = orderTimeline({ ...base, payment_state: 'failed' });
    expect(steps.find((s) => s.key === 'paid')).toMatchObject({ state: 'failed', label: 'El pago no se completó' });
  });

  it('ends at cancelled for an expired unpaid order', () => {
    const steps = orderTimeline({ ...base, status: 'cancelled', payment_state: 'cancelled' });
    expect(steps.map((s) => s.key)).toEqual(['created', 'cancelled']);
  });

  it('marks delivered orders complete', () => {
    const steps = orderTimeline({ ...base, status: 'completed', payment_state: 'paid', fulfillment_status: 'fulfilled' });
    expect(steps.at(-1)).toMatchObject({ key: 'delivered', state: 'done' });
  });
});
