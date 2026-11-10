/**
 * The active language code, in a module with NO dependencies so the API
 * client can read it (`Accept-Language` / `X-Locale`) without pulling
 * storage or React into every module that imports the client.
 * Written only by `@/i18n` (index.ts).
 */
let active = 'es';

export function getActiveLocale(): string {
  return active;
}

export function setActiveLocale(locale: string): void {
  active = locale;
}
