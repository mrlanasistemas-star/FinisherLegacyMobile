import { Image } from 'expo-image';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { PressableScale } from '@/components/motion/pressable-scale';

import { formatShortDate } from '@/utils/dates';
import { colors, radius, shadows, spacing } from '@/theme/tokens';
import type { Medal } from '@/types/models';

interface MedalHeroTileProps {
  medal: Medal;
  onPress: () => void;
  width?: number;
}

/** Medal as a trophy/object, not a miniature icon — used in the Home carousel (AGENTS.md §19/§20). */
export function MedalHeroTile({ medal, onPress, width = 168 }: MedalHeroTileProps) {
  const title = medal.title ?? medal.event_name ?? medal.event_name_manual ?? 'Medalla';

  return (
    <PressableScale onPress={onPress} haptic accessibilityRole="button" accessibilityLabel={title} style={{ width }}>
      <View
        style={{
          width,
          height: width,
          borderRadius: radius.lg,
          borderCurve: 'continuous',
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.hairline,
          alignItems: 'center',
          justifyContent: 'center',
          ...shadows.soft,
        }}>
        {medal.front_image_url ? (
          <Image
            source={{ uri: medal.front_image_url }}
            style={{ width: '78%', height: '78%' }}
            contentFit="contain"
            transition={200}
          />
        ) : (
          <View style={{ width: '55%', height: '55%', borderRadius: 999, backgroundColor: colors.surfaceMuted }} />
        )}
        {medal.distance_label ? (
          <View
            style={{
              position: 'absolute',
              top: spacing.xs,
              right: spacing.xs,
              backgroundColor: colors.goldWash,
              borderRadius: radius.pill,
              paddingHorizontal: spacing.xs,
              paddingVertical: 2,
            }}>
            <AppText variant="caption" tone="accent" style={{ fontWeight: '600', fontSize: 12 }}>
              {medal.distance_label}
            </AppText>
          </View>
        ) : null}
      </View>
      <AppText variant="bodyStrong" numberOfLines={1} style={{ marginTop: spacing.xs }}>
        {title}
      </AppText>
      {medal.event_date ? (
        <AppText variant="caption" tone="muted">
          {formatShortDate(medal.event_date)}
        </AppText>
      ) : null}
    </PressableScale>
  );
}
