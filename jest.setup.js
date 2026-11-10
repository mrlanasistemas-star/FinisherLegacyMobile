// Metro/EAS inline EXPO_PUBLIC_* from .env at bundle time; Jest doesn't run
// that step, so `src/utils/env.ts` would throw before any test module
// loads. Fill in the same real API URL from .env.example — not a mock
// value, the actual production default — purely so imports resolve.
process.env.EXPO_PUBLIC_API_URL ??= 'https://finisherlegacy.com/api/v1';

// Idiomas (src/i18n): every module with user-facing text imports the
// translator, which reads the saved language from AsyncStorage and the
// phone's language from expo-localization — both native. Tests run in
// Spanish, the source language: `t('Texto')` returns 'Texto', so
// assertions on Spanish copy hold without loading any catalog. A test that
// needs another language calls `setLocale('en')` and
// `resetI18nForTests()` afterwards (see src/i18n/i18n.test.ts).
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: 'es-MX', languageCode: 'es' }],
  getCalendars: () => [],
}));
