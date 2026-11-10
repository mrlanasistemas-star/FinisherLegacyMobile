import type { AppError } from '@/api/errors';
import { t } from '@/i18n';

/** A function, not a table: the text is resolved in the language active when it is shown. */
function couponReasonCopy(reason: string): string | null {
  switch (reason) {
    case 'not_found':
      return t('No encontramos ese cupón.');
    case 'inactive':
      return t('Este cupón ya no está activo.');
    case 'not_started':
      return t('Este cupón todavía no está disponible.');
    case 'expired':
      return t('Este cupón ya venció.');
    case 'usage_limit_reached':
      return t('Este cupón alcanzó su límite de usos.');
    case 'per_user_limit_reached':
      return t('Ya usaste este cupón antes.');
    case 'minimum_order_not_met':
      return t('Tu compra no alcanza el mínimo requerido para este cupón.');
    case 'currency_mismatch':
      return t('Este cupón no aplica para esta moneda.');
    default:
      return null;
  }
}

/**
 * Maps the exact `App\Enums\ApiErrorCode` values the commerce endpoints can
 * return to a real Spanish sentence — checked via `error.code`, never by
 * matching `error.message` text (backend copy can change independently).
 * Falls back to the backend's own message, then a generic line.
 */
export function describeCommerceError(error: AppError): string {
  if (error.kind === 'business_rule' && error.code === 'COUPON_NOT_APPLICABLE') {
    const reason = typeof error.details?.reason === 'string' ? error.details.reason : undefined;
    const copy = reason ? couponReasonCopy(reason) : null;
    if (copy) return copy;
  }

  switch (error.code) {
    case 'PRODUCT_OUT_OF_STOCK':
      return t('Este producto ya no tiene existencias.');
    case 'PRODUCT_UNAVAILABLE':
      return t('Este producto ya no está disponible.');
    case 'PRICE_NOT_AVAILABLE':
      return t('El precio de este producto cambió. Actualiza tu carrito e intenta de nuevo.');
    case 'PRICE_CURRENCY_MISMATCH':
      return t('Hay un problema con la moneda de este producto. Intenta de nuevo más tarde.');
    case 'CART_EVENT_MISMATCH':
      return t('Este producto no corresponde al evento seleccionado en tu carrito.');
    case 'ORDER_NOT_PAYABLE':
      return t('Este pedido ya no puede pagarse.');
    case 'ORDER_EXPIRED':
      return t('Este pedido expiró. Crea uno nuevo desde tu carrito.');
    case 'PAYMENT_AMOUNT_MISMATCH':
      return t('El monto del pago no coincide con el total del pedido. Intenta de nuevo.');
    case 'PAYMENT_ALREADY_RECORDED':
      return t('Este pedido ya tiene un pago registrado.');
    case 'PAYMENT_DECLINED':
      return t('Tu pago fue rechazado. Intenta con otro método.');
    case 'LEGACY_PLATE_EVENT_REQUIRED':
      return t('Selecciona un evento para tu Legacy Plate.');
    case 'LEGACY_PLATE_MODEL_REQUIRED':
      return t('Selecciona un modelo de Legacy Plate.');
    case 'LEGACY_PLATE_MODEL_UNAVAILABLE':
      return t('Ese modelo de Legacy Plate ya no está disponible.');
    case 'LEGACY_PLATE_QUANTITY_INVALID':
      return t('La cantidad seleccionada no es válida para una Legacy Plate.');
    case 'LEGACY_PLATE_ALREADY_EXISTS':
    case 'LEGACY_PLATE_PRESALE_DUPLICATE':
      return t('Ya tienes una Legacy Plate para este evento.');
    case 'LEGACY_PLATE_NOT_PAID':
      return t('Esta Legacy Plate todavía no está pagada.');
    default:
      return error.message;
  }
}
