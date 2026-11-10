import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Dynamic layer over app.json (which stays the source of truth for
 * everything else). Only adds what depends on the build environment:
 * universal links (iOS) / app links (Android) for NFC taps.
 *
 * The domain comes from EXPO_PUBLIC_WEB_URL (same value the app uses for
 * share links), default production. A tag URL `https://<domain>/n/{token}`
 * opens the app's `/nfc/[token]` screen when installed, the web otherwise.
 *
 * INFRA REQUIRED for verification (see docs/ARCHITECTURE.md › Enlaces):
 *  - https://<domain>/.well-known/apple-app-site-association (appID
 *    <TEAMID>.com.finisherlegacy.app, paths ["/n/*"])
 *  - https://<domain>/.well-known/assetlinks.json (package
 *    com.finisherlegacy.app + release signing SHA-256)
 */
function appLinkDomain(): string {
  const raw = process.env.EXPO_PUBLIC_WEB_URL || 'https://finisherlegacy.com';
  try {
    return new URL(raw).host;
  } catch {
    return 'finisherlegacy.com';
  }
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const domain = appLinkDomain();

  // Native NFC (react-native-nfc-manager v4, New Architecture). Writes the
  // Finisher Legacy Tag URL in-app — see docs/NFC_ACTIVATION.md.
  //  - iOS: NFCReaderUsageDescription + readersession.formats [NDEF, TAG]
  //    (requestTechnology opens an NFCTagReaderSession, so TAG is required).
  //  - Android: android.permission.NFC; the library manifest declares
  //    android.hardware.nfc required=false, so phones without NFC can still
  //    install.
  const nfcPlugin: [string, Record<string, unknown>] = [
    'react-native-nfc-manager',
    {
      nfcPermission: 'Finisher Legacy usa NFC para activar y leer tu Finisher Legacy Tag cuando lo acercas al teléfono.',
      includeNdefEntitlement: true,
    },
  ];

  return {
    ...(config as ExpoConfig),
    plugins: [...(config.plugins ?? []), nfcPlugin],
    ios: {
      ...config.ios,
      associatedDomains: [`applinks:${domain}`],
    },
    android: {
      ...config.android,
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [
            { scheme: 'https', host: domain, pathPrefix: '/n/' },
            { scheme: 'https', host: domain, pathPrefix: '/t/' },
          ],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
  };
};
