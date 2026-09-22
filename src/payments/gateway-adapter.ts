import type { OnlinePaymentResult } from '@/types/models';

/**
 * Thin seam between checkout UI and whatever gateway the backend actually
 * answers with — so screens never hardcode "Stripe" directly. Today only
 * Stripe has a real SDK wired server-side (`StripePaymentGateway`), but
 * this environment has no real secret/webhook keys configured
 * (`isConfigured()` false), so `POST /orders/{uuid}/payments/online`
 * realistically returns 501 right now. OpenPay's gateway class exists in
 * the backend but is unverified/not production-ready — never assumed here.
 *
 * `@stripe/stripe-react-native` is deliberately NOT installed: there is no
 * publishable key or Stripe account to test against in this environment.
 * See docs/MOBILE_BACKEND_REQUIREMENTS.md — "PAGOS" for exactly what's
 * needed before a real card form can replace `requires_client_action`.
 */
export type PaymentGatewayOutcome =
  | { kind: 'requires_client_action'; provider: 'stripe'; clientSecret: string; publishableKey: string | null }
  | { kind: 'unrecognized_gateway'; raw: OnlinePaymentResult };

export function interpretOnlinePaymentResult(result: OnlinePaymentResult): PaymentGatewayOutcome {
  const clientSecret = result.client_payload.client_secret;

  if (typeof clientSecret === 'string' && clientSecret.length > 0) {
    return {
      kind: 'requires_client_action',
      provider: 'stripe',
      clientSecret,
      publishableKey:
        typeof result.client_payload.publishable_key === 'string' ? result.client_payload.publishable_key : null,
    };
  }

  return { kind: 'unrecognized_gateway', raw: result };
}

/** `POST /orders/{uuid}/payments/online` answers 501 INTERNAL_ERROR specifically when no gateway is configured — the only reliable signal is the status code, the error code itself stays generic. */
export function isGatewayUnconfiguredError(status: number | undefined): boolean {
  return status === 501;
}
