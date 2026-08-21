import * as Network from 'expo-network';
import { WifiOff } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';

import { AppText } from '@/components/app-text';

import { showToast } from '@/stores/toastStore';
import { colors, spacing } from '@/theme/tokens';

/** Discreet banner while offline; a short toast when connection returns (AGENTS.md §148). */
export function OfflineBanner() {
  const network = Network.useNetworkState();
  const insets = useSafeAreaInsets();
  // A ref, not state — this only decides whether to fire a toast (an
  // external-system call), it never drives this component's own render.
  const wasOffline = useRef(false);

  const isOffline = network.isConnected === false;

  useEffect(() => {
    if (network.isConnected === undefined) return;
    if (network.isConnected === false) {
      wasOffline.current = true;
    } else if (wasOffline.current) {
      wasOffline.current = false;
      showToast('Conexión restaurada', 'success');
    }
  }, [network.isConnected]);

  if (!isOffline) return null;

  return (
    <Animated.View
      entering={FadeInUp.duration(200)}
      exiting={FadeOutUp.duration(180)}
      style={{ position: 'absolute', top: insets.top, left: 0, right: 0, zIndex: 20 }}>
      <View style={{ backgroundColor: colors.destructive, paddingVertical: spacing.xs, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs }}>
        <WifiOff color={colors.white} size={14} />
        <AppText variant="caption" style={{ color: colors.white }}>
          Sin conexión. Algunas historias pueden no actualizarse.
        </AppText>
      </View>
    </Animated.View>
  );
}
