import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { GoldGlow } from '@/components/brand/gold-glow';
import { MetricNumber } from '@/components/brand/metric-number';
import { Reveal } from '@/components/motion/reveal';
import { useUiStore } from '@/stores/uiStore';
import { colors, spacing } from '@/theme/tokens';

const SLIDES = [
  {
    title: 'CORRE',
    body: 'Cada meta empieza mucho antes de cruzar la línea.',
    metric: '10K',
    art: 'metric' as const,
  },
  {
    title: 'PRESERVA',
    body: 'Convierte tu logro en algo que permanece.',
    metric: '03:42:18',
    art: 'metric' as const,
  },
  {
    title: 'CONSTRUYE TU LEGACY',
    body: 'Una carrera es un recuerdo.\nMuchas carreras son tu Legacy.',
    art: 'mascot' as const,
  },
];

export default function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const setHasSeenOnboarding = useUiStore((state) => state.setHasSeenOnboarding);

  const isLast = index === SLIDES.length - 1;

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    if (next !== index) setIndex(next);
  }

  function finish() {
    setHasSeenOnboarding(true);
    router.replace('/welcome');
  }

  function next() {
    if (isLast) {
      finish();
      return;
    }
    scrollRef.current?.scrollTo({ x: width * (index + 1), animated: true });
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.black }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={{ flex: 1 }}>
        {SLIDES.map((slide) => (
          <View key={slide.title} style={{ width, flex: 1 }}>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {slide.art === 'metric' ? (
                <>
                  <GoldGlow size={320} style={{ position: 'absolute' }} />
                  <MetricNumber value={slide.metric!} decorative size={140} />
                </>
              ) : (
                <>
                  <GoldGlow size={280} style={{ position: 'absolute' }} />
                  <Image
                    source={require('@/assets/images/brand/mascot-hero.png')}
                    style={{ width: 220, height: 220 }}
                    contentFit="contain"
                  />
                </>
              )}
            </View>

            <Reveal style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}>
              <AppText variant="hero" style={{ fontSize: 40, lineHeight: 42 }}>
                {slide.title}
              </AppText>
              <AppText variant="body" tone="muted" style={{ marginTop: spacing.sm }}>
                {slide.body}
              </AppText>
            </Reveal>
          </View>
        ))}
      </ScrollView>

      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.md, gap: spacing.sm }}>
        <View style={styles.dots}>
          {SLIDES.map((slide, dotIndex) => (
            <View key={slide.title} style={[styles.dot, dotIndex === index && styles.dotActive]} />
          ))}
        </View>
        <AppButton label={isLast ? 'Comenzar' : 'Siguiente'} onPress={next} />
        {!isLast && <AppButton label="Omitir" variant="ghost" onPress={finish} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.graphiteLight,
  },
  dotActive: {
    backgroundColor: colors.gold,
    width: 20,
  },
});
