import { Stack } from 'expo-router';

import { localeScreenLayout } from '@/components/i18n/locale-boundary';
import { colors } from '@/theme/tokens';

/**
 * `settings` is listed as a navigator route in `localeScreenLayout`, so the
 * root stack leaves it alone and this stack must carry the boundary itself —
 * otherwise Ajustes kept the old language after switching it right here.
 */
export default function SettingsLayout() {
  return (
    <Stack screenLayout={localeScreenLayout} screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="account" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="security" />
      <Stack.Screen name="content-pin" />
      <Stack.Screen name="pin-unlock" options={{ presentation: 'modal' }} />
      <Stack.Screen name="pin-recovery" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="about" />
    </Stack>
  );
}
