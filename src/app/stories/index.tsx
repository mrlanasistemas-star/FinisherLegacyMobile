/**
 * Mis historias Legacy — the stories of the athlete's activated Finisher
 * Legacy Tags (`/me/stories`). Each row opens the story's photo space
 * screen, where more space can be bought through the store.
 */

import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { BookHeart, ChevronRight } from 'lucide-react-native';
import { FlatList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { BrandRefreshControl } from '@/components/motion/brand-refresh-control';
import { PressableScale } from '@/components/motion/pressable-scale';
import { SkeletonRow } from '@/components/skeleton';
import { TopBar } from '@/components/ui/top-bar';
import { useMyStories } from '@/features/iap/use-photo-expansion';
import { colors, radius, shadows, spacing } from '@/theme/tokens';

export default function MyStoriesScreen() {
  const stories = useMyStories();

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <TopBar title="Mis historias" />
      </View>

      {stories.isPending ? (
        <View style={{ gap: spacing.md, padding: spacing.lg }}>
          <SkeletonRow />
          <SkeletonRow />
        </View>
      ) : stories.isError ? (
        <ErrorState error={stories.error} message="No pudimos cargar tus historias." onRetry={stories.refetch} />
      ) : (
        <FlatList
          data={stories.data}
          keyExtractor={(item) => item.public_id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm, flexGrow: 1 }}
          refreshControl={<BrandRefreshControl refreshing={stories.isRefetching} onRefresh={stories.refetch} />}
          renderItem={({ item }) => (
            <PressableScale
              onPress={() => router.push(`/stories/${item.public_id}` as Href)}
              accessibilityRole="button"
              accessibilityLabel={item.title ?? 'Historia Legacy'}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                padding: spacing.sm,
                borderRadius: radius.lg,
                borderCurve: 'continuous',
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.hairline,
                ...shadows.card,
              }}>
              <View style={{ width: 56, height: 56, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}>
                {item.cover_url ? <Image source={{ uri: item.cover_url }} style={{ width: 56, height: 56 }} contentFit="cover" /> : <BookHeart color={colors.accent} size={22} />}
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyStrong" numberOfLines={1}>
                  {item.title || item.event?.name || 'Historia Legacy'}
                </AppText>
                <AppText variant="caption" tone="subtle" numberOfLines={1}>
                  {[item.event?.name, item.year].filter(Boolean).join(' · ') || `${item.photos.length} fotos`}
                </AppText>
              </View>
              <ChevronRight color={colors.subtle} size={18} />
            </PressableScale>
          )}
          ListEmptyComponent={
            <EmptyState icon={BookHeart} title="Aún no tienes historias" message="Cuando actives tu Finisher Legacy Tag, su historia aparecerá aquí." />
          }
        />
      )}
    </SafeAreaView>
  );
}
