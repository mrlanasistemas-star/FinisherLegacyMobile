import '@/global.css';

import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope';
import { Montserrat_600SemiBold, Montserrat_700Bold, Montserrat_800ExtraBold } from '@expo-google-fonts/montserrat';
import { Syncopate_700Bold } from '@expo-google-fonts/syncopate';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { OfflineBanner } from '@/components/ui/offline-banner';
import { ToastHost } from '@/components/ui/toast';
import { QueryProvider } from '@/providers/query-provider';
import { useAuthStore } from '@/stores/authStore';
import { useDeepLinks } from '@/hooks/use-deep-links';
import { usePushLifecycle } from '@/hooks/use-push';
import { useSessionBootstrap } from '@/hooks/use-session-bootstrap';
import { colors } from '@/theme/tokens';
// Live tracking: the background location task must be defined at module scope.
import '@/features/tracking/tracking-task';
import { useLiveTrackingBootstrap } from '@/features/tracking/tracking-controller';
import { usePendingActivationRecovery } from '@/features/nfc/use-activation';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigator() {
  const status = useAuthStore((state) => state.status);
  const reduceMotion = useReducedMotion();
  useDeepLinks();
  usePushLifecycle();
  useLiveTrackingBootstrap(status === 'authenticated');
  // Finish an NFC activation whose write succeeded but whose confirm never arrived.
  usePendingActivationRecovery();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        // Native-stack transitions run on the platform UI thread; with Reduce
        // Motion on, the slide becomes a short cross-fade.
        animation: reduceMotion ? 'fade' : 'slide_from_right',
        animationDuration: reduceMotion ? 150 : 300,
        fullScreenGestureEnabled: true,
      }}>
      <Stack.Protected guard={status === 'authenticated'}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="feed" />
        <Stack.Screen name="search" />
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
        <Stack.Screen name="gear/index" />
        <Stack.Screen name="gear/[uuid]" />
        <Stack.Screen name="gear/claim" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="gear/claimed" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
        <Stack.Screen name="store/[slug]" />
        <Stack.Screen name="store/collection/[slug]" />
        <Stack.Screen name="cart/index" />
        <Stack.Screen name="checkout/index" options={{ gestureEnabled: false }} />
        <Stack.Screen name="orders/index" />
        <Stack.Screen name="orders/[uuid]" />
        <Stack.Screen name="notifications/index" />
        <Stack.Screen name="support/index" />
        <Stack.Screen name="support/[id]" />
        <Stack.Screen name="tracking/[participantId]" />
        <Stack.Screen name="athlete/[username]/index" />
        <Stack.Screen name="athlete/[username]/connections" />
        <Stack.Screen name="settings" />
      </Stack.Protected>
      <Stack.Protected guard={status !== 'authenticated'}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      {/* NFC taps resolve with or without a session (public lookup; login only to claim). */}
      <Stack.Screen name="nfc/[token]" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
    </Stack>
  );
}

export default function RootLayout() {
  // Manual §4: Manrope (UI/body), Montserrat (headings), Syncopate Bold (brand moments only).
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Montserrat_800ExtraBold,
    Syncopate_700Bold,
  });
  const sessionReady = useSessionBootstrap();
  // A font load failure must never brick the app — fall back to system fonts.
  const appReady = (fontsLoaded || !!fontError) && sessionReady;

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
          <StatusBar style="dark" />
          <RootNavigator />
          <OfflineBanner />
          <ToastHost />
        </QueryProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
