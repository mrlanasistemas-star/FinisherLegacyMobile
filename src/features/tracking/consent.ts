/**
 * Explicit consent is a value, not a flag somewhere: the only way to get
 * one is the consent screen, and GPS can't start without it. It is scoped
 * to one participation and expires quickly so a stale screen can't reuse it.
 */
export interface TrackingConsent {
  participantId: number;
  acceptedAt: string;
}

export const CONSENT_TTL_MS = 10 * 60_000;

export function createConsent(participantId: number, now: Date = new Date()): TrackingConsent {
  return { participantId, acceptedAt: now.toISOString() };
}

export function isConsentValid(consent: TrackingConsent | null | undefined, participantId: number, now: number = Date.now()): boolean {
  if (!consent || consent.participantId !== participantId) return false;
  const accepted = Date.parse(consent.acceptedAt);
  return Number.isFinite(accepted) && accepted <= now && now - accepted <= CONSENT_TTL_MS;
}
