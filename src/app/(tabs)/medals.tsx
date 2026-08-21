import { router } from 'expo-router';
import { Medal as MedalIcon, Plus } from 'lucide-react-native';
import { useMemo } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { MedalCard } from '@/components/medal-card';
import { Screen } from '@/components/screen';
import { Skeleton } from '@/components/skeleton';
import { useMedals } from '@/hooks/use-medals';
import { colors, radius, spacing } from '@/theme/tokens';
import type { Medal } from '@/types/models';

export default function MedalsScreen() {
  const { data, isPending, isError, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useMedals();

  const medals = useMemo<Medal[]>(() => data?.pages.flatMap((page) => page.data) ?? [], [data]);

  return (
    <Screen edges={['top', 'left', 'right']} padded={false}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
          paddingBottom: spacing.sm,
        }}>
        <View>
          <AppText variant="title">Legacy Vault</AppText>
          <AppText variant="body" tone="muted">
            Tu colección de medallas
          </AppText>
        </View>
        <Pressable
          onPress={() => router.push('/medals/create')}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Agregar medalla"
          style={{
            backgroundColor: colors.gold,
            borderRadius: radius.pill,
            width: 36,
            height: 36,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Plus color={colors.black} size={20} />
        </Pressable>
      </View>

      {isPending ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.lg }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} width="47%" height={180} radius={16} />
          ))}
        </View>
      ) : isError ? (
        <ErrorState message="No pudimos cargar tus medallas." onRetry={refetch} />
      ) : medals.length === 0 ? (
        <EmptyState
          icon={MedalIcon}
          title="Tu Legacy empieza aquí."
          message="Agrega tu primera medalla o escanea un Legacy Code."
          actionLabel="Escanear Legacy Code"
          onAction={() => router.push('/legacy/scan')}
        />
      ) : (
        <FlatList
          data={medals}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}
          contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.xl }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => hasNextPage && fetchNextPage()}
          ListFooterComponent={isFetchingNextPage ? <Skeleton height={40} style={{ marginTop: spacing.sm }} /> : null}
          renderItem={({ item }) => (
            <MedalCard medal={item} onPress={() => router.push(`/medals/${item.id}`)} />
          )}
        />
      )}
    </Screen>
  );
}
