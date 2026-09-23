import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Plus, Shirt, Trophy } from 'lucide-react-native';
import { useMemo } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { GoldGlow } from '@/components/brand/gold-glow';
import { MascotTip } from '@/components/brand/mascot-tip';
import { ErrorState } from '@/components/error-state';
import { MedalCard } from '@/components/medal-card';
import { Screen } from '@/components/screen';
import { Skeleton } from '@/components/skeleton';
import { TopBar } from '@/components/ui/top-bar';
import { useMedals } from '@/hooks/use-medals';
import { colors, radius, spacing } from '@/theme/tokens';
import type { Medal } from '@/types/models';

function LegacyHubLink({ icon: Icon, label, onPress }: { icon: typeof Trophy; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.graphite,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.sm,
        opacity: pressed ? 0.85 : 1,
      })}>
      <Icon color={colors.gold} size={16} />
      <AppText variant="caption" tone="default" numberOfLines={1} style={{ flex: 1 }}>
        {label}
      </AppText>
    </Pressable>
  );
}

export default function MedalsScreen() {
  const { data, isPending, isError, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useMedals();

  const medals = useMemo<Medal[]>(() => data?.pages.flatMap((page) => page.data) ?? [], [data]);
  const total = data?.pages[0]?.meta.total ?? medals.length;
  const [featured, ...rest] = medals;

  const header = (
    <View>
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <TopBar />
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View>
            <AppText variant="hero" style={{ fontSize: 40, lineHeight: 40 }}>
              LEGACY
            </AppText>
            <AppText variant="hero" style={{ fontSize: 40, lineHeight: 40 }}>
              VAULT
            </AppText>
            <AppText variant="caption" tone="muted" style={{ marginTop: spacing.xs, letterSpacing: 1 }}>
              {total === 1 ? '1 HISTORIA PRESERVADA' : `${total} HISTORIAS PRESERVADAS`}
            </AppText>
          </View>
          <Pressable
            onPress={() => router.push('/medals/create')}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Agregar medalla"
            style={({ pressed }) => [{ borderRadius: radius.pill, opacity: pressed ? 0.85 : 1 }]}>
            {/* Gradient fill, not a flat color: the flat gold FAB was
                reported as rendering gray/black against the black tab. */}
            <LinearGradient
              colors={[colors.goldSoft, colors.gold]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' }}>
              <Plus color={colors.black} size={20} />
            </LinearGradient>
          </Pressable>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, marginBottom: spacing.md }}>
        <LegacyHubLink icon={Trophy} label="Mis Eventos" onPress={() => router.push('/my-events')} />
        <LegacyHubLink icon={Shirt} label="Mi Equipo" onPress={() => router.push('/gear')} />
      </View>

      <MascotTip
        id="vault-intro"
        message="Aquí vive tu historia. Cada medalla que reclames aparecerá en tu Legacy Vault."
        style={{ marginHorizontal: spacing.lg, marginBottom: spacing.md }}
      />

      {featured ? (
        <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.md }}>
          <MedalCard medal={featured} onPress={() => router.push(`/medals/${featured.id}`)} aspectRatio={16 / 10} />
        </View>
      ) : null}
    </View>
  );

  return (
    <Screen edges={['top', 'left', 'right']} padded={false} style={{ position: 'relative' }}>
      <GoldGlow size={260} style={{ position: 'absolute', top: -60, right: -60 }} />

      {isPending ? (
        <View>
          <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
            <Skeleton width={160} height={40} />
            <Skeleton width={120} height={40} style={{ marginTop: 4 }} />
          </View>
          <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg }}>
            <Skeleton height={200} radius={16} />
          </View>
        </View>
      ) : isError ? (
        <ErrorState message="No pudimos cargar tus medallas." onRetry={refetch} />
      ) : medals.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, gap: spacing.sm }}>
          <Image
            source={require('@/assets/images/brand/mascot-hero.png')}
            style={{ width: 140, height: 140 }}
            contentFit="contain"
          />
          <AppText variant="title" align="center" style={{ marginTop: spacing.sm }}>
            Tu Legacy empieza aquí.
          </AppText>
          <AppText variant="body" tone="muted" align="center">
            Cada carrera merece un lugar en tu historia.
          </AppText>
          <AppButton
            label="Escanear Legacy Code"
            onPress={() => router.push('/legacy/scan')}
            fullWidth={false}
            style={{ paddingHorizontal: spacing.xl, marginTop: spacing.md }}
          />
          <AppButton label="Agregar manualmente" variant="ghost" onPress={() => router.push('/medals/create')} />
        </View>
      ) : (
        <FlatList
          data={rest}
          keyExtractor={(item) => item.id}
          numColumns={2}
          ListHeaderComponent={header}
          columnWrapperStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}
          contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.xl }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => hasNextPage && fetchNextPage()}
          ListFooterComponent={isFetchingNextPage ? <Skeleton height={40} style={{ marginTop: spacing.sm }} /> : null}
          renderItem={({ item }) => <MedalCard medal={item} onPress={() => router.push(`/medals/${item.id}`)} />}
        />
      )}
    </Screen>
  );
}
