import { router } from 'expo-router';
import { useRef, useState, type ReactNode } from 'react';
import { Pressable, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { useDeviceTilt, useHeroActive, type Tilt } from '@/components/brand/hero/hero-motion';
import { MemoryStack } from '@/components/brand/hero/memory-stack';
import { MonogramSheen } from '@/components/brand/hero/monogram-sheen';
import { TagScene } from '@/components/brand/hero/tag-scene';
import { Reveal } from '@/components/motion/reveal';
import { AppLink } from '@/components/ui/app-link';
import { colors, spacing } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';
import { useI18n, type Translate } from '@/i18n';

interface Step {
  key: 'brand' | 'nfc' | 'memory';
  eyebrow: string;
  title: string;
  body: string;
}

/** Built at render time with the screen's translator, so the copy follows the app language. */
function buildSteps(t: Translate): Step[] {
  return [
    {
      key: 'brand',
      eyebrow: 'Make it last',
      title: 'Finisher Legacy',
      body: t('Tus carreras convertidas en piezas que se conservan, se reviven y se comparten.'),
    },
    {
      key: 'nfc',
      eyebrow: t('Paso {number}', { number: 1 }),
      title: t('Acércalo.'),
      body: t('Tu Tag, Trisuit o Racepack tiene un chip NFC. Acércalo a tu teléfono y se activa en segundos.'),
    },
    {
      key: 'memory',
      eyebrow: t('Paso {number}', { number: 2 }),
      title: t('Revive y comparte.'),
      body: t('Tu resultado, tus fotos y los mensajes de tu comunidad, guardados en un solo recuerdo.'),
    },
  ];
}

/**
 * Single light welcome: three swipeable panels with animated hero art
 * (monogram sheen → NFC tag + phone → fanning memory cards) and the account
 * CTAs always visible. Art moves at 0.6× scroll speed against the copy; all
 * loops pause when unfocused and are static under Reduce Motion.
 */
export default function WelcomeScreen() {
  const { t } = useI18n();
  const steps = buildSteps(t);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const active = useHeroActive();
  const tilt = useDeviceTilt(active);
  const scrollX = useSharedValue(0);
  const [page, setPage] = useState(0);
  const pagerRef = useRef<Animated.ScrollView>(null);
  // Art scales with the viewport so 360×640 phones fit art + copy + CTAs without clipping.
  const artSize = Math.round(Math.min(width - spacing.lg * 2, height * 0.36, 320));

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });

  function onMomentumEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    if (next !== page) {
      haptics.selection();
      setPage(next);
    }
  }

  function goTo(index: number) {
    pagerRef.current?.scrollTo({ x: index * width, animated: true });
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Animated.ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={onMomentumEnd}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + spacing.lg }}>
        {steps.map((step, index) => (
          // overflow hidden: each page clips its own art, so parallax never lets a neighbour's art bleed in.
          <View key={step.key} style={{ width, paddingHorizontal: spacing.lg, justifyContent: 'center', overflow: 'hidden' }}>
            <ArtLayer index={index} scrollX={scrollX} width={width} size={artSize}>
              {index === 0 ? (
                <BrandArt size={artSize} markWidth={Math.min(Math.round(width * 0.6), artSize)} active={active && page === 0} tilt={tilt} />
              ) : index === 1 ? (
                <TagScene size={artSize} active={active && page === 1} tilt={tilt} />
              ) : (
                <MemoryStack size={artSize} active={active && page === 2} tilt={tilt} />
              )}
            </ArtLayer>
            <StepCopy step={step} index={index} scrollX={scrollX} width={width} />
          </View>
        ))}
      </Animated.ScrollView>

      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: insets.bottom + spacing.md, gap: spacing.md }}>
        <Indicator scrollX={scrollX} width={width} count={steps.length} onSelect={goTo} />
        <Reveal delay={200}>
          <AppButton label={t('Crear mi cuenta')} onPress={() => router.push('/register')} />
        </Reveal>
        <Reveal delay={260} style={{ alignItems: 'center' }}>
          <AppLink label={t('Ya tengo cuenta')} onPress={() => router.push('/login')} />
        </Reveal>
      </View>
    </View>
  );
}

/** Art moves at 0.6× the page speed (parallax against the copy) and eases down in scale off-center. */
function ArtLayer({ index, scrollX, width, size, children }: { index: number; scrollX: SharedValue<number>; width: number; size: number; children: ReactNode }) {
  const style = useAnimatedStyle(() => {
    const p = scrollX.value / width - index;
    return {
      opacity: interpolate(Math.abs(p), [0, 0.9], [1, 0.2], Extrapolation.CLAMP),
      transform: [{ translateX: p * width * 0.4 }, { scale: interpolate(Math.abs(p), [0, 1], [1, 0.88], Extrapolation.CLAMP) }],
    };
  });
  return <Animated.View style={[{ alignSelf: 'center', width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>{children}</Animated.View>;
}

function BrandArt({ size, markWidth, active, tilt }: { size: number; markWidth: number; active: boolean; tilt: Tilt }) {
  const style = useAnimatedStyle(() => ({
    // Nudged a touch below geometric centre: a wide, light mark reads optically high when centred exactly.
    transform: [{ translateY: size * 0.03 }, { perspective: 800 }, { rotateX: `${tilt.rx.value}deg` }, { rotateY: `${tilt.ry.value}deg` }],
  }));
  return (
    <Animated.View style={style}>
      <MonogramSheen width={markWidth} active={active} />
    </Animated.View>
  );
}

function StepCopy({ step, index, scrollX, width }: { step: Step; index: number; scrollX: SharedValue<number>; width: number }) {
  const style = useAnimatedStyle(() => {
    const p = Math.abs(scrollX.value / width - index);
    return {
      opacity: interpolate(p, [0, 0.5], [1, 0], Extrapolation.CLAMP),
      transform: [{ translateY: interpolate(p, [0, 1], [0, 18], Extrapolation.CLAMP) }],
    };
  });
  return (
    <Animated.View style={[{ alignItems: 'center', gap: spacing.xs, marginTop: spacing.lg }, style]}>
      <AppText variant="eyebrow">{step.eyebrow}</AppText>
      <AppText variant="display" align="center" accessibilityRole="header">
        {step.title}
      </AppText>
      <AppText variant="body" tone="muted" align="center" style={{ maxWidth: 330 }}>
        {step.body}
      </AppText>
    </Animated.View>
  );
}

function Indicator({ scrollX, width, count, onSelect }: { scrollX: SharedValue<number>; width: number; count: number; onSelect: (i: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }} accessibilityRole="tablist">
      {Array.from({ length: count }, (_, i) => (
        <Pill key={i} index={i} scrollX={scrollX} width={width} onPress={() => onSelect(i)} />
      ))}
    </View>
  );
}

function Pill({ index, scrollX, width, onPress }: { index: number; scrollX: SharedValue<number>; width: number; onPress: () => void }) {
  const { t } = useI18n();
  const style = useAnimatedStyle(() => {
    const d = Math.min(1, Math.abs(scrollX.value / width - index));
    return {
      width: interpolate(d, [0, 1], [26, 7]),
      opacity: interpolate(d, [0, 1], [1, 0.35]),
    };
  });
  return (
    <Pressable onPress={onPress} hitSlop={10} accessibilityRole="tab" accessibilityLabel={t('Paso {number}', { number: index + 1 })} style={{ height: 24, justifyContent: 'center' }}>
      <Animated.View style={[{ height: 7, borderRadius: 4, backgroundColor: colors.foreground }, style]} />
    </Pressable>
  );
}
