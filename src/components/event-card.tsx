import { Image } from 'expo-image';
import { View } from 'react-native';

import { AppText } from './app-text';
import { Card } from './card';

import { formatShortDate } from '@/utils/dates';
import { colors, radius, spacing } from '@/theme/tokens';
import type { EventEditionCard } from '@/types/models';

interface EventCardProps {
  edition: EventEditionCard;
  onPress: () => void;
}

export function EventCard({ edition, onPress }: EventCardProps) {
  const location = [edition.city, edition.state, edition.country].filter(Boolean).join(', ');

  return (
    <Card onPress={onPress} style={{ padding: 0, overflow: 'hidden' }}>
      <View style={{ aspectRatio: 16 / 9, backgroundColor: colors.graphite }}>
        {edition.event.cover_url ? (
          <Image source={{ uri: edition.event.cover_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} />
        ) : null}
      </View>
      <View style={{ padding: spacing.md, gap: spacing.xxs }}>
        <AppText variant="caption" tone="gold">
          {formatShortDate(edition.event_date)}
        </AppText>
        <AppText variant="subtitle" numberOfLines={2}>
          {edition.event.name} {edition.year}
        </AppText>
        {location ? (
          <AppText variant="caption" tone="muted">
            {location}
          </AppText>
        ) : null}
        {edition.distances.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xxs, marginTop: spacing.xs }}>
            {edition.distances.map((distance) => (
              <View
                key={distance}
                style={{
                  paddingVertical: 4,
                  paddingHorizontal: spacing.sm,
                  borderRadius: radius.pill,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}>
                <AppText variant="caption">{distance}</AppText>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </Card>
  );
}
