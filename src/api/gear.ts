import { apiClient } from '@/api/client';
import { toAppError } from '@/api/errors';
import type { AthleteOwnedProduct, PublicGear } from '@/types/models';

/** Digital Closet — GET /me/gear. Not paginated by the backend (flat array). */
export async function fetchMyGear(): Promise<AthleteOwnedProduct[]> {
  try {
    const { data } = await apiClient.get<{ data: AthleteOwnedProduct[] }>('me/gear');
    return data.data;
  } catch (error) {
    throw toAppError(error);
  }
}

export async function claimGear(code: string): Promise<AthleteOwnedProduct> {
  try {
    const { data } = await apiClient.post<{ data: AthleteOwnedProduct }>(`gear/${encodeURIComponent(code)}/claim`);
    return data.data;
  } catch (error) {
    throw toAppError(error);
  }
}

/** Public lookup, no auth, no PII — used to preview a code before claiming it. */
export async function fetchPublicGear(code: string): Promise<PublicGear> {
  try {
    const { data } = await apiClient.get<{ data: PublicGear }>(`gear/${encodeURIComponent(code)}`);
    return data.data;
  } catch (error) {
    throw toAppError(error);
  }
}

/**
 * The gear QR encodes the raw API URL (e.g.
 * `https://finisherlegacy.com/api/v1/gear/{code}`), not a friendly short
 * link like the Legacy Code QR — confirmed via
 * `App\Services\Commerce\AssetCodeService::publicUrl()`
 * (`route('api.v1.gear.show', $code)`). Manual entry gives the raw code
 * directly (server-generated as `AST` + 12 chars, but validated loosely
 * here — the server is the real authority on whether a code is valid).
 */
export function extractGearCode(scannedValue: string): string | null {
  const trimmed = scannedValue.trim();

  const urlMatch = trimmed.match(/\/gear\/([A-Za-z0-9]+)\/?$/);
  if (urlMatch) return urlMatch[1].toUpperCase();

  if (/^[A-Za-z0-9]{4,24}$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  return null;
}

export function normalizeGearCode(input: string): string {
  return input.trim().toUpperCase();
}
