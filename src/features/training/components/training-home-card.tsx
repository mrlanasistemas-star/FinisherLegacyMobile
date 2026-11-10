import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import { ChevronRight, Headphones } from 'lucide-react-native';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { PressableScale } from '@/components/motion/pressable-scale';
import { useI18n } from '@/i18n';
import { gradients } from '@/theme/gradients';
import { colors, fontFamily, radius, shadows, spacing } from '@/theme/tokens';

import { useTrainingMessages } from '../use-training';

const TRAINING_HREF = '/training' as Href;

/**
 * "Entrenamientos" entry on Inicio: a light card with a gold headphones
 * medallion and the count of new messages from the athlete's team. While the
 * API isn't available it still shows (with a generic line) — never a fake
 * count.
 */
export function TrainingHomeCard() {
  const { t, tc } = useI18n();
  const messages = useTrainingMessages('all');
  const unheard = messages.data?.pages[0]?.meta.unheard_count ?? 0;
  const line =
    unheard > 0
      ? tc('{count} mensaje nuevo de tu equipo|{count} mensajes nuevos de tu equipo', unheard)
      : t('Escucha a quienes creen en ti mientras entrenas');

  return (
    <PressableScale
      onPress={() => router.push(TRAINING_HREF)}
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={t('Entrenamientos. {line}', { line })}
      style={{
        backgroundColor: colors.card,
        borderRadius: radius.xl,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: unheard > 0 ? colors.gold : colors.hairline,
        padding: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        ...shadows.card,
      }}>
      <LinearGradient
        colors={gradients.gold}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' }}>
        <Headphones size={24} color={colors.onGold} strokeWidth={2} />
      </LinearGradient>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="eyebrow">{t('Envíame ánimo')}</AppText>
        <AppText variant="subtitle" style={{ fontSize: 18 }}>
          {t('Entrenamientos')}
        </AppText>
        <AppText variant="caption" tone="muted" numberOfLines={2}>
          {line}
        </AppText>
      </View>
      {unheard > 0 ? (
        <View style={{ minWidth: 26, height: 26, paddingHorizontal: 7, borderRadius: 13, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center' }}>
          <AppText style={{ fontFamily: fontFamily.bold, fontSize: 12, color: colors.gold }} maxFontSizeMultiplier={1.2}>
            {unheard > 99 ? '99+' : unheard}
          </AppText>
        </View>
      ) : (
        <ChevronRight size={20} color={colors.subtle} />
      )}
    </PressableScale>
  );
}
