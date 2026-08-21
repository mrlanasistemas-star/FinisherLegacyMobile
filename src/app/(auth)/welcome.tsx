import { Image } from 'expo-image';
import { router } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { CinematicHero } from '@/components/brand/cinematic-hero';
import { HeroFallback } from '@/components/brand/hero-fallback';
import { Reveal } from '@/components/motion/reveal';
import { colors, spacing } from '@/theme/tokens';

const HERO_VIDEO_URL = 'https://finisherlegacy.com/media/home/hero/finisher-hero-desktop.mp4';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.black }}>
      <CinematicHero videoUri={HERO_VIDEO_URL} fallback={<HeroFallback />} height="68%" gradient="full">
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

      <View style={{ flex: 1, paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.md, justifyContent: 'center', gap: spacing.sm }}>
        <AppText variant="body" tone="muted" align="center" style={{ marginBottom: spacing.sm }}>
          Finisher Legacy transforma cada logro deportivo en una historia que puedes conservar, revivir y compartir.
        </AppText>
        <AppButton label="Iniciar sesión" onPress={() => router.push('/login')} />
        <AppButton label="Crear cuenta" variant="secondary" onPress={() => router.push('/register')} />
      </View>
    </View>
  );
}
