import { t } from '@/i18n';

/** What every server build accepts, whatever the language (older builds only know this one). */
export const LEGACY_DELETE_WORD = 'ELIMINAR';

/**
 * The word a person without a password types to delete their account, in
 * the app language: "ELIMINAR" in Spanish, "DELETE" in English. Resolved
 * when shown (never at module load) so it follows a language change.
 */
export function deleteConfirmationWord(): string {
  return t('ELIMINAR');
}

/**
 * What to send as `confirmation` for what the person typed: the word of the
 * app language (the API accepts the word of the request's language,
 * `X-Locale`) or the Spanish one; `undefined` when it is neither, so the
 * server answers with its own validation message. Case and surrounding
 * spaces are forgiven.
 */
export function resolveDeleteConfirmation(typed: string, word: string = deleteConfirmationWord()): string | undefined {
  const value = typed.trim().toUpperCase();

  if (value === '') {
    return undefined;
  }

  if (value === word.trim().toUpperCase()) {
    return word.trim();
  }

  return value === LEGACY_DELETE_WORD ? LEGACY_DELETE_WORD : undefined;
}
