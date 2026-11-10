/**
 * Legado tab entry to "Mis historias" (the stories of activated Finisher
 * Legacy Tags), where each story shows its photo space and can be
 * expanded with an in-app purchase. Renders nothing until the athlete has
 * at least one story.
 */

import { router, type Href } from 'expo-router';
import { BookHeart } from 'lucide-react-native';
import { View } from 'react-native';

import { ListGroup, ListRow } from '@/components/ui/list-row';
import { spacing } from '@/theme/tokens';

import { useMyStories } from './use-photo-expansion';

export function MyStoriesEntry() {
  const stories = useMyStories();
  const count = stories.data?.length ?? 0;

  if (count === 0) return null;

  return (
    <View style={{ paddingHorizontal: spacing.lg }}>
      <ListGroup>
        <ListRow
          icon={BookHeart}
          label="Mis historias"
          description="Fotos y espacio de cada historia Legacy"
          value={String(count)}
          onPress={() => router.push((count === 1 && stories.data?.[0] ? `/stories/${stories.data[0].public_id}` : '/stories') as Href)}
          divider={false}
        />
      </ListGroup>
    </View>
  );
}
