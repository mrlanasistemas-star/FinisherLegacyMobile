import { Image } from 'expo-image';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { PressScale } from '@/components/motion/press-scale';

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
    <PressScale onPress={onPress} haptic style={{ width }}>
      <View
        style={{
          width,
          height: width,
          borderRadius: radius.xl,
          backgroundColor: colors.graphite,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          ...shadows.card,
        }}>
        {medal.front_image_url ? (
          <Image
            source={{ uri: medal.front_image_url }}
            style={{ width: '78%', height: '78%' }}
            contentFit="contain"
            transition={200}
          />
        ) : (
          <View style={{ width: '55%', height: '55%', borderRadius: 999, backgroundColor: colors.graphiteLight }} />
        )}
        {medal.distance_label ? (
          <View
            style={{
              position: 'absolute',
              top: spacing.xs,
              right: spacing.xs,
              backgroundColor: 'rgba(10,10,12,0.75)',
              borderRadius: radius.pill,
              paddingHorizontal: spacing.xs,
              paddingVertical: 2,
            }}>
            <AppText variant="caption" tone="gold">
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
    </PressScale>
  );
}
