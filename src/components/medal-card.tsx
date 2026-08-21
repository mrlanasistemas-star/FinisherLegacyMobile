import { Image } from 'expo-image';
import { View } from 'react-native';

import { AppText } from './app-text';
import { GradientOverlay } from './brand/gradient-overlay';
import { PressScale } from './motion/press-scale';

import { formatShortDate } from '@/utils/dates';
import { colors, radius, shadows, spacing } from '@/theme/tokens';
import type { Medal } from '@/types/models';

interface MedalCardProps {
  medal: Medal;
  onPress: () => void;
  aspectRatio?: number;
}

/** Image-dominant, edge-to-edge medal tile — the medal as a trophy, not an icon next to two lines of text (AGENTS.md §23/§79). */
export function MedalCard({ medal, onPress, aspectRatio = 0.82 }: MedalCardProps) {
  const title = medal.title ?? medal.event_name ?? medal.event_name_manual ?? 'Medalla';

  return (
    <PressScale onPress={onPress} haptic style={{ flex: 1 }}>
      <View
        style={{
          aspectRatio,
          borderRadius: radius.lg,
          overflow: 'hidden',
          backgroundColor: colors.graphite,
          borderWidth: 1,
          borderColor: colors.border,
          ...shadows.card,
        }}>
        {medal.front_image_url ? (
          <Image
            source={{ uri: medal.front_image_url }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: '55%', height: '55%', borderRadius: 999, backgroundColor: colors.graphiteLight }} />
          </View>
        )}

        <GradientOverlay variant="bottom" />

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

        <View style={{ position: 'absolute', left: spacing.sm, right: spacing.sm, bottom: spacing.sm }}>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {title}
          </AppText>
          {medal.event_date ? (
            <AppText variant="caption" tone="muted">
              {formatShortDate(medal.event_date)}
            </AppText>
          ) : null}
        </View>
      </View>
    </PressScale>
  );
}
