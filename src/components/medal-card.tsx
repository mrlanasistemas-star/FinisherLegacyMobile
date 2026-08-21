import { Image } from 'expo-image';
import { View } from 'react-native';

import { AppText } from './app-text';
import { Card } from './card';

import { formatShortDate } from '@/utils/dates';
import { spacing } from '@/theme/tokens';
import type { Medal } from '@/types/models';

interface MedalCardProps {
  medal: Medal;
  onPress: () => void;
}

export function MedalCard({ medal, onPress }: MedalCardProps) {
  const title = medal.title ?? medal.event_name ?? medal.event_name_manual ?? 'Medalla';

  return (
    <Card onPress={onPress} style={{ flex: 1, padding: spacing.sm }}>
      <View style={{ aspectRatio: 1, alignItems: 'center', justifyContent: 'center' }}>
        {medal.front_image_url ? (
          <Image
            source={{ uri: medal.front_image_url }}
            style={{ width: '85%', height: '85%' }}
            contentFit="contain"
            transition={200}
          />
        ) : (
          <View style={{ width: '70%', height: '70%', borderRadius: 999, backgroundColor: '#28282F' }} />
        )}
      </View>
      <AppText variant="bodyStrong" numberOfLines={1} style={{ marginTop: spacing.xs }}>
        {title}
      </AppText>
      {medal.event_date ? (
        <AppText variant="caption" tone="muted">
          {formatShortDate(medal.event_date)}
        </AppText>
      ) : null}
    </Card>
  );
}
