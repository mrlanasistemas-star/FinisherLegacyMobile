import { handleURLCallback } from '@stripe/stripe-react-native';

import { mapIncomingPath } from '@/features/links/map-incoming-path';

/**
 * Rewrites incoming links before Expo Router sees them (see
 * `mapIncomingPath`). Stripe's 3-D Secure return (`…/stripe-redirect`) is
 * handed to the Stripe SDK and never navigates.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string | null {
  try {
    const mapped = mapIncomingPath(path);
    if (mapped === null) {
      handleURLCallback(path).catch(() => {});
      return null;
    }
    return mapped;
  } catch {
    return path;
  }
}
