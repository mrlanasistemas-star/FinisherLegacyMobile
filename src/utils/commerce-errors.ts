import type { AppError } from '@/api/errors';

const COUPON_REASON_COPY: Record<string, string> = {
  not_found: 'No encontramos ese cupón.',
  inactive: 'Este cupón ya no está activo.',
  not_started: 'Este cupón todavía no está disponible.',
  expired: 'Este cupón ya venció.',
  usage_limit_reached: 'Este cupón alcanzó su límite de usos.',
  per_user_limit_reached: 'Ya usaste este cupón antes.',
  minimum_order_not_met: 'Tu compra no alcanza el mínimo requerido para este cupón.',
  currency_mismatch: 'Este cupón no aplica para esta moneda.',
};

/**
 * Maps the exact `App\Enums\ApiErrorCode` values the commerce endpoints can
 * return to a real Spanish sentence — checked via `error.code`, never by
 * matching `error.message` text (backend copy can change independently).
 * Falls back to the backend's own message, then a generic line.
 */
export function describeCommerceError(error: AppError): string {
  if (error.kind === 'business_rule' && error.code === 'COUPON_NOT_APPLICABLE') {
    const reason = typeof error.details?.reason === 'string' ? error.details.reason : undefined;
    if (reason && COUPON_REASON_COPY[reason]) return COUPON_REASON_COPY[reason];
  }

  switch (error.code) {
    case 'PRODUCT_OUT_OF_STOCK':
      return 'Este producto ya no tiene existencias.';
    case 'PRODUCT_UNAVAILABLE':
      return 'Este producto ya no está disponible.';
    case 'PRICE_NOT_AVAILABLE':
      return 'El precio de este producto cambió. Actualiza tu carrito e intenta de nuevo.';
    case 'PRICE_CURRENCY_MISMATCH':
      return 'Hay un problema con la moneda de este producto. Intenta de nuevo más tarde.';
    case 'CART_EVENT_MISMATCH':
      return 'Este producto no corresponde al evento seleccionado en tu carrito.';
    case 'ORDER_NOT_PAYABLE':
      return 'Este pedido ya no puede pagarse.';
    case 'ORDER_EXPIRED':
      return 'Este pedido expiró. Crea uno nuevo desde tu carrito.';
    case 'PAYMENT_AMOUNT_MISMATCH':
      return 'El monto del pago no coincide con el total del pedido. Intenta de nuevo.';
    case 'PAYMENT_ALREADY_RECORDED':
      return 'Este pedido ya tiene un pago registrado.';
    case 'PAYMENT_DECLINED':
      return 'Tu pago fue rechazado. Intenta con otro método.';
    case 'LEGACY_PLATE_EVENT_REQUIRED':
      return 'Selecciona un evento para tu Legacy Plate.';
    case 'LEGACY_PLATE_MODEL_REQUIRED':
      return 'Selecciona un modelo de Legacy Plate.';
    case 'LEGACY_PLATE_MODEL_UNAVAILABLE':
      return 'Ese modelo de Legacy Plate ya no está disponible.';
    case 'LEGACY_PLATE_QUANTITY_INVALID':
      return 'La cantidad seleccionada no es válida para una Legacy Plate.';
    case 'LEGACY_PLATE_ALREADY_EXISTS':
    case 'LEGACY_PLATE_PRESALE_DUPLICATE':
      return 'Ya tienes una Legacy Plate para este evento.';
    case 'LEGACY_PLATE_NOT_PAID':
      return 'Esta Legacy Plate todavía no está pagada.';
    default:
      return error.message;
  }
}
