import { initPaymentSheet, initStripe, presentPaymentSheet, PaymentSheetError } from '@stripe/stripe-react-native';

import { AppError } from '@/api/errors';
import type { SheetOutcome } from '@/payments/payment-flow';
import { colors } from '@/theme/tokens';
import type { OnlinePaymentResult } from '@/types/models';

/**
 * Stripe PaymentSheet — card data goes from the device straight to Stripe;
 * Laravel only ever sees the PaymentIntent id. The publishable key arrives
 * from the backend with the intent, so there is no key baked into the app
 * and switching test/live keys is a backend-only change.
 */
let initializedKey: string | null = null;

const RETURN_URL = 'finisherlegacy://stripe-redirect';

export async function presentStripePaymentSheet(
  payment: OnlinePaymentResult,
  customer: { name?: string; email?: string },
): Promise<SheetOutcome> {
  const clientSecret = payment.client_payload.client_secret;
  const publishableKey = payment.client_payload.publishable_key;

  if (typeof clientSecret !== 'string' || !clientSecret || typeof publishableKey !== 'string' || !publishableKey) {
    throw new AppError({ kind: 'server', status: 501, message: 'El pago con tarjeta todavía no está activo.' });
  }

  if (initializedKey !== publishableKey) {
    await initStripe({ publishableKey, urlScheme: 'finisherlegacy' });
    initializedKey = publishableKey;
  }

  const init = await initPaymentSheet({
    paymentIntentClientSecret: clientSecret,
    merchantDisplayName: payment.client_payload.merchant_display_name ?? 'Finisher Legacy',
    returnURL: RETURN_URL,
    style: 'alwaysDark',
    allowsDelayedPaymentMethods: false,
    defaultBillingDetails: { name: customer.name, email: customer.email },
    appearance: {
      colors: {
        primary: colors.gold,
        background: colors.black,
        componentBackground: colors.input,
        componentBorder: colors.inputBorder,
        componentDivider: colors.hairline,
        primaryText: colors.foreground,
        secondaryText: colors.muted,
        componentText: colors.foreground,
        placeholderText: colors.subtle,
        icon: colors.muted,
        error: colors.destructive,
      },
      shapes: { borderRadius: 12 },
      primaryButton: { colors: { background: colors.gold, text: colors.black } },
    },
  });

  if (init.error) {
    return { status: 'failed', message: init.error.localizedMessage ?? init.error.message };
  }

  const result = await presentPaymentSheet();

  if (!result.error) return { status: 'completed' };
  if (result.error.code === PaymentSheetError.Canceled) return { status: 'canceled' };
  return { status: 'failed', message: result.error.localizedMessage ?? result.error.message };
}
