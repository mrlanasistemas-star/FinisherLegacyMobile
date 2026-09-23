const API_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error(
    'EXPO_PUBLIC_API_URL no está definida. Revisa tu archivo .env (ver .env.example).',
  );
}

export const env = {
  apiUrl: API_URL,
  isDev: __DEV__,
  /**
   * Google OAuth client ids (public, not secrets). Google sign-in only
   * renders when the one for the current platform is set — see
   * docs/RELEASE_CHECKLIST.md › "Google / Apple". The backend must list the
   * same ids in GOOGLE_OAUTH_CLIENT_IDS.
   */
  googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined,
  googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || undefined,
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || undefined,
};
