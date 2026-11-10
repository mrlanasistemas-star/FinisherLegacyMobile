/**
 * `PATCH /me/locale` — saves the language the person chose in their account,
 * so emails and push notifications arrive in it (backend docs:
 * docs/renovacion/idiomas.md §App). The app itself already switched
 * language locally (`setLocale` in `@/i18n`); this only syncs the account.
 */
import type { ApiSuccessEnvelope } from '@/types/api';

import { apiClient } from './client';
import { toAppError } from './errors';

export async function saveLocalePreference(locale: string): Promise<string> {
  try {
    const response = await apiClient.patch<ApiSuccessEnvelope<{ locale: string }>>('me/locale', { locale });

    return response.data.data.locale;
  } catch (error) {
    throw toAppError(error);
  }
}
