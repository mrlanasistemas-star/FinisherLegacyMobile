/**
 * NFC tap contract (backend agent A6, `GET /api/v1/nfc/{token}`). The
 * token is a random public string from the tag URL `https://<domain>/n/{token}`
 * — never a name, email or sequential id. The UI never shows the token.
 */
export type NfcTagStatus = 'unclaimed' | 'claimed' | 'disabled';

export type NfcTargetType = 'legacy_plate' | 'product' | 'profile' | 'event';

export interface NfcTarget {
  type: NfcTargetType;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  web_url: string;
  profile_username: string | null;
  event_slug: string | null;
}

export interface NfcResolution {
  status: NfcTagStatus;
  owned_by_me: boolean;
  can_claim: boolean;
  target: NfcTarget | null;
}
