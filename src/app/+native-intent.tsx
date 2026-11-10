import { mapIncomingPath } from '@/features/links/map-incoming-path';
import { isAwaitingCheckoutReturn } from '@/payments/checkout-return';

/**
 * Rewrites incoming links before Expo Router sees them (see
 * `mapIncomingPath`). The OpenPay in-app checkout return
 * (`finisherlegacy://checkout/return?order=…`) does not navigate while the
 * checkout screen is waiting for it (Android also delivers it as a deep
 * link; the in-app browser session consumes it) — otherwise it opens the
 * order, which re-reads the real status from the API.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string | null {
  try {
    if (isAwaitingCheckoutReturn() && /^finisherlegacy:\/\/\/?checkout\/return/i.test(path)) {
      return null;
    }
    return mapIncomingPath(path);
  } catch {
    return path;
  }
}
