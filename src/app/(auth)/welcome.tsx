import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { CinematicHero } from '@/components/brand/cinematic-hero';
import { HeroFallback } from '@/components/brand/hero-fallback';
import { MascotGuideBubble } from '@/components/brand/mascot-guide-bubble';
import { Reveal } from '@/components/motion/reveal';
import { useResponsive } from '@/hooks/use-responsive';
import { colors, spacing } from '@/theme/tokens';

const HERO_VIDEO_URL = 'https://finisherlegacy.com/media/home/hero/finisher-hero-desktop.mp4';

const GUIDE_MESSAGES = [
  'Hola. Soy tu Legacy Guide — voy a acompañarte a preservar cada meta que cruces.',
  'Cada carrera que registres aquí se queda contigo para siempre.',
];

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { height, isShort } = useResponsive();
  const heroHeight = Math.min(Math.round(height * (isShort ? 0.42 : 0.5)), 440);

  return (
    // No flex:1 / minHeight tricks below — the CTA section is sized purely
    // by its own content (text + buttons + fixed padding), so it can never
    // be squeezed into overlapping itself. On short screens the ScrollView
    // simply scrolls; on tall screens there's a little extra breathing
    // room at the bottom, never an overlap or an off-screen button.
    <ScrollView style={{ flex: 1, backgroundColor: colors.black }} showsVerticalScrollIndicator={false} bounces={false}>
      <CinematicHero videoUri={HERO_VIDEO_URL} fallback={<HeroFallback />} height={heroHeight} gradient="full">
        <View style={{ flex: 1, paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.lg, justifyContent: 'space-between' }}>
          <Image
            source={require('@/assets/images/brand/logo-horizontal-gold.png')}
            style={{ width: 168, height: 24 }}
            contentFit="contain"
          />

          <Reveal delay={100} style={{ paddingBottom: spacing.lg }}>
            <AppText variant="hero" style={{ color: colors.foreground }}>
              TU META TERMINA.
            </AppText>
            <AppText variant="hero" tone="gold">
              TU HISTORIA NO.
            </AppText>
          </Reveal>
        </View>
      </CinematicHero>

      <View style={{ paddingHorizontal: spacing.lg }}>
        {/* Overlaps the hero/form boundary so the mascot visually bridges the two areas instead of two blocks glued together (AGENTS.md §204). */}
        <Reveal delay={160} style={{ marginTop: -26, marginBottom: spacing.lg }}>
          <MascotGuideBubble messages={GUIDE_MESSAGES} />
        </Reveal>
      </View>

      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.xl, gap: spacing.md }}>
        <Reveal delay={220}>
          <AppText variant="body" tone="muted" align="center">
            Finisher Legacy transforma cada logro deportivo en una historia que puedes conservar, revivir y compartir.
          </AppText>
        </Reveal>

        <Reveal delay={300} style={{ gap: spacing.md, marginTop: spacing.sm }}>
          <AppButton label="EMPEZAR MI LEGACY" onPress={() => router.push('/register')} />
          <AppButton label="Ya tengo cuenta" variant="secondary" onPress={() => router.push('/login')} />
        </Reveal>
      </View>
    </ScrollView>
  );
}
