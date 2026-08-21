import { apiClient } from '@/api/client';
import { toAppError } from '@/api/errors';
import type { LegacyCodeClaimResult, LegacyCodeLookup } from '@/types/models';

export async function lookupLegacyCode(code: string): Promise<LegacyCodeLookup> {
  try {
    const { data } = await apiClient.get<{ data: LegacyCodeLookup }>(
      `legacy-codes/${encodeURIComponent(code)}`,
    );
    return data.data;
  } catch (error) {
    throw toAppError(error);
  }
}

export async function claimLegacyCode(code: string): Promise<LegacyCodeClaimResult> {
  try {
    const { data } = await apiClient.post<{ data: LegacyCodeClaimResult }>(
      `legacy-codes/${encodeURIComponent(code)}/claim`,
    );
    return data.data;
  } catch (error) {
    throw toAppError(error);
  }
}

/**
 * The physical QR encodes the public web URL (https://finisherlegacy.com/l/{code}),
 * not the raw code — confirmed via LegacyCodeQrService::publicUrl() in the
 * backend. Manual entry gives the raw code directly.
 */
export function extractLegacyCode(scannedValue: string): string | null {
  const trimmed = scannedValue.trim();

  const urlMatch = trimmed.match(/\/l\/([A-Za-z0-9]+)\/?$/);
  if (urlMatch) return urlMatch[1].toUpperCase();

  if (/^[A-Za-z0-9]{4,16}$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  return null;
}

export function normalizeManualCode(input: string): string {
  return input.trim().toUpperCase();
}
