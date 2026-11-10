import { Image } from 'expo-image';
import { Medal as MedalIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { AppText } from './app-text';
import { PressableScale } from './motion/pressable-scale';

import { useI18n } from '@/i18n';
import { formatShortDate } from '@/utils/dates';
import { colors, radius, shadows, spacing } from '@/theme/tokens';
import type { Medal } from '@/types/models';

interface MedalCardProps {
  medal: Medal;
  onPress: () => void;
  aspectRatio?: number;
}

/** The medal as an object on a warm plinth, with its title on clean white below — light, gallery-like. */
export function MedalCard({ medal, onPress, aspectRatio = 1 }: MedalCardProps) {
  const { t } = useI18n();
  const title = medal.title ?? medal.event_name ?? medal.event_name_manual ?? t('Medalla');

  return (
    <PressableScale
      onPress={onPress}
      haptic
      accessibilityRole="button"
      accessibilityLabel={`${title}${medal.event_date ? `, ${formatShortDate(medal.event_date)}` : ''}`}
      style={{
        flex: 1,
        borderRadius: radius.lg,
        borderCurve: 'continuous',
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.hairline,
        overflow: 'hidden',
        ...shadows.soft,
      }}>
      <View style={{ aspectRatio, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}>
        {medal.front_image_url ? (
          <Image source={{ uri: medal.front_image_url }} style={{ width: '86%', height: '86%' }} contentFit="contain" transition={200} />
        ) : (
          <MedalIcon size={40} color={colors.accent} strokeWidth={1.4} />
        )}
        {medal.distance_label ? (
          <View
            style={{
              position: 'absolute',
              top: spacing.xs,
              right: spacing.xs,
              backgroundColor: colors.card,
              borderRadius: radius.pill,
              paddingHorizontal: spacing.xs,
              paddingVertical: 2,
              borderWidth: 1,
              borderColor: colors.border,
            }}>
            <AppText variant="caption" tone="accent" style={{ fontSize: 12, fontWeight: '600' }}>
              {medal.distance_label}
            </AppText>
          </View>
        ) : null}
      </View>
      <View style={{ paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, gap: 2 }}>
        <AppText variant="bodyStrong" numberOfLines={1} style={{ fontSize: 15 }}>
          {title}
        </AppText>
        {medal.event_date ? (
          <AppText variant="caption" tone="muted" style={{ fontSize: 13 }}>
            {formatShortDate(medal.event_date)}
          </AppText>
        ) : null}
      </View>
    </PressableScale>
  );
}
