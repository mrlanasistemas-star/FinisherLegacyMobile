import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Check } from 'lucide-react-native';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { GoldBurst } from '@/components/nfc/gold-burst';
import { StepButton } from '@/components/nfc/step-button';
import { webOrigin } from '@/features/nfc/use-activation';
import { parseHttpUrl } from '@/features/nfc/url-policy';
import { colors, spacing } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';

function ownUrl(url: string | undefined): string | null {
  if (!url) return null;
  const parsed = parseHttpUrl(url);
  if (!parsed || parsed.scheme !== webOrigin.scheme) return null;
  return parsed.host.replace(/^www\./, '') === webOrigin.host.replace(/^www\./, '') ? url : null;
}

function formatCode(code: string): string {
  return (code.replace(/[^A-Za-z0-9]/g, '').toUpperCase().match(/.{1,4}/g) ?? []).join('-');
}

/** Step 5 — activated, verified and confirmed by the backend. */
export default function ActivationSuccessScreen() {
  const insets = useSafeAreaInsets();
  const { tagCode = '', storyUrl, editUrl } = useLocalSearchParams<{ tagCode?: string; storyUrl?: string; editUrl?: string }>();
  const completeUrl = ownUrl(editUrl) ?? ownUrl(storyUrl);

  useEffect(() => {
    haptics.success();
  }, []);

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <GoldBurst size={260} />
          <Animated.View entering={ZoomIn.springify().damping(14).stiffness(160)} style={styles.check}>
            <Check size={40} color={colors.onGold} strokeWidth={2.4} />
          </Animated.View>
        </View>

        <Animated.View entering={FadeInDown.delay(180).springify().damping(20)} style={{ gap: spacing.sm, alignItems: 'center' }}>
          <AppText variant="label" style={{ color: colors.accent, letterSpacing: 2.5 }}>
            ACTIVADO
          </AppText>
          <AppText variant="title" align="center" accessibilityRole="header">
            Tu Finisher Legacy ya es tuyo
          </AppText>
          <AppText variant="body" tone="muted" align="center">
            Quedó escrito y verificado. Cada vez que alguien lo acerque a su teléfono verá tu historia.
          </AppText>
          {tagCode ? (
            <AppText variant="caption" tone="muted" align="center" accessibilityLabel={`Código ${tagCode.split('').join(' ')}`}>
              {formatCode(tagCode)}
            </AppText>
          ) : null}
        </Animated.View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
        {completeUrl ? <StepButton label="Completar mi recuerdo" onPress={() => WebBrowser.openBrowserAsync(completeUrl)} /> : null}
        <StepButton label="Ir a mi Legacy" variant={completeUrl ? 'plain' : 'primary'} onPress={() => router.replace('/legacy')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.xl, gap: spacing.lg },
  hero: { height: 220, alignItems: 'center', justifyContent: 'center' },
  check: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.goldDim,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 3,
  },
  footer: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, gap: spacing.xs, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
});
