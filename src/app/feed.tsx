import { router } from 'expo-router';
import { Compass, Plus, Search, Users } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Skeleton } from '@/components/skeleton';
import { MomentCard } from '@/components/social/moment-card';
import { IconButton } from '@/components/ui/icon-button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { TopBar } from '@/components/ui/top-bar';
import { useFeed } from '@/hooks/use-social';
import { colors, spacing } from '@/theme/tokens';
import type { LegacyMoment } from '@/types/social';

type Scope = 'following' | 'discover';

/**
 * The community: Moments from athletes you follow (and your own), or
 * "Descubrir" for everyone's public ones. Cursor-paginated, pull to
 * refresh, no autoplaying video.
 */
export default function FeedScreen() {
  const [scope, setScope] = useState<Scope>('following');
  const feed = useFeed(scope);
  const moments = useMemo<LegacyMoment[]>(() => feed.data?.pages.flatMap((p) => p.data) ?? [], [feed.data]);

  const renderItem = useCallback(({ item }: { item: LegacyMoment }) => <MomentCard moment={item} />, []);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.black }}>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <TopBar
          title="Comunidad"
          right={
            <>
              <IconButton icon={Search} label="Buscar" onPress={() => router.push('/explore')} />
              <IconButton icon={Plus} label="Crear momento" onPress={() => router.push('/moments/create')} color={colors.gold} />
            </>
          }
        />
        <SegmentedControl
          value={scope}
          onChange={setScope}
          options={[
            { value: 'following', label: 'Siguiendo' },
            { value: 'discover', label: 'Descubrir' },
          ]}
        />
      </View>

      {feed.isPending ? (
        <View style={{ padding: spacing.lg, gap: spacing.lg }}>
          <Skeleton height={48} width="60%" />
          <Skeleton height={280} radius={0} />
          <Skeleton height={48} width="60%" />
        </View>
      ) : feed.isError ? (
        <ErrorState error={feed.error} message="No pudimos cargar la comunidad." onRetry={feed.refetch} />
      ) : (
        <FlatList
          data={moments}
          keyExtractor={(item) => item.uuid}
          renderItem={renderItem}
          contentContainerStyle={{ paddingTop: spacing.sm, paddingBottom: spacing.xxl, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={feed.isRefetching && !feed.isFetchingNextPage} onRefresh={feed.refetch} tintColor={colors.gold} />}
          onEndReachedThreshold={0.5}
          onEndReached={() => feed.hasNextPage && !feed.isFetchingNextPage && feed.fetchNextPage()}
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          windowSize={7}
          removeClippedSubviews
          ListFooterComponent={feed.isFetchingNextPage ? <Skeleton height={200} radius={0} style={{ marginTop: spacing.md }} /> : null}
          ListEmptyComponent={
            scope === 'following' ? (
              <EmptyState
                icon={Users}
                title="Tu comunidad está por empezar"
                message="Sigue a otros atletas para ver aquí sus carreras, medallas y entrenamientos. Tus propios momentos también aparecen aquí."
                actionLabel="Encontrar atletas"
                onAction={() => router.push('/explore')}
                secondaryLabel="Ver lo más reciente"
                onSecondary={() => setScope('discover')}
              />
            ) : (
              <EmptyState
                icon={Compass}
                title="Aún no hay momentos públicos"
                message="Sé el primero en compartir un entrenamiento, una carrera o un recuerdo."
                actionLabel="Crear un momento"
                onAction={() => router.push('/moments/create')}
              />
            )
          }
        />
      )}
    </SafeAreaView>
  );
}
