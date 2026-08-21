import { Image } from 'expo-image';
import { X } from 'lucide-react-native';
import { Pressable, View, type ViewStyle } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import { GlassSurface } from '@/components/brand/glass-surface';

import { useMascotTip } from '@/hooks/use-mascot-tip';
import { colors, spacing } from '@/theme/tokens';

interface MascotTipProps {
  id: string;
  message: string;
  style?: ViewStyle;
}

/**
 * A single contextual tip from the Legacy Guide mascot — shown once per
 * `id`, dismissible, never a chatbot/blocking modal (AGENTS.md §121/§123).
 */
export function MascotTip({ id, message, style }: MascotTipProps) {
  const { visible, dismiss } = useMascotTip(id);

  if (!visible) return null;

  return (
    <Animated.View entering={FadeInDown.duration(280).springify().damping(18)} exiting={FadeOut.duration(150)} style={style}>
      <GlassSurface rounded={false} intensity={50} style={{ borderRadius: 18, borderColor: colors.goldDim }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm }}>
          <Image
            source={require('@/assets/images/brand/mascot-hero.png')}
            style={{ width: 36, height: 36, borderRadius: 18 }}
            contentFit="cover"
          />
          <AppText variant="caption" style={{ flex: 1 }}>
            {message}
          </AppText>
          <Pressable onPress={dismiss} hitSlop={10} accessibilityRole="button" accessibilityLabel="Cerrar consejo">
            <X color={colors.muted} size={16} />
          </Pressable>
        </View>
      </GlassSurface>
    </Animated.View>
  );
}
