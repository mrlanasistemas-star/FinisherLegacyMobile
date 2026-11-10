/**
 * Media manager of a story: the limits per kind (meters), the gallery as
 * a grid that is reordered by holding and dragging a tile, files on their
 * way up drawn in place with their progress (the queue keeps running if
 * the athlete leaves), and "Agregar" → photos / a video from the phone or
 * photos bought from the event photographers.
 *
 * Tapping a tile opens its actions (view, move, delete with confirm; for
 * an upload: retry / cancel). Hitting a limit — in the picker, on a 422
 * `MEDIA_LIMIT_REACHED` from an upload or an import — keeps everything on
 * screen and opens the purchase sheet of that kind (or only the limit
 * message when the store cannot sell it). The voice message is played and
 * deleted here; adding one is web-only for now.
 */

import { Image } from 'expo-image';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { ArrowLeftToLine, ChevronLeft, ChevronRight, Expand, ImagePlus, Mic, RotateCw, Trash2, X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppError } from '@/api/errors';
import { AppText } from '@/components/app-text';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { BrandRefreshControl } from '@/components/motion/brand-refresh-control';
import { PressableScale } from '@/components/motion/pressable-scale';
import { Skeleton } from '@/components/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { InlineError } from '@/components/ui/inline-error';
import { Sheet } from '@/components/ui/sheet';
import { SheetActionRow } from '@/components/ui/sheet-action-row';
import { HeaderTextButton, TopBar } from '@/components/ui/top-bar';
import { AddMediaSheet, type AddAction } from '@/features/stories/components/add-media-sheet';
import { MediaTile, UploadTile } from '@/features/stories/components/media-tile';
import { QuotaMeters, type OpenRequest } from '@/features/stories/components/quota-meters';
import { SortableGrid } from '@/features/stories/components/sortable-grid';
import { StoryViewer } from '@/features/stories/components/story-viewer';
import { VoicePlayer } from '@/features/stories/components/voice-player';
import { pickPhotos, pickVideo, type PickOutcome } from '@/features/stories/media-picker';
import { kindForRole, partialFitMessage, uploadingMessage } from '@/features/stories/quota';
import { pendingCount, uploadsForStory, type UploadItem } from '@/features/stories/upload-queue';
import { cancelUpload, clearFinishedUploads, resumeBlockedUploads, retryUpload, useUploadStore } from '@/features/stories/upload-store';
import { useDeleteStoryMedia, useReorderStoryMedia, useStoryMedia } from '@/features/stories/use-stories';
import { useResponsive } from '@/hooks/use-responsive';
import { useI18n } from '@/i18n';
import type { QuotaKind, StoryMedia } from '@/schemas/story';
import { showToast } from '@/stores/toastStore';
import { colors, fontFamily, radius, spacing } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';

type Entry = { key: string; media: StoryMedia; upload?: undefined } | { key: string; upload: UploadItem; media?: undefined };

const GAP = 6;

function leave() {
  if (router.canGoBack()) router.back();
  else router.replace('/legacy');
}

export default function StoryMediaScreen() {
  const { t } = useI18n();
  const { publicId = '', add } = useLocalSearchParams<{ publicId?: string; add?: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useResponsive();

  const media = useStoryMedia(publicId);
  const remove = useDeleteStoryMedia(publicId);
  const reorder = useReorderStoryMedia(publicId);
  const queue = useUploadStore((state) => state.queue);
  const limitHit = useUploadStore((state) => state.limitHit);
  const clearLimit = useUploadStore((state) => state.clearLimit);
  const previews = useUploadStore((state) => state.previews);

  const [addOpen, setAddOpen] = useState(add === '1');
  const [selected, setSelected] = useState<StoryMedia | null>(null);
  const [selectedUpload, setSelectedUpload] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<StoryMedia | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [localRequest, setLocalRequest] = useState<OpenRequest | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const quota = media.data?.quota ?? null;
  const items = useMemo(() => media.data?.items ?? [], [media.data]);
  const gallery = useMemo(() => items.filter((item) => item.role !== 'audio'), [items]);
  const voice = items.find((item) => item.role === 'audio') ?? null;
  const viewable = useMemo(() => gallery.filter((item) => item.status === 'ready' && !!item.url), [gallery]);

  // An upload stays in the grid until the gallery really contains what it created.
  const uploads = useMemo(() => {
    const known = new Set(items.map((item) => item.uuid));
    return uploadsForStory(queue, publicId).filter((item) => !(item.status === 'done' && (!item.mediaUuid || known.has(item.mediaUuid))));
  }, [queue, publicId, items]);
  const settled = uploadsForStory(queue, publicId).some((item) => item.status === 'done') && uploads.every((item) => item.status !== 'done');

  useEffect(() => {
    if (settled) clearFinishedUploads(publicId);
  }, [settled, publicId]);

  const entries = useMemo<Entry[]>(
    () => [...gallery.map((item) => ({ key: item.uuid, media: item })), ...uploads.map((item) => ({ key: item.id, upload: item }))],
    [gallery, uploads],
  );

  const askForSpace = useCallback((kind: QuotaKind) => setLocalRequest({ kind, at: Date.now() }), []);

  // A 422 MEDIA_LIMIT_REACHED from a background upload / an import asks for space
  // exactly like hitting the limit in the picker does; the newest request wins.
  const hit = limitHit && limitHit.storyId === publicId ? limitHit : null;
  const hitAt = hit?.at ?? null;
  const openRequest: OpenRequest | null = hit && (!localRequest || hit.at > localRequest.at) ? { kind: hit.kind, at: hit.at } : localRequest;
  const refetchMedia = media.refetch;

  useEffect(() => {
    // The server just said the story is full: read the real numbers.
    if (hitAt !== null) void refetchMedia();
  }, [hitAt, refetchMedia]);

  // Leaving the editor forgets the hit, so coming back does not reopen the sheet.
  useEffect(() => clearLimit, [clearLimit]);

  const onGranted = useCallback(
    (kind: QuotaKind) => {
      resumeBlockedUploads(publicId, kind);
      setNotice(null);
    },
    [publicId],
  );

  function report(outcome: PickOutcome) {
    if (outcome.status === 'cancelled') return;
    if (outcome.status === 'error') {
      haptics.warning();
      setNotice(outcome.message);
      return;
    }
    setNotice(null);
    if (outcome.status === 'limit') {
      askForSpace(outcome.kind);
      return;
    }
    if (outcome.rejected > 0) {
      showToast(partialFitMessage(outcome.kind, outcome.count, outcome.rejected));
      askForSpace(outcome.kind);
    } else {
      showToast(uploadingMessage(outcome.kind, outcome.count));
    }
  }

  function onPick(action: AddAction) {
    setAddOpen(false);
    if (!quota) return;
    if (action === 'purchased') {
      router.push(`/stories/${publicId}/purchased` as Href);
      return;
    }
    // Let the sheet leave the screen before the system picker comes up (iOS refuses to present over a closing modal).
    setTimeout(() => {
      void (action === 'photos' ? pickPhotos(publicId, quota) : pickVideo(publicId, quota)).then(report);
    }, 260);
  }

  function move(item: StoryMedia, to: number) {
    const order = gallery.map((entry) => entry.uuid);
    const from = order.indexOf(item.uuid);
    const target = Math.min(order.length - 1, Math.max(0, to));
    if (from < 0 || from === target) return;
    order.splice(from, 1);
    order.splice(target, 0, item.uuid);
    commitOrder(order);
  }

  function commitOrder(order: string[]) {
    reorder.mutate(order, {
      onError: (caught) => {
        haptics.error();
        showToast(caught instanceof AppError && caught.kind !== 'not_found' ? caught.message : t('No pudimos guardar el nuevo orden.'), 'destructive');
      },
    });
  }

  function confirmDelete() {
    const item = toDelete;
    if (!item) return;
    remove.mutate(item.uuid, {
      onSuccess: () => {
        setToDelete(null);
        setViewerIndex(null);
        haptics.light();
      },
      onError: (caught) => {
        setToDelete(null);
        showToast(caught instanceof AppError && caught.kind !== 'not_found' ? caught.message : t('No pudimos eliminarlo. Intenta de nuevo.'), 'destructive');
      },
    });
  }

  const contentWidth = Math.min(width - Math.max(insets.left, spacing.md) - Math.max(insets.right, spacing.md), 688);
  const columns = contentWidth > 560 ? 4 : 3;
  const activeUpload = selectedUpload ? (uploads.find((item) => item.id === selectedUpload) ?? null) : null;
  const selectedIndex = selected ? gallery.findIndex((item) => item.uuid === selected.uuid) : -1;
  const missing = media.error instanceof AppError && media.error.kind === 'not_found';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View style={{ paddingLeft: Math.max(insets.left, spacing.md), paddingRight: Math.max(insets.right, spacing.md), borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
        <TopBar title={t('Fotos y videos')} onBack={leave} right={quota ? <HeaderTextButton label={t('Agregar')} onPress={() => setAddOpen(true)} /> : null} />
      </View>

      {media.isError && !media.data ? (
        <ErrorState
          error={media.error}
          title={missing ? t('Aún no disponible') : undefined}
          message={missing ? t('Todavía no podemos administrar tus fotos desde la app. Mientras tanto puedes hacerlo en finisherlegacy.com.') : t('No pudimos cargar tus fotos y videos.')}
          onRetry={missing ? undefined : media.refetch}
          onBack={leave}
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <BrandRefreshControl
              // Own flag: the "Procesando…" polling must not flash the spinner every few seconds.
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void media.refetch().finally(() => setRefreshing(false));
              }}
            />
          }
          contentContainerStyle={{ alignItems: 'center', paddingTop: spacing.lg, paddingBottom: insets.bottom + spacing.xxl }}>
          <View style={{ width: contentWidth, gap: spacing.lg }}>
            {quota ? <QuotaMeters publicId={publicId} quota={quota} openRequest={openRequest} onGranted={onGranted} /> : <Skeleton height={236} radius={radius.lg} />}

            <InlineError message={notice} />

            <View style={{ gap: spacing.sm }}>
              {media.isPending ? (
                <View style={{ flexDirection: 'row', gap: GAP }}>
                  {[0, 1, 2].map((index) => (
                    <Skeleton key={index} width={(contentWidth - GAP * 2) / 3} height={(contentWidth - GAP * 2) / 3} radius={radius.md} />
                  ))}
                </View>
              ) : entries.length === 0 ? (
                <EmptyState
                  compact
                  icon={ImagePlus}
                  title={t('Empieza por tu mejor foto')}
                  message={t('Sube fotos y videos desde tu teléfono o agrega las que compraste a los fotógrafos del evento.')}
                  actionLabel={t('Agregar')}
                  onAction={() => setAddOpen(true)}
                />
              ) : (
                <>
                  <SortableGrid
                    data={entries}
                    keyOf={(entry) => entry.key}
                    width={contentWidth}
                    columns={columns}
                    gap={GAP}
                    sortableCount={gallery.length}
                    onReorder={commitOrder}
                    onPressItem={(entry) => {
                      haptics.selection();
                      if (entry.media) setSelected(entry.media);
                      else setSelectedUpload(entry.upload.id);
                    }}
                    renderItem={(entry, size) => (entry.media ? <MediaTile item={entry.media} size={size} position={gallery.indexOf(entry.media) + 1} previewUri={previews[entry.media.uuid]} /> : <UploadTile item={entry.upload} size={size} />)}
                  />
                  {gallery.length > 1 ? (
                    <AppText variant="caption" tone="subtle" align="center" style={{ fontSize: 13, marginTop: spacing.xxs }}>
                      {t('Mantén presionada una foto y arrástrala para cambiar el orden. La primera es tu portada.')}
                    </AppText>
                  ) : null}
                </>
              )}
            </View>

            <View style={{ gap: spacing.xs }}>
              <AppText variant="eyebrow" tone="subtle" style={{ marginLeft: spacing.xxs }}>
                {t('Mensaje de voz')}
              </AppText>
              {voice ? (
                <>
                  <VoicePlayer url={voice.url} durationSeconds={voice.duration_seconds} processing={voice.status === 'processing'} />
                  <PressableScale onPress={() => setToDelete(voice)} scaleTo={0.96} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('Eliminar mensaje de voz')} style={{ alignSelf: 'flex-start', minHeight: 40, justifyContent: 'center', paddingHorizontal: spacing.xxs }}>
                    <AppText style={{ fontFamily: fontFamily.semibold, fontSize: 14, color: colors.destructive }}>{t('Eliminar mensaje de voz')}</AppText>
                  </PressableScale>
                </>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.hairline }}>
                  <View style={{ width: 36, height: 36, borderRadius: 10, borderCurve: 'continuous', backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}>
                    <Mic size={18} color={colors.muted} strokeWidth={1.9} />
                  </View>
                  <AppText variant="caption" tone="muted" style={{ flex: 1 }}>
                    {t('Por ahora el mensaje de voz se agrega desde finisherlegacy.com. Cuando lo subas, aquí podrás escucharlo.')}
                  </AppText>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      )}

      {quota ? (
        <AddMediaSheet
          visible={addOpen}
          onClose={() => setAddOpen(false)}
          quota={quota}
          pendingPhotos={pendingCount(queue, publicId, 'photos')}
          pendingVideos={pendingCount(queue, publicId, 'videos')}
          hasVoiceMessage={!!voice}
          onPick={onPick}
        />
      ) : null}

      {/* Actions of a gallery item */}
      <Sheet visible={!!selected} onClose={() => setSelected(null)}>
        {selected ? (
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
              <View style={{ width: 52, height: 52, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surfaceMuted }}>
                {selected.thumb_url || selected.poster_url || selected.url ? (
                  <Image source={{ uri: (selected.role === 'video' ? selected.poster_url : selected.thumb_url) ?? selected.thumb_url ?? selected.url ?? undefined }} style={{ flex: 1 }} contentFit="cover" />
                ) : null}
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyStrong">
                  {selected.role === 'video'
                    ? t('Video {position} de {total}', { position: selectedIndex + 1, total: gallery.length })
                    : t('Foto {position} de {total}', { position: selectedIndex + 1, total: gallery.length })}
                </AppText>
                <AppText variant="caption" tone="subtle">
                  {selectedIndex === 0 ? t('Es la portada de tu recuerdo') : selected.source === 'purchased' ? t('Foto que compraste') : selected.status === 'processing' ? t('Procesando…') : t('Subida desde tu teléfono')}
                </AppText>
              </View>
            </View>
            {selected.status === 'ready' && selected.url ? (
              <SheetActionRow
                icon={Expand}
                label={t('Ver en grande')}
                onPress={() => {
                  const index = viewable.findIndex((item) => item.uuid === selected.uuid);
                  setSelected(null);
                  if (index >= 0) setViewerIndex(index);
                }}
              />
            ) : null}
            {selectedIndex > 0 ? (
              <>
                <SheetActionRow
                  icon={ArrowLeftToLine}
                  label={t('Usar como portada')}
                  onPress={() => {
                    move(selected, 0);
                    setSelected(null);
                  }}
                />
                <SheetActionRow
                  icon={ChevronLeft}
                  label={t('Mover antes')}
                  onPress={() => {
                    move(selected, selectedIndex - 1);
                    setSelected(null);
                  }}
                />
              </>
            ) : null}
            {selectedIndex >= 0 && selectedIndex < gallery.length - 1 ? (
              <SheetActionRow
                icon={ChevronRight}
                label={t('Mover después')}
                onPress={() => {
                  move(selected, selectedIndex + 1);
                  setSelected(null);
                }}
              />
            ) : null}
            <SheetActionRow
              icon={Trash2}
              label={t('Eliminar')}
              destructive
              onPress={() => {
                setToDelete(selected);
                setSelected(null);
              }}
            />
          </View>
        ) : null}
      </Sheet>

      {/* Actions of a file in the upload queue */}
      <Sheet visible={!!activeUpload} onClose={() => setSelectedUpload(null)}>
        {activeUpload ? (
          <View>
            <AppText variant="bodyStrong">
              {activeUpload.status === 'failed'
                ? t('No se pudo subir')
                : activeUpload.status === 'blocked'
                  ? t('No cabe en tu recuerdo')
                  : activeUpload.status === 'done'
                    ? t('Ya se subió')
                    : activeUpload.status === 'uploading'
                      ? t('Subiendo… {progress}%', { progress: activeUpload.progress })
                      : t('En espera de subir')}
            </AppText>
            {activeUpload.error ? (
              <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
                {activeUpload.error}
              </AppText>
            ) : null}
            {activeUpload.status === 'failed' ? (
              <SheetActionRow
                icon={RotateCw}
                label={t('Reintentar')}
                onPress={() => {
                  retryUpload(activeUpload.id);
                  setSelectedUpload(null);
                }}
              />
            ) : null}
            {activeUpload.status === 'blocked' ? (
              <SheetActionRow
                icon={ImagePlus}
                label={t('Ver cómo tener más espacio')}
                onPress={() => {
                  setSelectedUpload(null);
                  askForSpace(kindForRole(activeUpload.role));
                }}
              />
            ) : null}
            {activeUpload.status !== 'done' ? (
              <SheetActionRow
                icon={X}
                label={activeUpload.status === 'failed' || activeUpload.status === 'blocked' ? t('Quitar') : t('Cancelar subida')}
                destructive
                onPress={() => {
                  cancelUpload(activeUpload.id);
                  setSelectedUpload(null);
                }}
              />
            ) : null}
          </View>
        ) : null}
      </Sheet>

      <ConfirmDialog
        visible={!!toDelete}
        title={toDelete?.role === 'audio' ? t('¿Eliminar el mensaje de voz?') : toDelete?.role === 'video' ? t('¿Eliminar este video?') : t('¿Eliminar esta foto?')}
        description={
          toDelete?.source === 'purchased'
            ? t('Se quita de este recuerdo. Sigue en tus fotos compradas y puedes volver a agregarla.')
            : t('Se quita de tu recuerdo y no se puede recuperar desde aquí.')
        }
        confirmLabel={t('Eliminar')}
        loading={remove.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />

      {viewerIndex !== null && viewable.length > 0 ? (
        <StoryViewer key={viewerIndex} items={viewable} initialIndex={viewerIndex} onClose={() => setViewerIndex(null)} onDelete={(item) => setToDelete(item)} />
      ) : null}
    </View>
  );
}
