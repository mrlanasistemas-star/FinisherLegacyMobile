import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { Screen } from '@/components/screen';
import { useUiStore } from '@/stores/uiStore';
import { colors, spacing } from '@/theme/tokens';

const SLIDES = [
  {
    title: 'Tus carreras.',
    body: 'Cada meta cruzada, cada kilómetro recorrido. Finisher Legacy guarda tu historia como atleta.',
  },
  {
    title: 'Tus medallas.',
    body: 'Colecciona y revive cada medalla que ganaste, con el detalle real de cada evento.',
  },
  {
    title: 'Tu Legacy.',
    body: 'Reclama tu Legacy Code, construye tu identidad deportiva y compártela con el mundo.',
  },
];

export default function OnboardingScreen() {
  const { width } = useWindowDimensions();
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
    <Screen padded={false}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={{ flex: 1 }}>
        {SLIDES.map((slide) => (
          <View key={slide.title} style={{ width, paddingHorizontal: spacing.lg, justifyContent: 'center' }}>
            <Image
              source={require('@/assets/images/brand/logo-mark-gold.png')}
              style={styles.mark}
              contentFit="contain"
            />
            <AppText variant="display" style={{ marginTop: spacing.xl }}>
              {slide.title}
            </AppText>
            <AppText variant="body" tone="muted" style={{ marginTop: spacing.sm }}>
              {slide.body}
            </AppText>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((slide, dotIndex) => (
            <View
              key={slide.title}
              style={[styles.dot, dotIndex === index && styles.dotActive]}
            />
          ))}
        </View>
        <AppButton label={isLast ? 'Comenzar' : 'Siguiente'} onPress={next} />
        {!isLast && <AppButton label="Omitir" variant="ghost" onPress={finish} />}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  mark: { width: 56, height: 56 },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
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
