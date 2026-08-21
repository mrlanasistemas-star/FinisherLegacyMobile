import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Pencil, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppError } from '@/api/errors';
import { AppText } from '@/components/app-text';
import { GoldGlow } from '@/components/brand/gold-glow';
import { MetricNumber } from '@/components/brand/metric-number';
import { GlassSurface } from '@/components/brand/glass-surface';
import { ErrorState } from '@/components/error-state';
import { Reveal } from '@/components/motion/reveal';
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
  const insets = useSafeAreaInsets();
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

  if (isPending) {
    return (
      <Screen scroll edges={['top', 'left', 'right']}>
        <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
          <Skeleton height={280} radius={20} />
          <Skeleton height={24} width="60%" />
          <Skeleton height={16} width="40%" />
        </View>
      </Screen>
    );
  }

  if (isError || !medal) {
    return (
      <Screen edges={['top', 'left', 'right']}>
        <ErrorState message="No pudimos cargar esta medalla." onRetry={refetch} />
      </Screen>
    );
  }

  return (
    <Screen scroll padded={false} edges={['left', 'right']}>
      <View style={{ height: 300, backgroundColor: colors.graphite, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <GoldGlow size={260} />
        {medal.front_image_url ? (
          <Image
            source={{ uri: medal.front_image_url }}
            style={{ position: 'absolute', width: '70%', height: '70%' }}
            contentFit="contain"
            transition={200}
          />
        ) : null}

        <View style={{ position: 'absolute', top: insets.top + spacing.xs, left: spacing.md, right: spacing.md, flexDirection: 'row', justifyContent: 'space-between' }}>
          <GlassSurface style={{ width: 40, height: 40 }}>
            <Pressable
              onPress={() => router.back()}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
              accessibilityRole="button"
              accessibilityLabel="Volver">
              <ChevronLeft color={colors.foreground} size={22} />
            </Pressable>
          </GlassSurface>

          <View style={{ flexDirection: 'row', gap: spacing.xs }}>
            <GlassSurface style={{ width: 40, height: 40 }}>
              <Pressable
                onPress={() => router.push(`/medals/edit/${uuid}`)}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
                accessibilityRole="button"
                accessibilityLabel="Editar medalla">
                <Pencil color={colors.foreground} size={18} />
              </Pressable>
            </GlassSurface>
            <GlassSurface style={{ width: 40, height: 40 }}>
              <Pressable
                onPress={confirmDelete}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
                accessibilityRole="button"
                accessibilityLabel="Eliminar medalla">
                <Trash2 color={colors.destructive} size={18} />
              </Pressable>
            </GlassSurface>
          </View>
        </View>
      </View>

      <Reveal style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xl }}>
        {deleteError ? (
          <AppText variant="caption" tone="destructive">
            {deleteError}
          </AppText>
        ) : null}

        <View>
          <AppText variant="display">{title}</AppText>
          {medal.race_name ? (
            <AppText variant="body" tone="muted" style={{ marginTop: spacing.xxs }}>
              {medal.race_name}
            </AppText>
          ) : null}
          {medal.event_date ? (
            <AppText variant="caption" tone="gold" style={{ marginTop: spacing.xs, letterSpacing: 1 }}>
              {formatLongDate(medal.event_date).toUpperCase()}
            </AppText>
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg }}>
          {medal.distance_label ? <MetricNumber value={medal.distance_label} label="Distancia" size={44} tone="gold" /> : null}
          {medal.official_time ? <MetricNumber value={medal.official_time} label="Tiempo oficial" size={44} /> : null}
        </View>

        {medal.pace || medal.city || medal.country ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {medal.pace ? <Chip label={`Ritmo ${medal.pace}`} /> : null}
            {(medal.city || medal.country) && <Chip label={[medal.city, medal.country].filter(Boolean).join(', ')} />}
          </View>
        ) : null}

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
      </Reveal>
    </Screen>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
      }}>
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
    </View>
  );
}
