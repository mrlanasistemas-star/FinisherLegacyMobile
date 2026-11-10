import AsyncStorage from '@react-native-async-storage/async-storage';

import { resetI18nForTests, setLocale } from '@/i18n';

import { deleteConfirmationWord, resolveDeleteConfirmation } from './delete-confirmation';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@/i18n/locales/en.json', () => ({}));

beforeEach(async () => {
  await AsyncStorage.clear();
  resetI18nForTests();
  globalThis.fetch = jest.fn(async () => ({ ok: false, status: 404, json: async () => ({}) })) as unknown as typeof fetch;
});

describe('account deletion confirmation word', () => {
  it('is ELIMINAR in Spanish, forgiving case and spaces', () => {
    expect(deleteConfirmationWord()).toBe('ELIMINAR');
    expect(resolveDeleteConfirmation(' eliminar ')).toBe('ELIMINAR');
    expect(resolveDeleteConfirmation('DELETE')).toBeUndefined();
    expect(resolveDeleteConfirmation('')).toBeUndefined();
    expect(resolveDeleteConfirmation('borrar')).toBeUndefined();
  });

  it('is the word of the app language, and the Spanish one keeps working', async () => {
    await AsyncStorage.setItem('fl.i18n.catalog.en', JSON.stringify({ version: 'test', messages: { ELIMINAR: 'DELETE' } }));
    await setLocale('en');

    expect(deleteConfirmationWord()).toBe('DELETE');
    expect(resolveDeleteConfirmation('delete')).toBe('DELETE');
    expect(resolveDeleteConfirmation('ELIMINAR')).toBe('ELIMINAR');
    expect(resolveDeleteConfirmation('REMOVE')).toBeUndefined();
  });
});
