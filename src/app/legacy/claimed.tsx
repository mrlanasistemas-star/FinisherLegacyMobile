import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { PartyPopper } from 'lucide-react-native';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { Screen } from '@/components/screen';
import { colors, spacing } from '@/theme/tokens';

export default function LegacyClaimedScreen() {
  const { code, medalUuid } = useLocalSearchParams<{ code: string; medalUuid?: string }>();
  const scale = useSharedValue(0.6);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    scale.value = withSpring(1, { damping: 9, stiffness: 120 });
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Screen>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md }}>
        <Animated.View
          style={[
            {
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: colors.gold,
              alignItems: 'center',
              justifyContent: 'center',
            },
            animatedStyle,
          ]}>
          <PartyPopper color={colors.black} size={40} />
        </Animated.View>

        <AppText variant="title" align="center">
          Esta historia ya forma parte de tu Legacy.
        </AppText>
        <AppText variant="body" tone="muted" align="center">
          Legacy Code {code}
        </AppText>
      </View>

      <View style={{ gap: spacing.sm, paddingBottom: spacing.lg }}>
        {medalUuid ? (
          <AppButton label="Ver mi medalla" onPress={() => router.replace(`/medals/${medalUuid}`)} />
        ) : null}
        <AppButton
          label="Ir a mi Legacy Vault"
          variant={medalUuid ? 'secondary' : 'primary'}
          onPress={() => router.replace('/medals')}
        />
      </View>
    </Screen>
  );
}
