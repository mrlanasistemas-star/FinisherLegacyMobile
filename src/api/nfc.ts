import { apiClient } from '@/api/client';
import { toAppError } from '@/api/errors';
import type { AthleteOwnedProduct } from '@/types/models';
import type { NfcResolution } from '@/types/nfc';

/** Public, throttled — works with or without a session (owned_by_me is false without one). */
export async function resolveNfcTag(token: string): Promise<NfcResolution> {
  try {
    const { data } = await apiClient.get<{ data: NfcResolution }>(`nfc/${encodeURIComponent(token)}`);
    return data.data;
  } catch (error) {
    throw toAppError(error);
  }
}

/** Auth required. 200 → the new "Mi equipo" item (same shape as `/me/gear`); 409 `NFC_ALREADY_CLAIMED`. */
export async function claimNfcTag(token: string): Promise<AthleteOwnedProduct> {
  try {
    const { data } = await apiClient.post<{ data: AthleteOwnedProduct }>(`nfc/${encodeURIComponent(token)}/claim`);
    return data.data;
  } catch (error) {
    throw toAppError(error);
  }
}

export const NFC_ALREADY_CLAIMED = 'NFC_ALREADY_CLAIMED';
