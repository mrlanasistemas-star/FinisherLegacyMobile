/**
 * Idiomas de la app — the same contract as the website's `resources/js/i18n`
 * (backend docs: docs/renovacion/idiomas.md §App).
 *
 * Spanish is the source of truth and the Spanish text IS the key:
 *
 *     t('Mis historias')
 *     t('Hola, {name}', { name: user.first_name })
 *     tc('{count} foto|{count} fotos', photos.length)
 *     const { t, locale, setLocale } = useI18n();   // re-renders on change
 *
 * Only LITERAL strings: the backend's `php artisan i18n:sync` scans this
 * repository for `t('…')` / `tc('…')`, translates what is new and rewrites
 * `src/i18n/locales/{locale}.json` (never edit those files by hand).
 *
 * Language: what the person chose in the app → the device language → Spanish.
 * Catalogs: the ones bundled in this build, refreshed over the air from
 * `GET /i18n/{locale}` and cached in AsyncStorage — so new strings and new
 * languages arrive without a store release. A string that is not
 * translated yet falls back to the Spanish original.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { env } from '@/utils/env';

import { setActiveLocale } from './active-locale';
import en from './locales/en.json';
import es from './locales/es.json';

export type Messages = Record<string, string>;
export type Params = Record<string, string | number>;

export interface LocaleOption {
  /** "en" */
  code: string;
  /** Native name: "English" */
  name: string;
  /** BCP 47 tag: "en-US" */
  regional: string;
}

interface Snapshot {
  locale: string;
  /** Languages the server offers (falls back to the bundled ones offline). */
  locales: LocaleOption[];
  /** Bumps on every catalog change so memoized texts refresh. */
  revision: number;
}

export const SOURCE_LOCALE = 'es';

const STORAGE = {
  choice: 'fl.i18n.locale',
  locales: 'fl.i18n.locales',
  catalog: (locale: string) => `fl.i18n.catalog.${locale}`,
};

/** Catalogs shipped inside this build. */
const BUNDLED: Record<string, Messages> = { es: es as Messages, en: en as Messages };

const DEFAULT_LOCALES: LocaleOption[] = [
  { code: 'es', name: 'Español', regional: 'es-MX' },
  { code: 'en', name: 'English', regional: 'en-US' },
];

let snapshot: Snapshot = { locale: SOURCE_LOCALE, locales: DEFAULT_LOCALES, revision: 0 };
let messages: Messages = {};
let version: string | null = null;

const listeners = new Set<() => void>();

function publish(next: Partial<Snapshot>) {
  snapshot = { ...snapshot, ...next, revision: snapshot.revision + 1 };
  setActiveLocale(snapshot.locale);
  listeners.forEach((listener) => listener());
}

/** Replaces `{name}` and `:name` placeholders. */
export function interpolate(text: string, params?: Params): string {
  if (!params) {
    return text;
  }

  // No lookbehind on purpose: Hermes does not support it everywhere.
  return text.replace(
    /\{\s*([A-Za-z_][\w.]*)\s*\}|(^|[^\w:]):([A-Za-z_]\w*)/g,
    (match, braced: string | undefined, before: string | undefined, colon: string | undefined) => {
      const value = params[braced ?? colon ?? ''];

      return value === undefined ? match : `${braced === undefined ? (before ?? '') : ''}${value}`;
    },
  );
}

/** Picks the form of a `singular|plural` string for a count. */
export function pluralize(text: string, count: number): string {
  const forms = text.split('|');

  if (forms.length === 1) {
    return text;
  }

  return (count === 1 ? forms[0] : forms[forms.length - 1]).trim();
}

function lookup(source: string): string {
  return snapshot.locale === SOURCE_LOCALE ? source : messages[source] || source;
}

/** Translates a Spanish source string into the active language. */
export function t(source: string, params?: Params): string {
  return interpolate(lookup(source), params);
}

/** Same, choosing between `singular|plural` by `count` (also `{count}`). */
export function tc(source: string, count: number, params?: Params): string {
  return interpolate(pluralize(lookup(source), count), { count, ...params });
}

/** Active language code — also sent to the API (`Accept-Language`, `X-Locale`). */
export function getLocale(): string {
  return snapshot.locale;
}

export function getLocales(): LocaleOption[] {
  return snapshot.locales;
}

/** BCP 47 tag of the active language, for `Intl` and date formatting. */
export function getRegionalLocale(): string {
  return snapshot.locales.find((option) => option.code === snapshot.locale)?.regional ?? snapshot.locale;
}

function supported(code: string | null | undefined): string | null {
  if (!code) {
    return null;
  }

  const wanted = code.toLowerCase().replace('_', '-');
  const known = snapshot.locales.map((option) => option.code);

  return known.find((candidate) => candidate === wanted) ?? known.find((candidate) => candidate === wanted.split('-')[0]) ?? null;
}

/** The phone's language, or null when it cannot be read. */
export function deviceLocale(): string | null {
  try {
    // Required lazily: an older dev build without the native module must not crash.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const localization = require('expo-localization') as typeof import('expo-localization');

    for (const candidate of localization.getLocales()) {
      const match = supported(candidate.languageTag) ?? supported(candidate.languageCode);

      if (match) {
        return match;
      }
    }
  } catch {
    // Fall through to Intl.
  }

  try {
    return supported(Intl.DateTimeFormat().resolvedOptions().locale);
  } catch {
    return null;
  }
}

async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);

    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

async function activate(locale: string): Promise<void> {
  const cached = locale === SOURCE_LOCALE ? null : await readJson<{ version: string; messages: Messages }>(STORAGE.catalog(locale));

  // The downloaded catalog wins over the one bundled in the build.
  messages = { ...(BUNDLED[locale] ?? {}), ...(cached?.messages ?? {}) };
  version = cached?.version ?? null;
  publish({ locale });
}

/**
 * Downloads the catalog of a language if the server has a newer version.
 * Silent offline: the bundled / cached catalog keeps working.
 */
export async function refreshCatalog(locale: string = snapshot.locale): Promise<boolean> {
  if (locale === SOURCE_LOCALE) {
    return false;
  }

  try {
    const cached = await readJson<{ version: string }>(STORAGE.catalog(locale));
    const query = cached?.version ? `?v=${encodeURIComponent(cached.version)}` : '';
    const response = await fetch(`${env.apiUrl}/i18n/${locale}${query}`, {
      headers: { Accept: 'application/json', ...(cached?.version ? { 'If-None-Match': `"${cached.version}"` } : {}) },
    });

    if (!response.ok) {
      return false; // 304 Not Modified included.
    }

    const body = (await response.json()) as { data?: { version?: string; messages?: Messages } };
    const next = body.data;

    if (!next?.version || !next.messages || next.version === cached?.version) {
      return false;
    }

    await AsyncStorage.setItem(STORAGE.catalog(locale), JSON.stringify({ version: next.version, messages: next.messages }));

    if (locale === snapshot.locale) {
      messages = { ...(BUNDLED[locale] ?? {}), ...next.messages };
      version = next.version;
      publish({});
    }

    return true;
  } catch {
    return false;
  }
}

/** Asks the server which languages it offers (a new one needs no app update). */
export async function refreshLocales(): Promise<void> {
  try {
    const response = await fetch(`${env.apiUrl}/i18n`, { headers: { Accept: 'application/json' } });

    if (!response.ok) {
      return;
    }

    const body = (await response.json()) as { data?: { locales?: LocaleOption[] } };
    const offered = (body.data?.locales ?? []).map(({ code, name, regional }) => ({ code, name, regional }));

    if (offered.length === 0) {
      return;
    }

    await AsyncStorage.setItem(STORAGE.locales, JSON.stringify(offered));
    publish({ locales: offered });

    // The active language was switched off by an admin: back to Spanish.
    if (!offered.some((option) => option.code === snapshot.locale)) {
      await activate(SOURCE_LOCALE);
    }
  } catch {
    // Offline: keep what we have.
  }
}

/**
 * Call once at startup (root layout), before rendering text: restores the
 * chosen language and its cached catalog, then refreshes both in the
 * background. Never throws.
 */
export async function initializeI18n(): Promise<void> {
  const [choice, offered] = await Promise.all([readJson<string>(STORAGE.choice), readJson<LocaleOption[]>(STORAGE.locales)]);

  if (offered && offered.length > 0) {
    snapshot = { ...snapshot, locales: offered };
  }

  await activate(supported(choice) ?? deviceLocale() ?? SOURCE_LOCALE);

  void refreshLocales().then(() => refreshCatalog());
}

/**
 * Changes the language of the app and remembers it. Saving it in the
 * person's account (so emails and push match) is the caller's job:
 * `saveLocalePreference()` in `@/api/i18n`.
 */
export async function setLocale(code: string): Promise<void> {
  const locale = supported(code);

  if (!locale) {
    return;
  }

  try {
    await AsyncStorage.setItem(STORAGE.choice, JSON.stringify(locale));
  } catch {
    // Not persisted: still applied for this session.
  }

  await activate(locale);
  void refreshCatalog(locale);
}

/** Version of the active catalog (null: bundled only). For diagnostics. */
export function getCatalogVersion(): string | null {
  return version;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  return () => listeners.delete(listener);
}

/**
 * The translator for components — re-renders when the language or its
 * catalog changes.
 */
export function useI18n() {
  const state = useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => snapshot,
  );

  return { t, tc, locale: state.locale, locales: state.locales, setLocale };
}

/** Test-only: back to a clean Spanish state. */
export function resetI18nForTests(): void {
  snapshot = { locale: SOURCE_LOCALE, locales: DEFAULT_LOCALES, revision: 0 };
  messages = {};
  version = null;
  setActiveLocale(SOURCE_LOCALE);
}
