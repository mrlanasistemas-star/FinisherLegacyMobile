import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Pencil, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';

import { AppError } from '@/api/errors';
import { AppText } from '@/components/app-text';
import { ErrorState } from '@/components/error-state';
import { Screen } from '@/components/screen';
import { Skeleton } from '@/components/skeleton';
import { useDeleteMedal } from '@/hooks/use-medal-mutations';
import { useMedal } from '@/hooks/use-medals';
import { formatLongDate } from '@/utils/dates';
import { colors, radius, spacing } from '@/theme/tokens';

export default function MedalDetailScreen() {
  const { uuid } = useLocalSearchParams<{ uuid: string }>();
  const { data: medal, isPending, isError, refetch } = useMedal(uuid);
  const deleteMedal = useDeleteMedal();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const title = medal?.title ?? medal?.event_name ?? medal?.event_name_manual ?? 'Medalla';

  function confirmDelete() {
    Alert.alert('Eliminar medalla', '¿Seguro que quieres eliminar esta medalla de tu Legacy Vault?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          setDeleteError(null);
          try {
            await deleteMedal.mutateAsync(uuid);
            router.back();
          } catch (error) {
            setDeleteError(error instanceof AppError ? error.message : 'No pudimos eliminar tu medalla.');
          }
        },
      },
    ]);
  }

  return (
    <Screen scroll edges={['top', 'left', 'right']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Volver">
          <ChevronLeft color={colors.foreground} size={26} />
        </Pressable>
        {medal ? (
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <Pressable
              onPress={() => router.push(`/medals/edit/${uuid}`)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Editar medalla">
              <Pencil color={colors.foreground} size={20} />
            </Pressable>
            <Pressable onPress={confirmDelete} hitSlop={12} accessibilityRole="button" accessibilityLabel="Eliminar medalla">
              <Trash2 color={colors.destructive} size={20} />
            </Pressable>
          </View>
        ) : null}
      </View>

      {deleteError ? (
        <AppText variant="caption" tone="destructive" style={{ marginBottom: spacing.sm }}>
          {deleteError}
        </AppText>
      ) : null}

      {isPending ? (
        <View style={{ gap: spacing.md }}>
          <Skeleton height={260} radius={20} />
          <Skeleton height={24} width="60%" />
          <Skeleton height={16} width="40%" />
        </View>
      ) : isError || !medal ? (
        <ErrorState message="No pudimos cargar esta medalla." onRetry={refetch} />
      ) : (
        <View style={{ gap: spacing.lg, paddingBottom: spacing.xl }}>
          <View
            style={{
              aspectRatio: 1,
              backgroundColor: colors.graphite,
              borderRadius: radius.xl,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            {medal.front_image_url ? (
              <Image
                source={{ uri: medal.front_image_url }}
                style={{ width: '80%', height: '80%' }}
                contentFit="contain"
                transition={200}
              />
            ) : null}
          </View>

          <View>
            <AppText variant="title">{title}</AppText>
            {medal.race_name ? (
              <AppText variant="body" tone="muted" style={{ marginTop: spacing.xxs }}>
                {medal.race_name}
              </AppText>
            ) : null}
            {medal.event_date ? (
              <AppText variant="caption" tone="gold" style={{ marginTop: spacing.xs }}>
                {formatLongDate(medal.event_date)}
              </AppText>
            ) : null}
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            <Stat label="Distancia" value={medal.distance_label} />
            <Stat label="Tiempo oficial" value={medal.official_time} />
            <Stat label="Ritmo" value={medal.pace} />
            <Stat label="Lugar" value={[medal.city, medal.country].filter(Boolean).join(', ') || null} />
          </View>

          {medal.story ? (
            <View>
              <AppText variant="label" tone="muted">
                HISTORIA
              </AppText>
              <AppText variant="body" style={{ marginTop: spacing.xs }}>
                {medal.story}
              </AppText>
            </View>
          ) : null}

          {medal.gallery_images.length > 0 ? (
            <View>
              <AppText variant="label" tone="muted" style={{ marginBottom: spacing.xs }}>
                GALERÍA
              </AppText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  {medal.gallery_images.map((image) =>
                    image.url ? (
                      <Image
                        key={image.id}
                        source={{ uri: image.url }}
                        style={{ width: 120, height: 120, borderRadius: radius.md }}
                        contentFit="cover"
                      />
                    ) : null,
                  )}
                </View>
              </ScrollView>
            </View>
          ) : null}
        </View>
      )}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <View
      style={{
        backgroundColor: colors.graphite,
        borderRadius: radius.md,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        minWidth: '30%',
      }}>
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
      <AppText variant="bodyStrong">{value}</AppText>
    </View>
  );
}
