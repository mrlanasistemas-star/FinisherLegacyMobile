import { Stack } from 'expo-router';

import { colors } from '@/theme/tokens';

export default function SettingsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
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
