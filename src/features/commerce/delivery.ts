import type { CheckoutPayload } from '@/api/checkout';
import { t } from '@/i18n';
import type { Cart, DeliveryOption, ShippingAddress } from '@/types/models';

/**
 * Checkout delivery form: state, validation (the same rules as the server's
 * StoreCheckoutRequest, so most mistakes are caught before a round trip) and
 * the request body. Amounts never leave the server: the fee shown comes from
 * `cart.delivery_options` and the order freezes it again.
 */
export type DeliveryChoice = 'pickup' | 'shipping';

export interface DeliveryForm {
  method: DeliveryChoice;
  phone: string;
  line: string;
  neighborhood: string;
  postalCode: string;
  city: string;
  state: string;
  notes: string;
}

export type DeliveryField = Exclude<keyof DeliveryForm, 'method'>;
export type DeliveryErrors = Partial<Record<DeliveryField, string>>;

const PHONE = /^[0-9 +()-]+$/;
const POSTAL_CODE = /^[0-9]{5}$/;

/** Server field names → form fields, to show a 422 next to the right input. */
const SERVER_FIELDS: Record<string, DeliveryField> = {
  phone: 'phone',
  address_line: 'line',
  address_neighborhood: 'neighborhood',
  address_postal_code: 'postalCode',
  address_city: 'city',
  address_state: 'state',
  notes: 'notes',
};

export function initialDeliveryForm(
  cart: Pick<Cart, 'requires_shipping' | 'last_shipping_address' | 'delivery_options'> | null | undefined,
  phone: string | null | undefined,
): DeliveryForm {
  const last: ShippingAddress | null = cart?.last_shipping_address ?? null;
  const offersShipping = deliveryOptions(cart).some((option) => option.value === 'shipping');
  return {
    // Home delivery first when something ships physically and the server
    // offers it; otherwise pickup (event / kit pickup), like the web.
    method: cart?.requires_shipping && offersShipping ? 'shipping' : 'pickup',
    phone: phone ?? '',
    line: last?.line ?? '',
    neighborhood: last?.neighborhood ?? '',
    postalCode: last?.postal_code ?? '',
    city: last?.city ?? '',
    state: last?.state ?? '',
    notes: '',
  };
}

/** Delivery choices from the server; an older backend without them only picks up. */
export function deliveryOptions(cart: Pick<Cart, 'delivery_options'> | null | undefined): DeliveryOption[] {
  const options = cart?.delivery_options ?? [];
  return options.length > 0 ? options : [{ value: 'pickup', label: t('Recolección'), fee_minor: 0, free_over_minor: null }];
}

export function shippingFee(cart: Pick<Cart, 'delivery_options'> | null | undefined, method: DeliveryChoice): number {
  return deliveryOptions(cart).find((option) => option.value === method)?.fee_minor ?? 0;
}

export function validateDelivery(form: DeliveryForm): DeliveryErrors {
  const errors: DeliveryErrors = {};
  const phone = form.phone.trim();
  if (form.method === 'shipping') {
    if (!phone) errors.phone = t('Escribe un teléfono para coordinar la entrega.');
    if (!form.line.trim()) errors.line = t('Escribe la calle y el número.');
    if (!POSTAL_CODE.test(form.postalCode.trim())) errors.postalCode = t('El código postal tiene 5 dígitos.');
    if (!form.city.trim()) errors.city = t('Escribe la ciudad.');
    if (!form.state.trim()) errors.state = t('Escribe el estado.');
  }
  if (phone && (phone.length < 8 || phone.length > 30 || !PHONE.test(phone))) {
    errors.phone = t('Revisa el teléfono: solo números, espacios, + y guiones.');
  }
  if (form.notes.length > 300) errors.notes = t('Las notas pueden tener hasta 300 caracteres.');
  return errors;
}

/** First server message per form field (422 `fieldErrors`). */
export function deliveryErrorsFromServer(fieldErrors: Record<string, string[]> | null | undefined): DeliveryErrors {
  const errors: DeliveryErrors = {};
  for (const [key, messages] of Object.entries(fieldErrors ?? {})) {
    const field = SERVER_FIELDS[key];
    if (field && messages[0]) errors[field] = messages[0];
  }
  return errors;
}

export function checkoutPayload(form: DeliveryForm): CheckoutPayload {
  const phone = form.phone.trim();
  const notes = form.notes.trim();
  if (form.method === 'pickup') {
    return { delivery_method: 'pickup', ...(phone ? { phone } : {}), ...(notes ? { notes } : {}) };
  }
  return {
    delivery_method: 'shipping',
    phone,
    address_line: form.line.trim(),
    address_neighborhood: form.neighborhood.trim() || undefined,
    address_postal_code: form.postalCode.trim(),
    address_city: form.city.trim(),
    address_state: form.state.trim(),
    ...(notes ? { notes } : {}),
  };
}
