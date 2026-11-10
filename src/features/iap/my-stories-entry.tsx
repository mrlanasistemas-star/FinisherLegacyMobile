/**
 * Recuerdos tab section "Mis recuerdos": the stories of the athlete's
 * activated Finisher Legacy Tags as rich cards (cover, event, date) — one
 * wide card for a single story, a horizontal rail for several. Each opens
 * the story, where it is edited and filled with photos. Renders nothing
 * until the athlete has at least one story.
 */

import { router, type Href } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { SectionHeader } from '@/components/ui/section-header';
import { StoryCard } from '@/features/stories/components/story-card';
import { useResponsive } from '@/hooks/use-responsive';
import { useI18n } from '@/i18n';
import { spacing } from '@/theme/tokens';

import { useMyStories } from './use-photo-expansion';

const RAIL_LIMIT = 8;

export function MyStoriesEntry() {
  const { t } = useI18n();
  const { width } = useResponsive();
  const stories = useMyStories();
  const list = stories.data ?? [];
  const count = list.length;

  if (count === 0) return null;

  const full = Math.min(width - spacing.lg * 2, 640);

  return (
    <View>
      <SectionHeader
        title={count === 1 ? t('Mi recuerdo') : t('Mis recuerdos')}
        actionLabel={count > 1 ? t('Ver {count}', { count }) : undefined}
        onAction={count > 1 ? () => router.push('/stories' as Href) : undefined}
        style={{ paddingHorizontal: spacing.lg }}
      />
      {count === 1 ? (
        <View style={{ paddingHorizontal: spacing.lg }}>
          <StoryCard story={list[0]} width={full} height={Math.round(Math.min(full * 0.62, 280))} />
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={Math.min(full * 0.78, 320) + spacing.sm}
          contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}>
          {list.slice(0, RAIL_LIMIT).map((story) => (
            <StoryCard key={story.public_id} story={story} width={Math.min(full * 0.78, 320)} height={220} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}
