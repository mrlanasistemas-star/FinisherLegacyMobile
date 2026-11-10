import { Image } from 'expo-image';
import { View } from 'react-native';

import { AppText } from './app-text';
import { GradientOverlay } from './brand/gradient-overlay';
import { PressableScale } from './motion/pressable-scale';

import { colors, radius, shadows, spacing } from '@/theme/tokens';
import type { EventEditionCard } from '@/types/models';

const MONTHS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

interface EventCardProps {
  edition: EventEditionCard;
  onPress: () => void;
  featured?: boolean;
}

function DateBadge({ isoDate }: { isoDate: string }) {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return null;

  return (
    <View
      style={{
        position: 'absolute',
        top: spacing.sm,
        left: spacing.sm,
        backgroundColor: colors.card,
        borderRadius: radius.md,
        width: 52,
        alignItems: 'center',
        paddingVertical: spacing.xxs,
      }}>
      <AppText variant="title" style={{ fontSize: 20, lineHeight: 22 }}>
        {String(day).padStart(2, '0')}
      </AppText>
      <AppText variant="label" tone="accent">
        {MONTHS[month - 1]}
      </AppText>
    </View>
  );
}

export function EventCard({ edition, onPress, featured = false }: EventCardProps) {
  const location = [edition.city, edition.state, edition.country].filter(Boolean).join(', ');
  const label = [edition.event.name + ' ' + edition.year, location].filter(Boolean).join(', ');

  return (
    <PressableScale onPress={onPress} haptic accessibilityRole="button" accessibilityLabel={label}>
      <View
        style={{
          borderRadius: radius.lg,
          borderCurve: 'continuous',
          overflow: 'hidden',
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.hairline,
          ...shadows.soft,
        }}>
        <View style={{ aspectRatio: featured ? 4 / 3 : 16 / 10, backgroundColor: colors.graphite }}>
          {edition.event.cover_url ? (
            <Image source={{ uri: edition.event.cover_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} />
          ) : null}
          <GradientOverlay variant="bottom" />
          <DateBadge isoDate={edition.event_date} />

          <View style={{ position: 'absolute', left: spacing.md, right: spacing.md, bottom: spacing.md }}>
            <AppText variant={featured ? 'title' : 'subtitle'} tone="onDark" numberOfLines={2}>
              {edition.event.name} {edition.year}
            </AppText>
            {location ? (
              <AppText variant="caption" tone="onDarkMuted" style={{ marginTop: spacing.xxs }}>
                {location}
              </AppText>
            ) : null}
          </View>
        </View>

        {edition.distances.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xxs, padding: spacing.sm }}>
            {edition.distances.map((distance) => (
              <View
                key={distance}
                style={{
                  paddingVertical: 4,
                  paddingHorizontal: spacing.sm,
                  borderRadius: radius.pill,
                  backgroundColor: colors.surfaceMuted,
                }}>
                <AppText variant="caption">{distance}</AppText>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </PressableScale>
  );
}
