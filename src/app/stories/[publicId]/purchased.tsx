/**
 * "Fotos que compré": the photos the athlete bought from the event
 * photographers (`GET /me/purchased-photos`, paged), as a multi-select
 * grid. Photos already in this story are marked "Agregada" and cannot be
 * picked again; the selection is capped at the photo places left, with the
 * count always on screen. "Agregar" imports them (`POST …/media/import`)
 * and returns to the editor; a 422 `MEDIA_LIMIT_REACHED` goes back too and
 * the editor offers more space.
 */

import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Check, ShoppingBag } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppError } from '@/api/errors';
import { AppText } from '@/components/app-text';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { BrandRefreshControl } from '@/components/motion/brand-refresh-control';
import { PressableScale } from '@/components/motion/pressable-scale';
import { Skeleton } from '@/components/skeleton';
import { InlineError } from '@/components/ui/inline-error';
import { HeaderTextButton, TopBar } from '@/components/ui/top-bar';
import { limitFromError, limitMessage, slotsLeft } from '@/features/stories/quota';
import { pendingCount } from '@/features/stories/upload-queue';
import { useUploadStore } from '@/features/stories/upload-store';
import { useImportPurchasedPhotos, usePurchasedPhotos, useStoryMedia } from '@/features/stories/use-stories';
import { useResponsive } from '@/hooks/use-responsive';
import { useI18n } from '@/i18n';
import type { PurchasedPhoto } from '@/schemas/story';
import { showToast } from '@/stores/toastStore';
import { colors, fontFamily, radius, spacing } from '@/theme/tokens';
import { formatShortDate } from '@/utils/dates';
import { haptics } from '@/utils/haptics';

const GAP = 6;

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/legacy');
}

export default function PurchasedPhotosScreen() {
  const { t, tc } = useI18n();
  const { publicId = '' } = useLocalSearchParams<{ publicId?: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useResponsive();

  const photos = usePurchasedPhotos();
  const media = useStoryMedia(publicId);
  const importPhotos = useImportPurchasedPhotos(publicId);
  const pending = useUploadStore((state) => pendingCount(state.queue, publicId, 'photos'));

  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const rows = useMemo(() => photos.data?.pages.flatMap((page) => page.items) ?? [], [photos.data]);
  const free = slotsLeft(media.data?.quota, 'photos', pending);
  const room = Math.max(0, free - selected.length);

  const side = Math.max(insets.left, insets.right, spacing.md);
  const contentWidth = Math.min(width - side * 2, 688);
  const columns = contentWidth > 560 ? 4 : 3;
  const tile = Math.floor((contentWidth - GAP * (columns - 1)) / columns);

  function toggle(photo: PurchasedPhoto) {
    const id = String(photo.sale_id);
    setError(null);
    if (selected.includes(id)) {
      setSelected(selected.filter((other) => other !== id));
      haptics.selection();
      return;
    }
    if (room <= 0) {
      haptics.warning();
      setError(
        free <= 0
          ? limitMessage('photos')
          : tc('Solo queda {count} foto en este recuerdo.|Solo quedan {count} fotos en este recuerdo.', free),
      );
      return;
    }
    setSelected([...selected, id]);
    haptics.selection();
  }

  function submit() {
    if (selected.length === 0 || importPhotos.isPending) return;
    const saleIds = rows.filter((photo) => selected.includes(String(photo.sale_id))).map((photo) => photo.sale_id);
    setError(null);
    importPhotos.mutate(saleIds, {
      onSuccess: (created) => {
        haptics.success();
        const count = created.length || saleIds.length;
        showToast(tc('Agregamos tu foto al recuerdo.|Agregamos {count} fotos a tu recuerdo.', count), 'success');
        close();
      },
      onError: (caught) => {
        // The editor opens the purchase sheet (the hook already reported the limit).
        if (limitFromError(caught, 'photos')) {
          close();
          return;
        }
        haptics.error();
        setError(
          caught instanceof AppError && caught.kind !== 'not_found' ? caught.message : t('Todavía no podemos agregar fotos compradas desde la app. Intenta más tarde.'),
        );
      },
    });
  }

  const missing = photos.error instanceof AppError && photos.error.kind === 'not_found';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: side, borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
        <TopBar
          title={t('Fotos que compré')}
          onBack={close}
          right={
            <HeaderTextButton
              label={selected.length > 0 ? t('Agregar ({count})', { count: selected.length }) : t('Agregar')}
              onPress={submit}
              disabled={selected.length === 0}
              loading={importPhotos.isPending}
            />
          }
        />
      </View>

      {photos.isPending ? (
        <View style={{ alignItems: 'center', paddingTop: spacing.lg }}>
          <View style={{ width: contentWidth, flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
            {Array.from({ length: columns * 3 }, (_, index) => (
              <Skeleton key={index} width={tile} height={tile} radius={radius.md} />
            ))}
          </View>
        </View>
      ) : photos.isError && rows.length === 0 ? (
        <ErrorState
          error={photos.error}
          title={missing ? t('Aún no disponible') : undefined}
          message={missing ? t('Todavía no podemos mostrar aquí tus fotos compradas. Las encuentras en finisherlegacy.com.') : t('No pudimos cargar tus fotos compradas.')}
          onRetry={missing ? undefined : photos.refetch}
          onBack={close}
        />
      ) : (
        <FlatList
          data={rows}
          key={columns}
          numColumns={columns}
          keyExtractor={(photo) => String(photo.sale_id)}
          showsVerticalScrollIndicator={false}
          columnWrapperStyle={{ gap: GAP, width: contentWidth, alignSelf: 'center' }}
          contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: insets.bottom + spacing.xxl, gap: GAP, flexGrow: 1 }}
          refreshControl={
            <BrandRefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void photos.refetch().finally(() => setRefreshing(false));
              }}
            />
          }
          onEndReachedThreshold={0.6}
          onEndReached={() => {
            if (photos.hasNextPage && !photos.isFetchingNextPage) void photos.fetchNextPage();
          }}
          ListHeaderComponent={
            rows.length > 0 ? (
              <View style={{ width: contentWidth, alignSelf: 'center', gap: spacing.sm, paddingBottom: spacing.xs }}>
                <AppText variant="caption" tone="muted" accessibilityLiveRegion="polite">
                  {media.data
                    ? free <= 0
                      ? t('Este recuerdo ya no tiene lugar para más fotos.')
                      : selected.length > 0
                        ? `${tc('{count} elegida|{count} elegidas', selected.length)} · ${room === 0 ? t('ya no caben más') : tc('cabe {count} más|caben {count} más', room)}`
                        : tc('Elige las que quieras agregar. Cabe {count} foto más.|Elige las que quieras agregar. Caben {count} fotos más.', free)
                    : t('Elige las que quieras agregar a tu recuerdo.')}
                </AppText>
                <InlineError message={error} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon={ShoppingBag}
              title={t('Aún no has comprado fotos')}
              message={t('Cuando compres fotos a los fotógrafos de un evento aparecerán aquí, listas para agregarlas a tu recuerdo.')}
            />
          }
          ListFooterComponent={photos.isFetchingNextPage ? <ActivityIndicator color={colors.accent} style={{ paddingVertical: spacing.md }} /> : null}
          renderItem={({ item, index }) => {
            const id = String(item.sale_id);
            const added = item.already_in_story_ids.includes(publicId);
            const order = selected.indexOf(id);
            const isSelected = order >= 0;
            const label = [t('Foto {position}', { position: index + 1 }), item.event_name, added ? t('ya está en este recuerdo') : null].filter(Boolean).join(', ');

            return (
              <PressableScale
                onPress={() => toggle(item)}
                disabled={added || importPhotos.isPending}
                scaleTo={0.95}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected, disabled: added }}
                accessibilityLabel={label}
                style={{ width: tile, height: tile, borderRadius: radius.md, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: colors.surfaceMuted }}>
                {item.thumb_url ? (
                  <Image source={{ uri: item.thumb_url }} style={{ flex: 1, opacity: added ? 0.45 : 1 }} contentFit="cover" transition={160} recyclingKey={id} accessibilityIgnoresInvertColors />
                ) : null}

                {isSelected ? <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderWidth: 3, borderColor: colors.gold, borderRadius: radius.md, borderCurve: 'continuous' }} /> : null}

                {added ? (
                  <View style={{ position: 'absolute', left: 5, bottom: 5, flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: 'rgba(11,11,12,0.66)' }}>
                    <Check size={11} color={colors.onDark} strokeWidth={3} />
                    <AppText maxFontSizeMultiplier={1.2} style={{ fontFamily: fontFamily.semibold, fontSize: 10.5, color: colors.onDark }}>
                      {t('Agregada')}
                    </AppText>
                  </View>
                ) : (
                  <View
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isSelected ? colors.gold : 'rgba(11,11,12,0.28)',
                      borderWidth: 1.5,
                      borderColor: isSelected ? colors.gold : 'rgba(255,255,255,0.92)',
                    }}>
                    {isSelected ? (
                      <AppText maxFontSizeMultiplier={1.1} style={{ fontFamily: fontFamily.bold, fontSize: 12, color: colors.onGold }}>
                        {order + 1}
                      </AppText>
                    ) : null}
                  </View>
                )}

                {item.purchased_at && /^\d{4}-\d{2}-\d{2}/.test(item.purchased_at) && !added ? (
                  <View pointerEvents="none" style={{ position: 'absolute', left: 5, bottom: 5, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: 'rgba(11,11,12,0.5)' }}>
                    <AppText numberOfLines={1} maxFontSizeMultiplier={1.2} style={{ fontFamily: fontFamily.medium, fontSize: 10, color: colors.onDark }}>
                      {formatShortDate(item.purchased_at.slice(0, 10))}
                    </AppText>
                  </View>
                ) : null}
              </PressableScale>
            );
          }}
        />
      )}
    </View>
  );
}
