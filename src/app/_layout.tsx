import '@/global.css';

import {
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
  InstrumentSans_600SemiBold,
  InstrumentSans_700Bold,
  useFonts,
} from '@expo-google-fonts/instrument-sans';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { OfflineBanner } from '@/components/ui/offline-banner';
import { ToastHost } from '@/components/ui/toast';
import { QueryProvider } from '@/providers/query-provider';
import { useAuthStore } from '@/stores/authStore';
import { useDeepLinks } from '@/hooks/use-deep-links';
import { useSessionBootstrap } from '@/hooks/use-session-bootstrap';
import { colors } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigator() {
  const status = useAuthStore((state) => state.status);
  useDeepLinks();

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Protected guard={status === 'authenticated'}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="feed" />
        <Stack.Screen name="explore" />
        <Stack.Screen name="moments/[uuid]" />
        <Stack.Screen name="moments/create" options={{ presentation: 'modal' }} />
        <Stack.Screen name="events/index" />
        <Stack.Screen name="medals/index" />
        <Stack.Screen name="medals/[uuid]" />
        <Stack.Screen name="medals/create" options={{ presentation: 'modal' }} />
        <Stack.Screen name="medals/edit/[uuid]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="legacy/scan" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="legacy/[code]" />
        <Stack.Screen name="legacy/claimed" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
        <Stack.Screen name="events/[slug]" />
        <Stack.Screen name="my-events/index" />
        <Stack.Screen name="my-events/[participantId]" />
        <Stack.Screen name="my-events/memory-upgrades" options={{ presentation: 'modal' }} />
        <Stack.Screen name="gear/index" />
        <Stack.Screen name="gear/[uuid]" />
        <Stack.Screen name="gear/claim" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="gear/claimed" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
        <Stack.Screen name="store/[slug]" />
        <Stack.Screen name="cart/index" />
        <Stack.Screen name="checkout/index" options={{ gestureEnabled: false }} />
        <Stack.Screen name="orders/index" />
        <Stack.Screen name="orders/[uuid]" />
        <Stack.Screen name="notifications/index" />
        <Stack.Screen name="support/index" />
        <Stack.Screen name="support/[id]" />
        <Stack.Screen name="athlete/[username]/index" />
        <Stack.Screen name="athlete/[username]/connections" />
        <Stack.Screen name="settings" />
      </Stack.Protected>
      <Stack.Protected guard={status !== 'authenticated'}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    InstrumentSans_400Regular,
    InstrumentSans_500Medium,
    InstrumentSans_600SemiBold,
    InstrumentSans_700Bold,
  });
  const sessionReady = useSessionBootstrap();
  const appReady = fontsLoaded && sessionReady;

  useEffect(() => {
    if (appReady) {
      SplashScreen.hide();
    }
  }, [appReady]);

  if (!appReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryProvider>
          <StatusBar style="light" />
          <RootNavigator />
          <OfflineBanner />
          <ToastHost />
        </QueryProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
