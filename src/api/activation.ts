import { apiClient } from '@/api/client';
import { AppError, toAppError } from '@/api/errors';
import {
  activationConfirmSchema,
  activationErrorBodySchema,
  activationStartSchema,
  tagLookupSchema,
  type ActivationConfirm,
  type ActivationStart,
  type TagLookup,
} from '@/schemas/activation';

/**
 * Finisher Legacy Tag activation (native NFC write) — see
 * docs/NFC_ACTIVATION.md. Bearer token comes from the shared client.
 *
 * The contract's 422 body is `{message, code}` at the top level, which the
 * shared `toAppError` (built for `{error:{code}}`) would drop the `code`
 * of — so 422 is accepted here as a resolved response and parsed locally
 * into an `AppError` that does carry the code.
 */

export interface ActivationStartInput {
  activation_code?: string;
  tag_code?: string;
  nfc_uid?: string;
  platform: 'android' | 'ios';
}

const accept2xxOr422 = (status: number) => (status >= 200 && status < 300) || status === 422;

function businessError(status: number, body: unknown): AppError {
  const parsed = activationErrorBodySchema.safeParse(body);
  if (parsed.success) {
    const data = 'error' in parsed.data ? parsed.data.error : parsed.data;
    return new AppError({
      kind: 'business_rule',
      status,
      code: data.code,
      message: data.message ?? 'No pudimos completar la activación.',
    });
  }
  // A real Laravel ValidationException ({message, errors}).
  const message =
    body && typeof body === 'object' && 'message' in body && typeof (body as { message: unknown }).message === 'string'
      ? (body as { message: string }).message
      : 'Los datos proporcionados no son válidos.';
  return new AppError({ kind: 'validation', status, message });
}

function malformed(): AppError {
  return new AppError({ kind: 'server', message: 'Respuesta inesperada del servidor. Intenta de nuevo.' });
}

function unwrapData(body: unknown): unknown {
  return body && typeof body === 'object' && 'data' in body ? (body as { data: unknown }).data : undefined;
}

export async function startActivation(input: ActivationStartInput): Promise<ActivationStart> {
  try {
    const response = await apiClient.post('tags/activation/start', input, { validateStatus: accept2xxOr422 });
    if (response.status === 422) throw businessError(422, response.data);
    const parsed = activationStartSchema.safeParse(unwrapData(response.data));
    if (!parsed.success) throw malformed();
    return parsed.data;
  } catch (error) {
    throw toAppError(error);
  }
}

export async function confirmActivation(intentId: string, input: { nfc_uid?: string; written_url: string }): Promise<ActivationConfirm> {
  try {
    const response = await apiClient.post(`tags/activation/${encodeURIComponent(intentId)}/confirm`, input, { validateStatus: accept2xxOr422 });
    if (response.status === 422) throw businessError(422, response.data);
    const parsed = activationConfirmSchema.safeParse(unwrapData(response.data));
    if (!parsed.success) throw malformed();
    return parsed.data;
  } catch (error) {
    throw toAppError(error);
  }
}

/** Best effort — the backend records why a write did not happen. Never throws. */
export async function failActivation(intentId: string, reason: string): Promise<void> {
  try {
    await apiClient.post(`tags/activation/${encodeURIComponent(intentId)}/fail`, { reason: reason.slice(0, 120) });
  } catch {
    // Intentionally swallowed: reporting a failure must never mask the failure itself.
  }
}

/** Public lookup (optional Bearer → `owned_by_me`). `src=nfc` records the tap as an NFC open. */
export async function getTag(code: string): Promise<TagLookup> {
  try {
    const { data } = await apiClient.get(`tags/${encodeURIComponent(code)}`, { params: { src: 'nfc' } });
    const parsed = tagLookupSchema.safeParse(unwrapData(data));
    if (!parsed.success) throw malformed();
    return parsed.data;
  } catch (error) {
    throw toAppError(error);
  }
}
