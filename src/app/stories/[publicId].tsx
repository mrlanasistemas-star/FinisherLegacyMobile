/**
 * One Legacy story (owner view): its photos and its photo space. The
 * quota card shows used / limit from the backend and, when the store can
 * sell it, "Ampliar espacio" → in-app purchase (StoreKit 2 / Play Billing).
 * "Ver historia completa" opens its public page.
 */

import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ExternalLink } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { ErrorState } from '@/components/error-state';
import { BrandRefreshControl } from '@/components/motion/brand-refresh-control';
import { Skeleton } from '@/components/skeleton';
import { TopBar } from '@/components/ui/top-bar';
import { StoryQuotaCard } from '@/features/iap/story-quota-card';
import { useStory, useStoryQuota } from '@/features/iap/use-photo-expansion';
import { useResponsive } from '@/hooks/use-responsive';
import { colors, radius, spacing } from '@/theme/tokens';

const GAP = spacing.xs;

export default function StoryScreen() {
  const { publicId = '' } = useLocalSearchParams<{ publicId?: string }>();
  const story = useStory(publicId);
  const quota = useStoryQuota(publicId);
  const { width } = useResponsive();
  const tile = Math.floor((Math.min(width, 640) - spacing.lg * 2 - GAP * 2) / 3);

  const refresh = () => {
    void story.refetch();
    void quota.refetch();
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <TopBar title="Historia" />
      </View>

      {story.isError ? (
        <ErrorState error={story.error} message="No pudimos abrir esta historia." onRetry={story.refetch} />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg }}
          refreshControl={<BrandRefreshControl refreshing={story.isRefetching} onRefresh={refresh} />}>
          {story.isPending ? (
            <Skeleton width={220} height={32} />
          ) : (
            <View style={{ gap: spacing.xxs }}>
              <AppText variant="eyebrow">{[story.data?.event?.name, story.data?.year].filter(Boolean).join(' · ') || 'Historia Legacy'}</AppText>
              <AppText variant="display" accessibilityRole="header">
                {story.data?.title || 'Mi historia'}
              </AppText>
            </View>
          )}

          {story.data?.is_owner !== false ? <StoryQuotaCard storyPublicId={publicId} /> : null}

          {story.data && story.data.photos.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
              {story.data.photos.map((photo) => {
                const uri = photo.thumb_url ?? photo.url;
                return (
                  <View key={String(photo.id)} style={{ width: tile, height: tile, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surfaceMuted }}>
                    {uri ? <Image source={{ uri }} style={{ width: tile, height: tile }} contentFit="cover" accessibilityIgnoresInvertColors /> : null}
                  </View>
                );
              })}
            </View>
          ) : story.data ? (
            <AppText variant="body" tone="muted">
              Esta historia aún no tiene fotos.
            </AppText>
          ) : null}

          {story.data?.web_url ? (
            <AppButton label="Ver historia completa" variant="secondary" icon={ExternalLink} onPress={() => void WebBrowser.openBrowserAsync(story.data!.web_url!)} />
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
