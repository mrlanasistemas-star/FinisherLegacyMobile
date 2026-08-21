import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import { GlassSurface } from '@/components/brand/glass-surface';

import { colors, radius, spacing } from '@/theme/tokens';

interface MascotGuideBubbleProps {
  /** One message, or several — tapping the mascot cycles through them (a real interaction, not a static PNG). */
  messages: string[];
  portraitSize?: number;
  /** Tighter padding/line-height — the guide should support the screen, never dominate it (FASE 3). */
  compact?: boolean;
  style?: object;
}

/**
 * The Legacy Guide — always-visible mascot moment for Welcome/Login/Register
 * (unlike MascotTip, which shows once and hides forever). Tapping the
 * portrait gives a light reaction and cycles to the next line, never a
 * chatbot (AGENTS.md §121/§125/§192).
 */
export function MascotGuideBubble({ messages, portraitSize = 44, compact = false, style }: MascotGuideBubbleProps) {
  const [index, setIndex] = useState(0);
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);

  function handleTap() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    scale.value = withSequence(withTiming(0.96, { duration: 90 }), withTiming(1, { duration: 140 }));
    rotate.value = withSequence(withTiming(-2, { duration: 90 }), withTiming(0, { duration: 140 }));
    if (messages.length > 1) setIndex((prev) => (prev + 1) % messages.length);
  }

  const portraitStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
  }));

  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }, style]}>
      <Pressable onPress={handleTap} accessibilityRole="button" accessibilityLabel="Tu Legacy Guide">
        <Animated.View
          style={[
            {
              width: portraitSize,
              height: portraitSize,
              borderRadius: portraitSize / 2,
              borderWidth: 1.5,
              borderColor: colors.gold,
              overflow: 'hidden',
              backgroundColor: colors.graphite,
            },
            portraitStyle,
          ]}>
          <Image source={require('@/assets/images/brand/mascot-hero.png')} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        </Animated.View>
      </Pressable>

      <GlassSurface rounded={false} intensity={45} style={{ flex: 1, borderRadius: radius.md, borderColor: colors.goldDim }}>
        <AppText
          variant="caption"
          numberOfLines={compact ? 2 : undefined}
          style={{
            paddingVertical: compact ? spacing.xs : spacing.sm,
            paddingHorizontal: spacing.sm,
            fontSize: compact ? 12 : undefined,
            lineHeight: compact ? 16 : undefined,
          }}>
          {messages[index]}
        </AppText>
      </GlassSurface>
    </View>
  );
}
