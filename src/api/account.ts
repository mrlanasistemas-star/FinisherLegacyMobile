import { apiClient } from '@/api/client';
import { toAppError } from '@/api/errors';
import type { ApiSuccessEnvelope } from '@/types/api';

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

/**
 * Re-auth: the current password, or `confirmation: 'ELIMINAR'` for older
 * accounts created with the (removed) Google/Apple sign-in that never had a
 * password. The app itself no longer offers social sign-in.
 */
export async function deleteAccount(input: { password?: string; confirmation?: 'ELIMINAR' }): Promise<void> {
  try {
    await apiClient.delete('me/account', { data: input });
  } catch (error) {
    throw toAppError(error);
  }
}
