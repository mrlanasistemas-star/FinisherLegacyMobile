/**
 * Mis recuerdos — every story of the athlete's activated Finisher Legacy
 * Tags (`GET /me/stories`) as rich cards: cover, event, date and how many
 * photos it holds. A card opens the story, where it is edited and filled
 * with photos, videos and a voice message.
 */

import { router, type Href } from 'expo-router';
import { BookHeart } from 'lucide-react-native';
import { FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { BrandRefreshControl } from '@/components/motion/brand-refresh-control';
import { StaggerItem } from '@/components/motion/reveal';
import { Skeleton } from '@/components/skeleton';
import { TopBar } from '@/components/ui/top-bar';
import { useMyStories } from '@/features/iap/use-photo-expansion';
import { StoryCard } from '@/features/stories/components/story-card';
import { useResponsive } from '@/hooks/use-responsive';
import { useI18n } from '@/i18n';
import { colors, radius, spacing } from '@/theme/tokens';

export default function MyStoriesScreen() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { width } = useResponsive();
  const stories = useMyStories();
  const side = Math.max(insets.left, insets.right, spacing.lg);
  const cardWidth = Math.min(width - side * 2, 640);
  const cardHeight = Math.round(Math.min(cardWidth * 0.66, 300));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: side }}>
        <TopBar title={t('Mis recuerdos')} />
      </View>

      {stories.isPending ? (
        <View style={{ gap: spacing.md, paddingTop: spacing.sm, alignItems: 'center' }}>
          <Skeleton width={cardWidth} height={cardHeight} radius={radius.xl} />
          <Skeleton width={cardWidth} height={cardHeight} radius={radius.xl} />
        </View>
      ) : stories.isError && !stories.data ? (
        <ErrorState error={stories.error} message={t('No pudimos cargar tus recuerdos.')} onRetry={stories.refetch} />
      ) : (
        <FlatList
          data={stories.data}
          keyExtractor={(item) => item.public_id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ alignItems: 'center', paddingTop: spacing.sm, paddingBottom: insets.bottom + spacing.xxl, gap: spacing.md, flexGrow: 1 }}
          refreshControl={<BrandRefreshControl refreshing={stories.isRefetching} onRefresh={stories.refetch} />}
          renderItem={({ item, index }) => (
            <StaggerItem index={index}>
              <StoryCard story={item} width={cardWidth} height={cardHeight} />
            </StaggerItem>
          )}
          ListEmptyComponent={
            <EmptyState
              icon={BookHeart}
              title={t('Aún no tienes recuerdos')}
              message={t('Cuando actives tu Finisher Legacy Tag, su recuerdo aparecerá aquí para que lo llenes con tu historia y tus fotos.')}
              actionLabel={t('Activar mi Tag')}
              onAction={() => router.push('/activate' as Href)}
            />
          }
        />
      )}
    </View>
  );
}
