import type { ConfigContext, ExpoConfig } from 'expo/config';
import { AndroidConfig, withAndroidStyles, type ConfigPlugin } from 'expo/config-plugins';

/**
 * Dynamic layer over app.json. app.json keeps the static identity (name,
 * slug, scheme, bundle id/package, icons, splash, base plugins); this file
 * adds everything that is store-review sensitive or depends on the build
 * environment, so it can carry comments. Full rationale and the store forms
 * these values must match: docs/store/README.md.
 *
 * Versioning: eas.json uses `appVersionSource: "remote"` + `autoIncrement`
 * on production, so `ios.buildNumber` / `android.versionCode` are NOT kept
 * here — EAS owns them. Only `version` (app.json, user-facing "1.0.0") is
 * bumped by hand for each store release.
 *
 * Universal links / App Links: the domain comes from EXPO_PUBLIC_WEB_URL
 * (default production). `https://<domain>/n/{token}` and `/t/{code}` open
 * the app when installed, the web otherwise. The web serves
 * /.well-known/apple-app-site-association (needs APPLE_TEAM_ID on the
 * server) and /.well-known/assetlinks.json (needs the Play App Signing
 * SHA-256) — see docs/store/pendientes-externos.md.
 */
function appLinkDomain(): string {
  const raw = process.env.EXPO_PUBLIC_WEB_URL || 'https://finisherlegacy.com';
  try {
    return new URL(raw).host;
  } catch {
    return 'finisherlegacy.com';
  }
}

type PluginEntry = string | [string, Record<string, unknown>];

/**
 * Plugins declared here (not in app.json). Every app.json plugin is kept
 * untouched; an entry here only replaces an app.json entry with the SAME
 * name, so options are never declared twice.
 */
const STORE_PLUGINS: PluginEntry[] = [
  // Native NFC (react-native-nfc-manager v4). Writes/reads the Finisher
  // Legacy Tag — docs/NFC_ACTIVATION.md.
  //  - iOS: the app only uses `requestTechnology` (NFCTagReaderSession),
  //    never `registerTagEvent` (NFCNDEFReaderSession), so the entitlement
  //    only needs `TAG`. Leaving out `NDEF` avoids App Store Connect's
  //    ITMS-90778 "NDEF is disallowed" upload error.
  //  - Android: android.permission.NFC; the library manifest declares
  //    android.hardware.nfc required=false, so phones without NFC install.
  [
    'react-native-nfc-manager',
    {
      nfcPermission:
        'Finisher Legacy usa NFC solo cuando tú lo pides, para activar, leer o verificar tu Finisher Legacy Tag al acercarlo al teléfono.',
      includeNdefEntitlement: false,
    },
  ],
  // Training audio (expo-audio): playback only. Background playback keeps a
  // guided session audible with the screen locked (iOS UIBackgroundModes
  // `audio`; Android foreground service `mediaPlayback`). The app never
  // records, so no microphone string and no RECORD_AUDIO.
  [
    'expo-audio',
    {
      microphonePermission: false,
      recordAudioAndroid: false,
      enableBackgroundPlayback: true,
      enableBackgroundRecording: false,
    },
  ],
  // Push (expo-notifications). `mode` sets the iOS aps-environment
  // entitlement: production for store/TestFlight builds, development for
  // dev clients. Android needs FCM credentials (GOOGLE_SERVICES_JSON below).
  // NOTE: expo-video stays plain in app.json — passing
  // `supportsBackgroundPlayback: false` would REMOVE the `audio` background
  // mode that expo-audio needs.
  [
    'expo-notifications',
    {
      mode: process.env.EAS_BUILD_PROFILE === 'production' ? 'production' : 'development',
      color: '#0B0B0C',
    },
  ],
];

function pluginName(entry: unknown): string | null {
  if (typeof entry === 'string') return entry;
  if (Array.isArray(entry) && typeof entry[0] === 'string') return entry[0];
  return null;
}

/**
 * Plugins of packages the app no longer ships. `@stripe/stripe-react-native`
 * was uninstalled when the app moved to the OpenPay web checkout in an in-app
 * browser (docs/COMMERCE_ARCHITECTURE.md); its app.json entry would otherwise
 * fail to resolve at prebuild. Remove the app.json entry too, then drop this.
 */
const REMOVED_PLUGINS = new Set(['@stripe/stripe-react-native']);

function mergePlugins(base: ExpoConfig['plugins'] = []): NonNullable<ExpoConfig['plugins']> {
  const ours = new Set(STORE_PLUGINS.map(pluginName));
  const kept = base.filter((entry) => !ours.has(pluginName(entry)) && !REMOVED_PLUGINS.has(pluginName(entry) ?? ''));
  return [...kept, ...STORE_PLUGINS];
}

/**
 * Permissions that libraries (or the prebuild template) add but the app
 * never uses. Blocking them keeps the Play Console sensitive-permission and
 * Data safety answers honest and avoids extra declarations.
 */
const BLOCKED_ANDROID_PERMISSIONS = [
  'android.permission.RECORD_AUDIO', // nothing records (camera = photos only)
  'android.permission.SYSTEM_ALERT_WINDOW', // dev-menu overlay from the template
  'android.permission.READ_MEDIA_IMAGES', // the system Photo Picker needs none
  'android.permission.READ_MEDIA_VIDEO',
  'android.permission.READ_MEDIA_AUDIO',
  'android.permission.READ_MEDIA_VISUAL_USER_SELECTED',
  'android.permission.ACCESS_BACKGROUND_LOCATION', // live tracking = foreground service
  'com.google.android.gms.permission.AD_ID', // no ads, no advertising ID
];

/**
 * Android 15/16 edge-to-edge (targetSdk 36): the system bars are always
 * transparent and the app draws behind them (safe areas handle insets).
 * On 3-button navigation Android adds a translucent contrast scrim behind
 * the nav bar unless `android:enforceNavigationBarContrast` is false. The
 * old `androidNavigationBar.enforceContrast` app.json key no longer does
 * anything in SDK 57 (and fails expo-doctor's schema check), so the flag is
 * written into the app theme here — no extra native dependency.
 */
const withNavigationBarContrastOff: ConfigPlugin = (config) =>
  withAndroidStyles(config, (mod) => {
    mod.modResults = AndroidConfig.Styles.assignStylesValue(mod.modResults, {
      add: true,
      parent: AndroidConfig.Styles.getAppThemeGroup(),
      name: 'android:enforceNavigationBarContrast',
      value: 'false',
    });
    return mod;
  });

type PrivacyManifest =NonNullable<NonNullable<ExpoConfig['ios']>['privacyManifests']>;

/**
 * iOS Privacy Manifest (PrivacyInfo.xcprivacy). Required-reason APIs are
 * the ones the bundled libraries declare (React Native, expo-*, AsyncStorage);
 * collected data types mirror the App Privacy labels in
 * docs/store/app-store.md — change both together.
 */
const PRIVACY_MANIFEST: PrivacyManifest = {
  NSPrivacyTracking: false,
  NSPrivacyTrackingDomains: [],
  NSPrivacyAccessedAPITypes: [
    { NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults', NSPrivacyAccessedAPITypeReasons: ['CA92.1'] },
    { NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp', NSPrivacyAccessedAPITypeReasons: ['C617.1', '0A2A.1', '3B52.1'] },
    { NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategorySystemBootTime', NSPrivacyAccessedAPITypeReasons: ['35F9.1'] },
    { NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryDiskSpace', NSPrivacyAccessedAPITypeReasons: ['E174.1', '85F4.1'] },
  ],
  NSPrivacyCollectedDataTypes: [
    'NSPrivacyCollectedDataTypeName',
    'NSPrivacyCollectedDataTypeEmailAddress',
    'NSPrivacyCollectedDataTypePhoneNumber',
    'NSPrivacyCollectedDataTypePhysicalAddress',
    'NSPrivacyCollectedDataTypeUserID',
    'NSPrivacyCollectedDataTypeDeviceID',
    'NSPrivacyCollectedDataTypePreciseLocation',
    'NSPrivacyCollectedDataTypePhotosorVideos',
    'NSPrivacyCollectedDataTypeOtherUserContent',
    'NSPrivacyCollectedDataTypeFitness',
    'NSPrivacyCollectedDataTypePurchaseHistory',
  ].map((type) => ({
    NSPrivacyCollectedDataType: type,
    NSPrivacyCollectedDataTypeLinked: true,
    NSPrivacyCollectedDataTypeTracking: false,
    NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
  })),
};

export default ({ config }: ConfigContext): ExpoConfig => {
  const domain = appLinkDomain();

  return withNavigationBarContrastOff({
    ...(config as ExpoConfig),
    plugins: mergePlugins(config.plugins),
    ios: {
      ...config.ios,
      associatedDomains: [`applinks:${domain}`],
      privacyManifests: PRIVACY_MANIFEST,
      infoPlist: {
        ...config.ios?.infoPlist,
        // Only HTTPS / Apple-provided crypto, no proprietary encryption:
        // exempt from export documentation (skips the question on upload).
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      ...config.android,
      blockedPermissions: [...new Set([...(config.android?.blockedPermissions ?? []), ...BLOCKED_ANDROID_PERMISSIONS])],
      // FCM credentials for expo-notifications on Android, provided as an EAS
      // "file" environment variable (never committed) — see
      // docs/store/pendientes-externos.md › Push.
      ...(process.env.GOOGLE_SERVICES_JSON ? { googleServicesFile: process.env.GOOGLE_SERVICES_JSON } : {}),
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
  });
};
