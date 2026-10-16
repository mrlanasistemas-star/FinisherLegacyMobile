import { router } from 'expo-router';
import { Shirt } from 'lucide-react-native';
import { FlatList, RefreshControl, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { MascotTip } from '@/components/brand/mascot-tip';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { GearCard } from '@/components/gear-card';
import { Screen } from '@/components/screen';
import { Skeleton } from '@/components/skeleton';
import { useMyGear } from '@/hooks/use-gear';
import { spacing } from '@/theme/tokens';

export default function GearScreen() {
  const { data, isPending, isError, refetch, isRefetching } = useMyGear();
  const gear = data ?? [];

  const header = (
    <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md }}>
      <AppText variant="hero" style={{ fontSize: 40, lineHeight: 40 }}>
        MI EQUIPO
      </AppText>
      <AppText variant="body" tone="muted" style={{ marginTop: spacing.xxs, marginBottom: spacing.md }}>
        Mi equipo — tus productos conectados a tu historia
      </AppText>
      <MascotTip
        id="gear-intro"
        message="Acerca tu teléfono a la etiqueta NFC de tu placa, prenda o accesorio y quedará aquí, listo para acompañarte en tu próxima carrera."
        style={{ marginBottom: spacing.md }}
      />
      <AppButton
        label="Tengo un código impreso"
        variant="secondary"
        onPress={() => router.push('/gear/claim')}
        fullWidth={false}
        style={{ paddingHorizontal: spacing.xl }}
      />
    </View>
  );

  return (
    <Screen edges={['top', 'left', 'right']} padded={false}>
      {isPending ? (
        <View style={{ gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
          <Skeleton height={40} width={220} />
          <Skeleton height={80} radius={16} />
          <Skeleton height={80} radius={16} />
        </View>
      ) : isError ? (
        <ErrorState message="No pudimos cargar tu equipo." onRetry={refetch} />
      ) : gear.length === 0 ? (
        <View>
          {header}
          <EmptyState
            icon={Shirt}
            title="Aún no conectas tu equipo"
            message="Acerca tu teléfono a la etiqueta de tu placa, prenda o accesorio Finisher Legacy y aparecerá aquí."
            actionLabel="Tengo un código impreso"
            onAction={() => router.push('/gear/claim')}
          />
        </View>
      ) : (
        <FlatList
          data={gear}
          keyExtractor={(item) => item.uuid}
          ListHeaderComponent={header}
          contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          renderItem={({ item }) => <GearCard gear={item} onPress={() => router.push(`/gear/${item.uuid}`)} />}
        />
      )}
    </Screen>
  );
}
