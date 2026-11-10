import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import { ChevronRight, Nfc } from 'lucide-react-native';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import { TiltCard } from '@/components/motion/tilt-card';
import { gradients } from '@/theme/gradients';
import { colors, radius, shadows, spacing } from '@/theme/tokens';

const ACTIVATE_HREF = '/activate' as Href;

/**
 * "Activar mi Finisher Legacy" — the product's main action as the one dark
 * accent block on the light Home: carbon card, gold NFC glyph with soft
 * radiating rings, leans toward your finger on press.
 */
export function ActivateCard() {
  return (
    <TiltCard
      onPress={() => router.push(ACTIVATE_HREF)}
      accessibilityLabel="Activar mi Finisher Legacy"
      accessibilityHint="Acerca tu pieza con NFC a tu teléfono para activarla"
      maxTilt={4}
      style={{ borderRadius: radius.xl, ...shadows.card }}>
      <LinearGradient
        colors={gradients.carbon}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: radius.xl, borderCurve: 'continuous', padding: spacing.lg, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View style={{ flex: 1, gap: spacing.xs }}>
          <AppText variant="eyebrow" style={{ color: colors.gold }}>
            NFC · Un toque
          </AppText>
          <AppText variant="subtitle" tone="onDark" style={{ fontSize: 20, lineHeight: 25 }}>
            Activar mi Finisher Legacy
          </AppText>
          <AppText variant="caption" tone="onDarkMuted">
            Acerca tu Tag, Trisuit o Racepack a tu teléfono.
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: spacing.xxs }}>
            <AppText variant="caption" style={{ color: colors.goldSoft, fontWeight: '600' }}>
              Empezar
            </AppText>
            <ChevronRight size={16} color={colors.goldSoft} />
          </View>
        </View>
        <NfcBadge />
      </LinearGradient>
    </TiltCard>
  );
}

function NfcBadge() {
  const reduceMotion = useReducedMotion();
  return (
    <View style={{ width: 84, height: 84, alignItems: 'center', justifyContent: 'center' }}>
      {!reduceMotion ? [0, 1].map((i) => <Ring key={i} delay={i * 1100} />) : null}
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.graphite,
          borderWidth: 1,
          borderColor: colors.goldDim,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Nfc size={26} color={colors.gold} strokeWidth={1.8} />
      </View>
    </View>
  );
}

function Ring({ delay }: { delay: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration: 2200, easing: Easing.out(Easing.quad) }), -1, false));
  }, [delay, t]);
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.15, 1], [0, 0.6, 0]),
    transform: [{ scale: interpolate(t.value, [0, 1], [0.7, 1.5]) }],
  }));
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: 56, height: 56, borderRadius: 28, borderWidth: 1, borderColor: colors.gold }, style]} />;
}
