import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { GearIconBadge } from '@/components/brand/gear-icon-badge';
import { GoldGlow } from '@/components/brand/gold-glow';
import { colors, spacing } from '@/theme/tokens';

export default function GearClaimedScreen() {
  const { productName, variantName } = useLocalSearchParams<{ uuid: string; productName: string; variantName?: string }>();

  const glow = useSharedValue(0);
  const badgeScale = useSharedValue(0.4);
  const contentOpacity = useSharedValue(0);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    glow.value = withTiming(1, { duration: 900 });
    badgeScale.value = withSpring(1, { damping: 10, stiffness: 120 });
    contentOpacity.value = withDelay(350, withTiming(1, { duration: 500 }));
  }, [badgeScale, contentOpacity, glow]);

  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value, transform: [{ scale: 0.6 + glow.value * 0.6 }] }));
  const badgeStyle = useAnimatedStyle(() => ({ transform: [{ scale: badgeScale.value }] }));
  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: (1 - contentOpacity.value) * 12 }],
  }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.black }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, paddingHorizontal: spacing.xl }}>
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={[{ position: 'absolute' }, glowStyle]}>
            <GoldGlow size={220} intensity={1.3} />
          </Animated.View>
          <Animated.View style={badgeStyle}>
            <GearIconBadge productName={productName ?? ''} size={110} />
          </Animated.View>
        </View>

        <Animated.View style={[{ alignItems: 'center', gap: spacing.xs }, contentStyle]}>
          <AppText variant="title" align="center">
            Ya forma parte de tu equipo.
          </AppText>
          <AppText variant="body" tone="muted" align="center">
            {productName}
            {variantName ? ` · ${variantName}` : ''}
          </AppText>
        </Animated.View>
      </View>

      <Animated.View style={[{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }, contentStyle]}>
        <AppButton label="Ir a mi equipo" onPress={() => router.replace('/gear')} />
      </Animated.View>
    </View>
  );
}
