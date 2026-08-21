import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { useUiStore } from '@/stores/uiStore';
import { colors } from '@/theme/tokens';

export default function AuthIndex() {
  const [hydrated, setHydrated] = useState(() => useUiStore.persist.hasHydrated());
  const hasSeenOnboarding = useUiStore((state) => state.hasSeenOnboarding);

  useEffect(() => {
    if (hydrated) return;
    return useUiStore.persist.onFinishHydration(() => setHydrated(true));
  }, [hydrated]);

  if (!hydrated) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return <Redirect href={hasSeenOnboarding ? '/welcome' : '/onboarding'} />;
}
