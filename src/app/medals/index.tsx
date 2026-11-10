import { router } from 'expo-router';
import { ChevronLeft, Medal as MedalIcon, Plus } from 'lucide-react-native';
import { useMemo } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { MedalCard } from '@/components/medal-card';
import { BrandRefreshControl } from '@/components/motion/brand-refresh-control';
import { StaggerItem } from '@/components/motion/reveal';
import { ScrollHeader, useScrollY } from '@/components/motion/scroll-header';
import { SkeletonCard } from '@/components/skeleton';
import { IconButton } from '@/components/ui/icon-button';
import { useMedals } from '@/hooks/use-medals';
import { colors, spacing } from '@/theme/tokens';
import type { Medal } from '@/types/models';

const NAV_HEIGHT = 52;

/** Medallas — a light gallery of every medal, large title collapsing into the nav bar. */
export default function MedalsScreen() {
  const insets = useSafeAreaInsets();
  const { scrollY, onScroll } = useScrollY();
  const { data, isPending, isError, error, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } = useMedals();

  const medals = useMemo<Medal[]>(() => data?.pages.flatMap((page) => page.data) ?? [], [data]);
  const total = data?.pages[0]?.meta.total ?? medals.length;
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/legacy'));

  const header = (
    <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: 2 }}>
      <AppText variant="display" accessibilityRole="header">
        Medallas
      </AppText>
      {total > 0 ? (
        <AppText variant="body" tone="muted">
          {total === 1 ? '1 medalla en tu colección' : `${total} medallas en tu colección`}
        </AppText>
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Animated.FlatList
        onScroll={onScroll}
        scrollEventThrottle={16}
        data={isPending || isError ? [] : medals}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        ListHeaderComponent={header}
        columnWrapperStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}
        contentContainerStyle={{ gap: spacing.sm, paddingTop: insets.top + NAV_HEIGHT, paddingBottom: insets.bottom + spacing.xl, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<BrandRefreshControl refreshing={isRefetching} onRefresh={refetch} progressViewOffset={insets.top + NAV_HEIGHT} />}
        onEndReachedThreshold={0.4}
        onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
        renderItem={({ item, index }) => (
          <StaggerItem index={index} style={{ flex: 1 / 2 }}>
            <MedalCard medal={item} onPress={() => router.push(`/medals/${item.id}`)} />
          </StaggerItem>
        )}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={{ flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg }}>
              <SkeletonCard mediaHeight={150} style={{ flex: 1 }} />
              <SkeletonCard mediaHeight={150} style={{ flex: 1 }} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          isPending ? (
            <View style={{ flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg }}>
              <SkeletonCard mediaHeight={150} style={{ flex: 1 }} />
              <SkeletonCard mediaHeight={150} style={{ flex: 1 }} />
            </View>
          ) : isError ? (
            <ErrorState error={error} message="No pudimos cargar tus medallas." onRetry={refetch} />
          ) : (
            <EmptyState
              icon={MedalIcon}
              title="Tu primera medalla"
              message="Guarda cada medalla con su foto y su historia. Aparecerán aquí, como en una vitrina."
              actionLabel="Agregar medalla"
              onAction={() => router.push('/medals/create')}
            />
          )
        }
      />

      <ScrollHeader
        scrollY={scrollY}
        title="Medallas"
        threshold={60}
        left={<IconButton icon={ChevronLeft} label="Volver" onPress={goBack} size={26} />}
        right={<IconButton icon={Plus} label="Agregar medalla" onPress={() => router.push('/medals/create')} color={colors.accent} />}
      />
    </View>
  );
}
