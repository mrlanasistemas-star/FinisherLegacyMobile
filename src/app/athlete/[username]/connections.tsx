import { useLocalSearchParams } from 'expo-router';
import { Users } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Skeleton } from '@/components/skeleton';
import { AthleteRow } from '@/components/social/athlete-row';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { TopBar } from '@/components/ui/top-bar';
import { useConnections } from '@/hooks/use-social';
import { colors, spacing } from '@/theme/tokens';
import type { AthleteSummary } from '@/types/social';

type Kind = 'followers' | 'following';

/** Seguidores / Siguiendo — avatar, @username and a follow button per row. */
export default function ConnectionsScreen() {
  const params = useLocalSearchParams<{ username: string; kind?: string }>();
  const username = params.username ?? '';
  const [kind, setKind] = useState<Kind>(params.kind === 'following' ? 'following' : 'followers');
  const list = useConnections(username, kind);
  const rows = useMemo<AthleteSummary[]>(() => list.data?.pages.flatMap((p) => p.data) ?? [], [list.data]);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.black }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
        <TopBar title={`@${username}`} />
        <SegmentedControl
          value={kind}
          onChange={setKind}
          options={[
            { value: 'followers', label: 'Seguidores' },
            { value: 'following', label: 'Siguiendo' },
          ]}
        />
      </View>

      {list.isPending ? (
        <View style={{ padding: spacing.lg, gap: spacing.md }}>
          <Skeleton height={48} />
          <Skeleton height={48} />
          <Skeleton height={48} />
        </View>
      ) : list.isError ? (
        <ErrorState error={list.error} message="No pudimos cargar esta lista." onRetry={list.refetch} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.username ?? item.name}
          renderItem={({ item }) => <AthleteRow athlete={item} />}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={list.isRefetching} onRefresh={list.refetch} tintColor={colors.gold} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && list.fetchNextPage()}
          ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={colors.gold} style={{ marginVertical: spacing.md }} /> : null}
          ListEmptyComponent={
            <EmptyState
              compact
              icon={Users}
              title={kind === 'followers' ? 'Aún sin seguidores' : 'Aún no sigue a nadie'}
              message={kind === 'followers' ? 'Cuando alguien siga este Legacy, aparecerá aquí.' : 'Los atletas que siga aparecerán aquí.'}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}
