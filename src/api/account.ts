import { apiClient } from '@/api/client';
import { toAppError } from '@/api/errors';
import type { ApiSuccessEnvelope } from '@/types/api';
import type { AuthPayload } from '@/types/auth';

/** Always resolves the same way whether or not the email exists (server-side anti-enumeration). */
export async function requestPasswordReset(email: string): Promise<string | null> {
  try {
    const { data } = await apiClient.post<ApiSuccessEnvelope<null>>('auth/forgot-password', { email });
    return data.message;
  } catch (error) {
    throw toAppError(error);
  }
}

export async function resetPassword(input: {
  token: string;
  email: string;
  password: string;
  password_confirmation: string;
}): Promise<void> {
  try {
    await apiClient.post('auth/reset-password', input);
  } catch (error) {
    throw toAppError(error);
  }
}

export type SocialProvider = 'google' | 'apple';

/** Native ID token → the same Sanctum token as password login. */
export async function socialSignIn(
  provider: SocialProvider,
  input: { id_token: string; nonce?: string; given_name?: string | null; family_name?: string | null },
): Promise<AuthPayload & { created: boolean }> {
  try {
    const { data } = await apiClient.post<ApiSuccessEnvelope<AuthPayload & { created: boolean }>>(`auth/social/${provider}`, input);
    return data.data;
  } catch (error) {
    throw toAppError(error);
  }
}

/** Re-auth: the current password, or `confirmation: 'ELIMINAR'` for Google/Apple-only accounts. */
export async function deleteAccount(input: { password?: string; confirmation?: 'ELIMINAR' }): Promise<void> {
  try {
    await apiClient.delete('me/account', { data: input });
  } catch (error) {
    throw toAppError(error);
  }
}
