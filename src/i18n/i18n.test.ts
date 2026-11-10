/**
 * The app translator: Spanish passthrough, catalog lookup with fallback to
 * the Spanish original, placeholders, plurals, the language resolution
 * order (choice → device → Spanish) and the over-the-air catalog refresh.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getCatalogVersion,
  getLocale,
  getLocales,
  initializeI18n,
  interpolate,
  pluralize,
  refreshCatalog,
  resetI18nForTests,
  setLocale,
  t,
  tc,
} from './index';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

let mockDeviceLocales: { languageTag: string; languageCode: string | null }[] = [];

jest.mock('expo-localization', () => ({
  getLocales: () => mockDeviceLocales,
}));

const API = 'https://finisherlegacy.com/api/v1';

type Routes = Record<string, { status?: number; body?: unknown }>;

function mockApi(routes: Routes) {
  const calls: { url: string; headers: Record<string, string> }[] = [];

  globalThis.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, headers: (init?.headers ?? {}) as Record<string, string> });

    const route = routes[url.split('?')[0]] ?? { status: 404 };
    const status = route.status ?? 200;

    return { ok: status >= 200 && status < 300, status, json: async () => route.body } as Response;
  }) as unknown as typeof fetch;

  return calls;
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(async () => {
  await AsyncStorage.clear();
  resetI18nForTests();
  mockDeviceLocales = [];
  mockApi({});
});

describe('t()', () => {
  it('returns the Spanish source untouched in Spanish', () => {
    expect(t('Mis historias')).toBe('Mis historias');
    expect(getLocale()).toBe('es');
  });

  it('replaces {name} and :name placeholders', () => {
    expect(t('Hola, {name}', { name: 'Ana' })).toBe('Hola, Ana');
    expect(interpolate('Pedido :number de {total}', { number: 7, total: '$10' })).toBe('Pedido 7 de $10');
    expect(interpolate('Hora: {missing} 10:30', { other: 1 })).toBe('Hora: {missing} 10:30');
  });

  it('picks the plural form and injects the count', () => {
    expect(tc('{count} foto|{count} fotos', 1)).toBe('1 foto');
    expect(tc('{count} foto|{count} fotos', 4)).toBe('4 fotos');
    expect(pluralize('Sin formas', 3)).toBe('Sin formas');
  });

  it('uses the catalog of the active language and falls back to Spanish', async () => {
    await AsyncStorage.setItem(
      'fl.i18n.catalog.en',
      JSON.stringify({ version: 'v1', messages: { 'Mis historias': 'My stories', '{count} foto|{count} fotos': '{count} photo|{count} photos' } }),
    );

    await setLocale('en');

    expect(getLocale()).toBe('en');
    expect(t('Mis historias')).toBe('My stories');
    expect(tc('{count} foto|{count} fotos', 2)).toBe('2 photos');
    // Not translated yet: the Spanish original, never an empty text.
    expect(t('Texto sin traducir')).toBe('Texto sin traducir');
    expect(getCatalogVersion()).toBe('v1');
  });

  it('ignores a language the app does not know', async () => {
    await setLocale('xx');

    expect(getLocale()).toBe('es');
  });
});

describe('language resolution', () => {
  it('defaults to Spanish', async () => {
    await initializeI18n();

    expect(getLocale()).toBe('es');
  });

  it('follows the device language when nothing was chosen', async () => {
    mockDeviceLocales = [{ languageTag: 'en-GB', languageCode: 'en' }];

    await initializeI18n();

    expect(getLocale()).toBe('en');
  });

  it('skips device languages the app does not offer', async () => {
    mockDeviceLocales = [
      { languageTag: 'fr-FR', languageCode: 'fr' },
      { languageTag: 'en-US', languageCode: 'en' },
    ];

    await initializeI18n();

    expect(getLocale()).toBe('en');
  });

  it('prefers the language the person chose over the device', async () => {
    mockDeviceLocales = [{ languageTag: 'en-US', languageCode: 'en' }];
    await setLocale('es');
    resetI18nForTests();

    await initializeI18n();

    expect(getLocale()).toBe('es');
  });
});

describe('over-the-air catalogs', () => {
  it('downloads a newer catalog, applies it and caches it', async () => {
    await setLocale('en');
    await flush();

    const calls = mockApi({
      [`${API}/i18n/en`]: { body: { data: { locale: 'en', version: 'v2', messages: { Cerrar: 'Close' } } } },
    });

    expect(t('Cerrar')).toBe('Cerrar');
    expect(await refreshCatalog()).toBe(true);
    expect(t('Cerrar')).toBe('Close');
    expect(calls[0].url).toBe(`${API}/i18n/en`);

    // Next time it only asks whether that version changed.
    const again = mockApi({ [`${API}/i18n/en`]: { status: 304 } });

    expect(await refreshCatalog()).toBe(false);
    expect(again[0].url).toBe(`${API}/i18n/en?v=v2`);
    expect(again[0].headers['If-None-Match']).toBe('"v2"');
    expect(t('Cerrar')).toBe('Close');
  });

  it('keeps working offline', async () => {
    await setLocale('en');
    globalThis.fetch = jest.fn(async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;

    expect(await refreshCatalog()).toBe(false);
    expect(t('Cerrar')).toBe('Cerrar');
  });

  it('never downloads a catalog for Spanish', async () => {
    const calls = mockApi({});

    expect(await refreshCatalog('es')).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it('learns new languages from the server and leaves one that was switched off', async () => {
    mockApi({
      [`${API}/i18n`]: {
        body: {
          data: {
            locales: [
              { code: 'es', name: 'Español', regional: 'es-MX', source: true, version: null },
              { code: 'pt', name: 'Português', regional: 'pt-BR', source: false, version: 'p1' },
            ],
          },
        },
      },
      [`${API}/i18n/pt`]: { body: { data: { locale: 'pt', version: 'p1', messages: { Cerrar: 'Fechar' } } } },
    });

    await setLocale('en');
    await initializeI18n();
    await flush();
    await flush();

    // English is no longer offered: back to Spanish; Portuguese is available.
    expect(getLocales().map((option) => option.code)).toEqual(['es', 'pt']);
    expect(getLocale()).toBe('es');

    await setLocale('pt');
    await flush();
    await flush();

    expect(t('Cerrar')).toBe('Fechar');
  });
});
