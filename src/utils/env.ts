const API_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error(
    'EXPO_PUBLIC_API_URL no está definida. Revisa tu archivo .env (ver .env.example).',
  );
}

export const env = {
  apiUrl: API_URL,
  isDev: __DEV__,
};
