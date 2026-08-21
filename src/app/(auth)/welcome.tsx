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
import { AppLink } from '@/components/ui/app-link';
import { useResponsive } from '@/hooks/use-responsive';
import { colors, spacing } from '@/theme/tokens';

const HERO_VIDEO_URL = 'https://finisherlegacy.com/media/home/hero/finisher-hero-desktop.mp4';

const GUIDE_MESSAGES = ['Hola. Soy tu Legacy Guide — te acompaño a preservar cada meta que cruces.'];

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { height, isShort, isTall } = useResponsive();
  const heroHeight = Math.min(Math.round(height * (isShort ? 0.36 : isTall ? 0.46 : 0.42)), 380);

  return (
    <View style={{ flex: 1, backgroundColor: colors.black }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: spacing.lg }}
        showsVerticalScrollIndicator={false}
        bounces={false}>
        <CinematicHero videoUri={HERO_VIDEO_URL} fallback={<HeroFallback />} height={heroHeight} gradient="full">
          <View style={{ flex: 1, paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.lg, justifyContent: 'space-between' }}>
            <Image
              source={require('@/assets/images/brand/logo-horizontal-gold.png')}
              style={{ width: 150, height: 22 }}
              contentFit="contain"
            />

            <Reveal delay={100} style={{ paddingBottom: spacing.md }}>
              <AppText variant="hero" style={{ color: colors.foreground, fontSize: isShort ? 30 : 36, lineHeight: isShort ? 32 : 38 }}>
                TU META TERMINA.
              </AppText>
              <AppText variant="hero" tone="gold" style={{ fontSize: isShort ? 30 : 36, lineHeight: isShort ? 32 : 38 }}>
                TU HISTORIA NO.
              </AppText>
            </Reveal>
          </View>
        </CinematicHero>

        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
          <Reveal delay={160}>
            <MascotGuideBubble messages={GUIDE_MESSAGES} portraitSize={40} compact />
          </Reveal>

          <Reveal delay={210} style={{ marginTop: spacing.sm }}>
            <AppText variant="caption" tone="muted" align="center" style={{ maxWidth: 320, alignSelf: 'center', lineHeight: 19 }}>
              Finisher Legacy transforma cada logro deportivo en una historia que puedes conservar, revivir y compartir.
            </AppText>
          </Reveal>
        </View>
      </ScrollView>

      {/* CTA pinned to the true bottom of the screen — solid black, same tone
          as the page itself, so it never reads as a dark strip or glass
          overlay, just the natural floor of the screen. */}
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: insets.bottom + spacing.md, backgroundColor: colors.black }}>
        <Reveal delay={260}>
          <AppButton label="EMPEZAR MI LEGACY" variant="legacy" onPress={() => router.push('/register')} />
        </Reveal>

        <Reveal delay={300} style={{ flexDirection: 'row', justifyContent: 'center', marginTop: spacing.sm }}>
          <AppLink label="Ya tengo cuenta" onPress={() => router.push('/login')} />
        </Reveal>
      </View>
    </View>
  );
}
