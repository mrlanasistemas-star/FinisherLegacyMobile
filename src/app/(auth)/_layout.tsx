import { Stack } from 'expo-router';

import { localeScreenLayout } from '@/components/i18n/locale-boundary';
import { colors } from '@/theme/tokens';

export default function AuthLayout() {
  return (
    <Stack screenLayout={localeScreenLayout} screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="reset-password" />
    </Stack>
  );
}
