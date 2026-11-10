import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Ellipsis, Medal as MedalIcon, Pencil, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppError } from '@/api/errors';
import { AppText } from '@/components/app-text';
import { MetricNumber } from '@/components/brand/metric-number';
import { ErrorState } from '@/components/error-state';
import { Reveal } from '@/components/motion/reveal';
import { ScrollHeader, useParallax, useScrollY } from '@/components/motion/scroll-header';
import { Skeleton } from '@/components/skeleton';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { IconButton } from '@/components/ui/icon-button';
import { InlineError } from '@/components/ui/inline-error';
import { Sheet } from '@/components/ui/sheet';
import { SheetActionRow } from '@/components/ui/sheet-action-row';
import { useDeleteMedal } from '@/hooks/use-medal-mutations';
import { useMedal } from '@/hooks/use-medals';
import { useI18n } from '@/i18n';
import { showToast } from '@/stores/toastStore';
import { colors, radius, shadows, spacing } from '@/theme/tokens';
import { formatLongDate } from '@/utils/dates';

const HERO_HEIGHT = 340;

export default function MedalDetailScreen() {
  const { t } = useI18n();
  const { uuid } = useLocalSearchParams<{ uuid: string }>();
  const { data: medal, isPending, isError, error, refetch } = useMedal(uuid);
  const deleteMedal = useDeleteMedal();
  const insets = useSafeAreaInsets();
  // Short pages must still scroll far enough for the compact bar to become fully opaque.
  const { height: windowHeight } = useWindowDimensions();
  const { scrollY, onScroll } = useScrollY();
  const parallax = useParallax(scrollY, HERO_HEIGHT);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const title = medal?.title ?? medal?.event_name ?? medal?.event_name_manual ?? t('Medalla');
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/medals'));

  async function handleDelete() {
    setDeleteError(null);
    try {
      await deleteMedal.mutateAsync(uuid);
      setConfirmingDelete(false);
      router.back();
      showToast(t('Medalla eliminada.'), 'success');
    } catch (caught) {
      setConfirmingDelete(false);
      setDeleteError(caught instanceof AppError ? caught.message : t('No pudimos eliminar tu medalla.'));
    }
  }

  const backButton = <IconButton icon={ChevronLeft} label={t('Volver')} onPress={goBack} size={26} />;

  if (isPending || isError || !medal) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        <View style={{ paddingHorizontal: spacing.sm, minHeight: 52, justifyContent: 'center' }}>{backButton}</View>
        {isPending ? (
          <View style={{ gap: spacing.md, paddingHorizontal: spacing.lg }}>
            <Skeleton height={280} radius={radius.xl} />
            <Skeleton height={28} width="60%" />
            <Skeleton height={16} width="40%" />
          </View>
        ) : (
          <ErrorState error={error} message={t('No pudimos cargar esta medalla.')} onRetry={refetch} />
        )}
      </View>
    );
  }

  const stats = [
    medal.distance_label ? { label: t('Distancia'), value: medal.distance_label } : null,
    medal.official_time ? { label: t('Tiempo oficial'), value: medal.official_time } : null,
    medal.pace ? { label: t('Ritmo'), value: medal.pace } : null,
  ].filter((s): s is { label: string; value: string } => s !== null);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl, minHeight: windowHeight + HERO_HEIGHT }}>
        <View style={{ height: HERO_HEIGHT + insets.top, overflow: 'hidden', backgroundColor: colors.surfaceMuted }}>
          <Animated.View style={[{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: insets.top }, parallax]}>
            {medal.front_image_url ? (
              <Image
                source={{ uri: medal.front_image_url }}
                style={{ width: '72%', height: '78%' }}
                contentFit="contain"
                transition={250}
                accessibilityLabel={t('Foto de la medalla {title}', { title })}
              />
            ) : (
              <MedalIcon size={72} color={colors.accent} strokeWidth={1.2} />
            )}
          </Animated.View>
        </View>

        <Reveal style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.lg }}>
          <InlineError message={deleteError} />

          <View style={{ gap: spacing.xxs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              {medal.event_date ? <AppText variant="eyebrow">{formatLongDate(medal.event_date)}</AppText> : null}
              <Badge label={medal.visibility === 'public' ? t('Pública') : t('Privada')} variant={medal.visibility === 'public' ? 'gold' : 'neutral'} />
            </View>
            <AppText variant="display" accessibilityRole="header">
              {title}
            </AppText>
            {medal.race_name || medal.city || medal.country ? (
              <AppText variant="body" tone="muted">
                {[medal.race_name, [medal.city, medal.country].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}
              </AppText>
            ) : null}
          </View>

          {stats.length > 0 ? (
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: colors.card,
                borderRadius: radius.lg,
                borderCurve: 'continuous',
                borderWidth: 1,
                borderColor: colors.hairline,
                paddingVertical: spacing.md,
                ...shadows.soft,
              }}>
              {stats.map((stat, i) => (
                <View key={stat.label} style={{ flex: 1, alignItems: 'center', borderLeftWidth: i === 0 ? 0 : 1, borderLeftColor: colors.hairline, paddingHorizontal: spacing.xs }}>
                  <MetricNumber value={stat.value} label={stat.label} size={22} tone={i === 0 ? 'gold' : 'foreground'} style={{ alignItems: 'center' }} />
                </View>
              ))}
            </View>
          ) : null}

          {medal.story ? (
            <View style={{ gap: spacing.xs }}>
              <AppText variant="eyebrow" tone="muted">
                {t('Historia')}
              </AppText>
              <AppText variant="body">{medal.story}</AppText>
            </View>
          ) : null}

          {medal.gallery_images.length > 0 ? (
            <View style={{ gap: spacing.xs }}>
              <AppText variant="eyebrow" tone="muted">
                {t('Galería')}
              </AppText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -spacing.lg }} contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}>
                {medal.gallery_images.map((image) =>
                  image.url ? (
                    <Image
                      key={image.id}
                      source={{ uri: image.url }}
                      style={{ width: 132, height: 132, borderRadius: radius.md, backgroundColor: colors.surfaceMuted }}
                      contentFit="cover"
                      transition={200}
                    />
                  ) : null,
                )}
              </ScrollView>
            </View>
          ) : null}
        </Reveal>
      </Animated.ScrollView>

      <ScrollHeader
        scrollY={scrollY}
        title={title}
        threshold={HERO_HEIGHT - 60}
        left={backButton}
        right={<IconButton icon={Ellipsis} label={t('Más acciones')} onPress={() => setActionsOpen(true)} />}
      />

      <Sheet visible={actionsOpen} onClose={() => setActionsOpen(false)}>
        <SheetActionRow
          icon={Pencil}
          label={t('Editar medalla')}
          onPress={() => {
            setActionsOpen(false);
            router.push(`/medals/edit/${uuid}`);
          }}
        />
        <SheetActionRow
          icon={Trash2}
          label={t('Eliminar medalla')}
          destructive
          onPress={() => {
            setActionsOpen(false);
            setConfirmingDelete(true);
          }}
        />
      </Sheet>

      <ConfirmDialog
        visible={confirmingDelete}
        title={t('Eliminar medalla')}
        description={t('Esta medalla se quitará de tus recuerdos. Esta acción no se puede deshacer.')}
        confirmLabel={t('Eliminar')}
        loading={deleteMedal.isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </View>
  );
}
