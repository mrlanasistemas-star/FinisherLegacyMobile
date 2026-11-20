import { checkoutPayload, deliveryErrorsFromServer, deliveryOptions, initialDeliveryForm, shippingFee, validateDelivery } from './delivery';

const cart = {
  requires_shipping: true,
  delivery_options: [
    { value: 'pickup' as const, label: 'Recolección', fee_minor: 0, free_over_minor: null },
    { value: 'shipping' as const, label: 'Envío', fee_minor: 15000, free_over_minor: null },
  ],
  last_shipping_address: { line: 'Av. Reforma 100', neighborhood: null, city: 'CDMX', state: 'CDMX', postal_code: '06000' },
};

describe('checkout delivery', () => {
  it('prefills the last address and starts on home delivery when something ships', () => {
    const form = initialDeliveryForm(cart, '5512345678');
    expect(form.method).toBe('shipping');
    expect(form.line).toBe('Av. Reforma 100');
    expect(form.postalCode).toBe('06000');
    expect(form.phone).toBe('5512345678');
  });

  it('an older backend without options only offers pickup, with no fee', () => {
    expect(deliveryOptions({}).map((o) => o.value)).toEqual(['pickup']);
    expect(initialDeliveryForm({ requires_shipping: true }, null).method).toBe('pickup');
    expect(shippingFee({}, 'shipping')).toBe(0);
    expect(shippingFee(cart, 'shipping')).toBe(15000);
    expect(shippingFee(cart, 'pickup')).toBe(0);
  });

  it('requires the address and a valid postal code only for home delivery', () => {
    const empty = { ...initialDeliveryForm(null, null), method: 'shipping' as const };
    expect(Object.keys(validateDelivery(empty)).sort()).toEqual(['city', 'line', 'phone', 'postalCode', 'state']);
    expect(validateDelivery({ ...empty, method: 'pickup' })).toEqual({});
    const filled = { ...initialDeliveryForm(cart, '55 1234 5678'), postalCode: '0600' };
    expect(Object.keys(validateDelivery(filled))).toEqual(['postalCode']);
  });

  it('builds the request body the server expects, never an amount', () => {
    expect(checkoutPayload(initialDeliveryForm(cart, '55 1234 5678'))).toEqual({
      delivery_method: 'shipping',
      phone: '55 1234 5678',
      address_line: 'Av. Reforma 100',
      address_neighborhood: undefined,
      address_postal_code: '06000',
      address_city: 'CDMX',
      address_state: 'CDMX',
    });
    expect(checkoutPayload({ ...initialDeliveryForm(cart, ''), method: 'pickup' })).toEqual({ delivery_method: 'pickup' });
  });

  it('maps server validation errors to the form fields', () => {
    expect(deliveryErrorsFromServer({ address_postal_code: ['El código postal no es válido.'], name: ['x'] })).toEqual({
      postalCode: 'El código postal no es válido.',
    });
  });
});
