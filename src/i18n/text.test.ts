/**
 * The pure text rules: translator notes (`||`), sentences cut at their
 * markers, ordinals — and the translator / money helpers built on them.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { formatMoney } from '@/utils/money';

import { getOrdinal, resetI18nForTests, setLocale, t, tc } from './index';
import { ordinal, splitMarkers, stripNote } from './text';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('./locales/en.json', () => ({}));

async function seedEnglish(messages: Record<string, string>) {
  await AsyncStorage.setItem('fl.i18n.catalog.en', JSON.stringify({ version: 'test', messages }));
  await setLocale('en');
}

beforeEach(async () => {
  await AsyncStorage.clear();
  resetI18nForTests();
  globalThis.fetch = jest.fn(async () => ({ ok: false, status: 404, json: async () => ({}) })) as unknown as typeof fetch;
});

describe('translator notes', () => {
  it('cuts the note off', () => {
    expect(stripNote('Nombre||nombre completo del atleta')).toBe('Nombre');
    expect(stripNote('Meta ||línea de meta')).toBe('Meta');
    expect(stripNote('Sin nota')).toBe('Sin nota');
  });

  it('never shows the note in Spanish', () => {
    expect(t('Nombre||nombre completo del atleta')).toBe('Nombre');
    expect(tc('{count} foto|{count} fotos||en una historia', 2)).toBe('2 fotos');
  });

  it('gives each context its own translation and hides the note of a pending one', async () => {
    await seedEnglish({ 'Nombre||nombre completo del atleta': 'Full name', 'Nombre||nombre de pila': 'First name' });

    expect(t('Nombre||nombre completo del atleta')).toBe('Full name');
    expect(t('Nombre||nombre de pila')).toBe('First name');
    expect(t('Meta||línea de meta')).toBe('Meta');
  });
});

describe('sentences with markers', () => {
  it('cuts a sentence at its markers, in the order of the translation', () => {
    expect(splitMarkers('¿Ya tienes cuenta? {link}', ['link'])).toEqual([
      { type: 'text', value: '¿Ya tienes cuenta? ' },
      { type: 'slot', name: 'link' },
    ]);
    expect(splitMarkers('{link} to keep going.', ['link'])).toEqual([
      { type: 'slot', name: 'link' },
      { type: 'text', value: ' to keep going.' },
    ]);
  });

  it('leaves markers without a node as written', () => {
    expect(splitMarkers('Hola {name}, {link}', ['link'])).toEqual([
      { type: 'text', value: 'Hola {name}, ' },
      { type: 'slot', name: 'link' },
    ]);
  });
});

describe('ordinals', () => {
  it('follow the language', async () => {
    expect(ordinal(1, 'es-MX')).toBe('1.º');
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 111].map((n) => ordinal(n, 'en-US'))).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd', '111th']);
    expect(getOrdinal(3)).toBe('3.º');

    await seedEnglish({});

    expect(getOrdinal(3)).toBe('3rd');
  });
});

describe('money', () => {
  it('always carries the currency code, in every language', async () => {
    expect(formatMoney(120000, 'MXN')).toBe('$1,200.00 MXN');
    expect(formatMoney(-4550, 'mxn')).toBe('-$45.50 MXN');

    await seedEnglish({});

    expect(formatMoney(120000, 'MXN')).toBe('$1,200.00 MXN');
    expect(formatMoney(999, 'EUR')).toBe('9.99 EUR');
  });
});
