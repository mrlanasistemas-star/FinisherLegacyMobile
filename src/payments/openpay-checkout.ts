import * as WebBrowser from 'expo-web-browser';

import { beginAwaitingCheckoutReturn } from '@/payments/checkout-return';
import { browserOutcome, CHECKOUT_RETURN_URL, type BrowserOutcome } from '@/payments/payment-flow';
import type { CheckoutSession } from '@/types/models';

/**
 * Opens the OpenPay web checkout of one order in an in-app browser
 * (ASWebAuthenticationSession on iOS, Custom Tabs on Android) and resolves
 * when the shopper comes back.
 *
 * PCI: the card is typed into OpenPay's own Openpay.js form on our web
 * checkout page and tokenized by OpenPay in that browser; the app never
 * sees card data, and neither does Laravel (it only receives the token +
 * the anti-fraud `device_session_id`). 3-D Secure runs in the same browser.
 *
 * The result only says "came back" vs "closed" — never "paid". The caller
 * always re-reads the order from the API.
 */
export async function openOpenPayCheckout(session: CheckoutSession): Promise<BrowserOutcome> {
  const end = beginAwaitingCheckoutReturn();
  try {
    const result = await WebBrowser.openAuthSessionAsync(session.url, CHECKOUT_RETURN_URL, {
      // No cookies shared with Safari: the scoped checkout session dies with
      // this browser sheet (iOS).
      preferEphemeralSession: true,
      // Android: show the page title (merchant name) in the Custom Tab bar.
      showTitle: true,
    });
    return browserOutcome(result);
  } finally {
    end();
  }
}
