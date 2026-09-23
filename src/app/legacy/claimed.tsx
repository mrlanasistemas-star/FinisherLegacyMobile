import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Check } from 'lucide-react-native';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { GoldGlow } from '@/components/brand/gold-glow';
import { useMedal, useMedals } from '@/hooks/use-medals';
import { colors, radius, spacing } from '@/theme/tokens';

export default function LegacyClaimedScreen() {
  const { code, medalUuid } = useLocalSearchParams<{ code: string; medalUuid?: string }>();
  const { data: medal } = useMedal(medalUuid ?? '');
  // The claim mutation already invalidated the medals list, so this total
  // reflects the count *after* this claim — 1 means it really was the
  // first (AGENTS.md §170), read from real data, never guessed.
  const medals = useMedals();
  const isFirstMedal = medals.data?.pages[0]?.meta.total === 1;

  const glow = useSharedValue(0);
  const badgeScale = useSharedValue(0.4);
  const contentOpacity = useSharedValue(0);
  const imageScale = useSharedValue(0.85);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    glow.value = withTiming(1, { duration: 900 });
    badgeScale.value = withSpring(1, { damping: 10, stiffness: 120 });
    imageScale.value = withDelay(200, withSpring(1, { damping: 14, stiffness: 100 }));
    contentOpacity.value = withDelay(350, withTiming(1, { duration: 500 }));
  }, [badgeScale, contentOpacity, glow, imageScale]);

  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value, transform: [{ scale: 0.6 + glow.value * 0.6 }] }));
  const badgeStyle = useAnimatedStyle(() => ({ transform: [{ scale: badgeScale.value }] }));
  const contentStyle = useAnimatedStyle(() => ({ opacity: contentOpacity.value, transform: [{ translateY: (1 - contentOpacity.value) * 12 }] }));
  const imageStyle = useAnimatedStyle(() => ({ transform: [{ scale: imageScale.value }], opacity: contentOpacity.value }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.black }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, paddingHorizontal: spacing.xl }}>
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={[{ position: 'absolute' }, glowStyle]}>
            <GoldGlow size={220} intensity={1.3} />
          </Animated.View>

          {medal?.front_image_url ? (
            <Animated.View style={imageStyle}>
              <Image
                source={{ uri: medal.front_image_url }}
                style={{ width: 140, height: 140 }}
                contentFit="contain"
              />
            </Animated.View>
          ) : (
            <Animated.View
              style={[
                {
                  width: 88,
                  height: 88,
                  borderRadius: radius.pill,
                  backgroundColor: colors.gold,
                  alignItems: 'center',
                  justifyContent: 'center',
                },
                badgeStyle,
              ]}>
              <Check color={colors.black} size={40} strokeWidth={3} />
            </Animated.View>
          )}
        </View>

        <Animated.View style={[{ alignItems: 'center', gap: spacing.xs }, contentStyle]}>
          <AppText variant="title" align="center">
            {isFirstMedal ? 'Tu primera historia ya está aquí.' : 'Esta historia ya forma parte de tu Legacy.'}
          </AppText>
          <AppText variant="body" tone="muted" align="center">
            Legacy Code {code}
          </AppText>
        </Animated.View>
      </View>

      <Animated.View style={[{ gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }, contentStyle]}>
        {medalUuid ? (
          <>
            <AppButton label="Compartir como Legacy Moment" onPress={() => router.replace(`/moments/create?medalUuid=${medalUuid}`)} />
            <AppButton label="Ver mi medalla" variant="secondary" onPress={() => router.replace(`/medals/${medalUuid}`)} />
          </>
        ) : (
          <AppButton label="Ir a mi Legacy" onPress={() => router.replace('/legacy')} />
        )}
      </Animated.View>
    </View>
  );
}
