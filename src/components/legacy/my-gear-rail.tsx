import { router, type Href } from 'expo-router';
import { ChevronRight, Nfc } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { GearIconBadge } from '@/components/brand/gear-icon-badge';
import { PressableScale } from '@/components/motion/pressable-scale';
import { Skeleton } from '@/components/skeleton';
import { SectionHeader } from '@/components/ui/section-header';
import { useMyGear } from '@/hooks/use-gear';
import { useI18n } from '@/i18n';
import { colors, radius, spacing } from '@/theme/tokens';

/**
 * "Mi equipo": the Finisher products connected to this athlete's story.
 * Products join by an NFC tap (see /nfc/[token]) — the empty state teaches
 * that gesture instead of offering a scanner.
 */
export function MyGearRail() {
  const { t } = useI18n();
  const gear = useMyGear();
  const items = gear.data ?? [];

  return (
    <View>
      <SectionHeader
        title={t('Mi equipo')}
        actionLabel={items.length > 0 ? t('Ver {count}', { count: items.length }) : undefined}
        onAction={() => router.push('/gear')}
        style={{ paddingHorizontal: spacing.lg }}
      />
      {gear.isPending && !gear.data ? (
        <View style={{ flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg }}>
          <Skeleton width={124} height={140} radius={16} />
          <Skeleton width={124} height={140} radius={16} />
        </View>
      ) : items.length === 0 ? (
        <PressableScale
          onPress={() => router.push('/activate' as Href)}
          accessibilityRole="button"
          accessibilityLabel={t('Conecta tu equipo: activa tu pieza con NFC')}
          style={{
            marginHorizontal: spacing.lg,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            padding: spacing.md,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: colors.gold,
            backgroundColor: colors.card,
          }}>
          <Nfc size={26} color={colors.accent} />
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="bodyStrong">{t('Conecta tu equipo')}</AppText>
            <AppText variant="caption" tone="muted">
              {t('Acerca tu teléfono a tu Tag, Trisuit o Racepack Finisher Legacy. Quedará aquí, unido a tu historia.')}
            </AppText>
          </View>
          <ChevronRight size={18} color={colors.subtle} />
        </PressableScale>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}>
          {items.slice(0, 10).map((item) => (
            <PressableScale
              key={item.uuid}
              onPress={() => router.push(`/gear/${item.uuid}`)}
              accessibilityRole="button"
              accessibilityLabel={item.activated_at ? t('{name}, producto conectado', { name: item.product_name }) : item.product_name}
              style={{
                width: 124,
                gap: spacing.xs,
                alignItems: 'center',
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.xs,
                borderRadius: radius.lg,
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.hairline,
              }}>
              <GearIconBadge productName={item.product_name} size={48} />
              <AppText variant="caption" numberOfLines={2} align="center">
                {item.product_name}
              </AppText>
              {item.activated_at ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Nfc size={11} color={colors.accent} />
                  <AppText style={{ fontSize: 11, color: colors.accent }}>{t('Conectado')}</AppText>
                </View>
              ) : null}
            </PressableScale>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
