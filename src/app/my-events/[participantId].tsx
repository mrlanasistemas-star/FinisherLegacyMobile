import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Camera as CameraIcon,
  Globe,
  Lock,
  Medal as MedalIcon,
  Plus,
  Trash2,
  Video as VideoIcon,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppError } from '@/api/errors';
import { EVENT_MEDIA_LIMITS } from '@/api/eventMedia';
import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { MediaGrid } from '@/components/media/media-grid';
import { MediaUploadSheet } from '@/components/media/media-upload-sheet';
import { MediaViewer } from '@/components/media/media-viewer';
import { Reveal } from '@/components/motion/reveal';
import { PressScale } from '@/components/motion/press-scale';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { SectionTitle } from '@/components/brand/section-title';
import { Skeleton } from '@/components/skeleton';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Sheet } from '@/components/ui/sheet';
import { SheetActionRow } from '@/components/ui/sheet-action-row';
import { useAddEventGear, useEventGear, useRemoveEventGear } from '@/hooks/use-event-gear';
import { useDeleteEventMedia, useEventMedia, useUpdateEventMediaVisibility } from '@/hooks/use-event-media';
import { useMyGear } from '@/hooks/use-gear';
import { useEventParticipant } from '@/hooks/use-my-events';
import { PLATE_STATUS_LABEL, SUPPORT_STATUS_LABEL } from '@/components/my-event-row';
import { showToast } from '@/stores/toastStore';
import { colors, radius, spacing } from '@/theme/tokens';
import { formatLongDate } from '@/utils/dates';
import { formatMoney } from '@/utils/money';
import type { AthleteEventMedia, AthleteOwnedProduct } from '@/types/models';

export default function MyEventDetailScreen() {
  const { participantId: participantIdParam } = useLocalSearchParams<{ participantId: string }>();
  const parsedParticipantId = Number(participantIdParam);
  const participantId = Number.isFinite(parsedParticipantId) ? parsedParticipantId : null;

  const { data, isPending, isError, refetch } = useEventParticipant(participantId);
  const media = useEventMedia(participantId);

  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [actionsFor, setActionsFor] = useState<AthleteEventMedia | null>(null);
  const [confirmingDeleteMedia, setConfirmingDeleteMedia] = useState(false);
  const [addGearOpen, setAddGearOpen] = useState(false);
  const [removingGearUuid, setRemovingGearUuid] = useState<string | null>(null);

  const updateVisibility = useUpdateEventMediaVisibility(participantId);
  const deleteMedia = useDeleteEventMedia(participantId);
  const eventGear = useEventGear(participantId);
  const myGear = useMyGear();
  const addGear = useAddEventGear(participantId);
  const removeGear = useRemoveEventGear(participantId);

  const mediaItems = useMemo(() => media.data ?? [], [media.data]);
  const imageCount = useMemo(() => mediaItems.filter((item) => item.type === 'image').length, [mediaItems]);
  const videoCount = useMemo(() => mediaItems.filter((item) => item.type === 'video').length, [mediaItems]);
  const imagesFull = imageCount >= EVENT_MEDIA_LIMITS.freeImages;
  const videosFull = videoCount >= EVENT_MEDIA_LIMITS.freeVideos;

  const usedGearUuids = useMemo(
    () => new Set((eventGear.data ?? []).map((selection) => selection.athlete_owned_product_uuid)),
    [eventGear.data],
  );
  const availableGear = useMemo(
    () => (myGear.data ?? []).filter((product) => !usedGearUuids.has(product.uuid)),
    [myGear.data, usedGearUuids],
  );

  if (participantId === null) {
    return (
      <Screen edges={['top', 'left', 'right']}>
        <ScreenHeader title="Mi evento" />
        <ErrorState message="Este enlace no es válido." />
      </Screen>
    );
  }

  if (isPending) {
    return (
      <Screen edges={['top', 'left', 'right']}>
        <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
          <Skeleton height={28} width="70%" />
          <Skeleton height={140} radius={16} />
          <Skeleton height={100} radius={16} />
        </View>
      </Screen>
    );
  }

  if (isError || !data) {
    return (
      <Screen edges={['top', 'left', 'right']}>
        <ScreenHeader title="Mi evento" />
        <ErrorState message="No pudimos cargar esta participación." onRetry={refetch} />
      </Screen>
    );
  }

  const { participant, result, medals, legacyPlate, gearUsed, purchases, supportSession } = data;
  const subtitle = [participant.edition, participant.race].filter(Boolean).join(' · ');

  async function handleToggleVisibility(item: AthleteEventMedia) {
    try {
      await updateVisibility.mutateAsync({ uuid: item.uuid, isPublic: !item.is_public });
      setActionsFor(null);
      showToast(item.is_public ? 'Ahora sólo tú puedes verlo.' : 'Ahora es público.', 'success');
    } catch (caught) {
      showToast(caught instanceof AppError ? caught.message : 'No pudimos actualizar la visibilidad.', 'destructive');
    }
  }

  async function handleDeleteMedia() {
    if (!actionsFor) return;
    try {
      await deleteMedia.mutateAsync(actionsFor.uuid);
      setConfirmingDeleteMedia(false);
      setActionsFor(null);
      showToast('Recuerdo eliminado.', 'success');
    } catch (caught) {
      setConfirmingDeleteMedia(false);
      showToast(caught instanceof AppError ? caught.message : 'No pudimos eliminar este recuerdo.', 'destructive');
    }
  }

  async function handleAddGear(product: AthleteOwnedProduct) {
    try {
      await addGear.mutateAsync({ athleteOwnedProductUuid: product.uuid });
      showToast('Equipo agregado a esta carrera.', 'success');
    } catch (caught) {
      showToast(caught instanceof AppError ? caught.message : 'No pudimos agregar este equipo.', 'destructive');
    }
  }

  async function handleRemoveGear() {
    if (!removingGearUuid) return;
    try {
      await removeGear.mutateAsync(removingGearUuid);
      setRemovingGearUuid(null);
      showToast('Equipo quitado de esta carrera.', 'success');
    } catch (caught) {
      setRemovingGearUuid(null);
      showToast(caught instanceof AppError ? caught.message : 'No pudimos quitar este equipo.', 'destructive');
    }
  }

  return (
    <Screen scroll padded={false} edges={['top', 'left', 'right']}>
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.xl }}>
        <ScreenHeader title="Mi evento" />

        <Reveal style={{ gap: spacing.xs }}>
          <AppText variant="display">{participant.event ?? 'Evento'}</AppText>
          {subtitle ? (
            <AppText variant="body" tone="muted">
              {subtitle}
            </AppText>
          ) : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs }}>
            {participant.event_date ? <Badge label={formatLongDate(participant.event_date)} variant="gold" /> : null}
            {participant.bib_number ? <Badge label={`Dorsal ${participant.bib_number}`} /> : null}
          </View>
        </Reveal>

        {result ? (
          <View style={{ gap: spacing.sm }}>
            <SectionTitle title="Resultado" />
            <Card>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg }}>
                {result.official_time ? (
                  <View>
                    <AppText variant="title" tone="gold">
                      {result.official_time}
                    </AppText>
                    <AppText variant="caption" tone="muted">
                      Tiempo oficial
                    </AppText>
                  </View>
                ) : null}
                {result.pace ? (
                  <View>
                    <AppText variant="title">{result.pace}</AppText>
                    <AppText variant="caption" tone="muted">
                      Ritmo
                    </AppText>
                  </View>
                ) : null}
                {result.overall_position ? (
                  <View>
                    <AppText variant="title">#{result.overall_position}</AppText>
                    <AppText variant="caption" tone="muted">
                      General
                    </AppText>
                  </View>
                ) : null}
              </View>

              {result.splits.length > 0 ? (
                <View style={{ marginTop: spacing.md, gap: spacing.xs }}>
                  <AppText variant="label" tone="muted" style={{ letterSpacing: 1.5 }}>
                    SPLITS
                  </AppText>
                  {result.splits.map((split, index) => (
                    <View
                      key={`${split.label}-${index}`}
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        paddingVertical: spacing.xxs,
                        borderTopWidth: index === 0 ? 0 : 1,
                        borderTopColor: colors.border,
                      }}>
                      <AppText variant="caption">{split.label}</AppText>
                      <AppText variant="caption" tone="muted">
                        {split.distance_value} {split.distance_unit}
                      </AppText>
                      <AppText variant="caption" tone="gold">
                        {split.segment_time}
                      </AppText>
                    </View>
                  ))}
                </View>
              ) : null}
            </Card>
          </View>
        ) : null}

        {medals.length > 0 ? (
          <View style={{ gap: spacing.sm }}>
            <SectionTitle title="Medallas de esta carrera" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {medals.map((medal) => (
                <PressScale key={medal.id} haptic onPress={() => router.push(`/medals/${medal.id}`)}>
                  <Card style={{ width: 140, alignItems: 'center', gap: spacing.xs }}>
                    <MedalIcon color={colors.gold} size={22} />
                    <AppText variant="caption" numberOfLines={2} align="center">
                      {medal.title ?? 'Medalla'}
                    </AppText>
                  </Card>
                </PressScale>
              ))}
            </View>
          </View>
        ) : null}

        <View style={{ gap: spacing.sm }}>
          <SectionTitle title="Legacy Plate" />
          {legacyPlate ? (
            <Card style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
              {legacyPlate.model?.preview_image_url ? (
                <View
                  style={{
                    width: 72,
                    height: 44,
                    borderRadius: radius.sm,
                    overflow: 'hidden',
                    backgroundColor: colors.graphiteLight,
                  }}>
                  <Image
                    source={{ uri: legacyPlate.model.preview_image_url }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                  />
                </View>
              ) : null}
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="bodyStrong">{legacyPlate.personalization.athlete_name ?? 'Tu Legacy Plate'}</AppText>
                <AppText variant="caption" tone="muted">
                  {legacyPlate.model?.name ?? 'Modelo pendiente'}
                </AppText>
              </View>
              <Badge label={PLATE_STATUS_LABEL[legacyPlate.status] ?? legacyPlate.status} variant="gold" />
            </Card>
          ) : (
            <Card>
              <AppText variant="body" tone="muted">
                Aún no tienes una Legacy Plate para esta participación.
              </AppText>
            </Card>
          )}
        </View>

        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <SectionTitle title="Recuerdos" />
            <PressScale haptic onPress={() => setUploadOpen(true)} accessibilityRole="button" accessibilityLabel="Agregar recuerdo">
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: 6,
                  borderRadius: radius.pill,
                  borderWidth: 1,
                  borderColor: colors.goldDim,
                }}>
                <Plus color={colors.gold} size={14} />
                <AppText variant="caption" tone="gold">
                  Agregar
                </AppText>
              </View>
            </PressScale>
          </View>

          <View style={{ flexDirection: 'row', gap: spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <CameraIcon color={colors.muted} size={14} />
              <AppText variant="caption" tone={imagesFull ? 'gold' : 'muted'}>
                Fotos {imageCount}/{EVENT_MEDIA_LIMITS.freeImages}
              </AppText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <VideoIcon color={colors.muted} size={14} />
              <AppText variant="caption" tone={videosFull ? 'gold' : 'muted'}>
                Videos {videoCount}/{EVENT_MEDIA_LIMITS.freeVideos}
              </AppText>
            </View>
          </View>

          {media.isPending ? (
            <Skeleton height={160} radius={12} />
          ) : mediaItems.length === 0 ? (
            <EmptyState
              icon={CameraIcon}
              title="Sin recuerdos todavía"
              message="Agrega fotos o un video de esta carrera para revivirla después."
              actionLabel="Agregar recuerdo"
              onAction={() => setUploadOpen(true)}
            />
          ) : (
            <MediaGrid items={mediaItems} onPress={(index) => setViewerIndex(index)} />
          )}

          {imagesFull && videosFull ? (
            <Card style={{ alignItems: 'center', gap: spacing.xs }}>
              <AppText variant="body" align="center">
                Tus recuerdos incluidos están completos.
              </AppText>
              <AppButton
                label="Ver opciones"
                variant="secondary"
                fullWidth={false}
                onPress={() => router.push('/my-events/memory-upgrades')}
                style={{ paddingHorizontal: spacing.lg }}
              />
            </Card>
          ) : null}
        </View>

        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <SectionTitle title="Equipo usado" />
            <PressScale haptic onPress={() => setAddGearOpen(true)} accessibilityRole="button" accessibilityLabel="Agregar equipo">
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: 6,
                  borderRadius: radius.pill,
                  borderWidth: 1,
                  borderColor: colors.goldDim,
                }}>
                <Plus color={colors.gold} size={14} />
                <AppText variant="caption" tone="gold">
                  Agregar
                </AppText>
              </View>
            </PressScale>
          </View>

          {(gearUsed.length === 0) ? (
            <AppText variant="body" tone="muted">
              Aún no marcaste equipo para esta carrera.
            </AppText>
          ) : (
            <View style={{ gap: spacing.xs }}>
              {gearUsed.map((gear) => (
                <Card key={gear.uuid} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyStrong">{gear.product_name}</AppText>
                    {gear.variant_name ? (
                      <AppText variant="caption" tone="muted">
                        {gear.variant_name}
                      </AppText>
                    ) : null}
                  </View>
                  <Pressable
                    onPress={() => setRemovingGearUuid(gear.uuid)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel="Quitar equipo">
                    <Trash2 color={colors.muted} size={18} />
                  </Pressable>
                </Card>
              ))}
            </View>
          )}
        </View>

        {purchases.length > 0 ? (
          <View style={{ gap: spacing.sm }}>
            <SectionTitle title="Compras de esta carrera" />
            <View style={{ gap: spacing.xs }}>
              {purchases.map((purchase) => (
                <Card key={purchase.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyStrong">{purchase.name}</AppText>
                    <AppText variant="caption" tone="muted">
                      x{purchase.quantity} · {purchase.payment_status}
                    </AppText>
                  </View>
                  <AppText variant="bodyStrong" tone="gold">
                    {formatMoney(purchase.line_total_minor, purchase.currency)}
                  </AppText>
                </Card>
              ))}
            </View>
          </View>
        ) : null}

        {supportSession ? (
          <View style={{ gap: spacing.sm }}>
            <SectionTitle title="Tu equipo de apoyo" />
            <Card style={{ gap: spacing.xs }}>
              <AppText variant="bodyStrong">{supportSession.title}</AppText>
              <Badge label={SUPPORT_STATUS_LABEL[supportSession.status] ?? supportSession.status} />
              {supportSession.messages.slice(0, 2).map((message) => (
                <AppText key={message.id} variant="caption" tone="muted" numberOfLines={2}>
                  {message.is_surprise ? '🎁 Un mensaje sorpresa te espera.' : message.message_text ?? '…'}
                </AppText>
              ))}
            </Card>
          </View>
        ) : null}
      </View>

      <MediaViewer
        key={viewerIndex ?? 'closed'}
        visible={viewerIndex !== null}
        items={mediaItems}
        initialIndex={viewerIndex ?? 0}
        onClose={() => setViewerIndex(null)}
        onOpenActions={(item) => setActionsFor(item)}
      />

      <MediaUploadSheet
        visible={uploadOpen}
        onClose={() => setUploadOpen(false)}
        participantId={participantId}
        remainingImages={EVENT_MEDIA_LIMITS.freeImages - imageCount}
        remainingVideos={EVENT_MEDIA_LIMITS.freeVideos - videoCount}
        onLimitReached={() => router.push('/my-events/memory-upgrades')}
      />

      <Sheet visible={actionsFor !== null} onClose={() => setActionsFor(null)}>
        {actionsFor ? (
          <>
            <SheetActionRow
              icon={actionsFor.is_public ? Lock : Globe}
              label={actionsFor.is_public ? 'Hacer sólo mío' : 'Hacer público'}
              onPress={() => handleToggleVisibility(actionsFor)}
            />
            <SheetActionRow icon={Trash2} label="Eliminar" destructive onPress={() => setConfirmingDeleteMedia(true)} />
          </>
        ) : null}
      </Sheet>

      <ConfirmDialog
        visible={confirmingDeleteMedia}
        title="Eliminar recuerdo"
        description="Esta foto o video se quitará de esta carrera. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        loading={deleteMedia.isPending}
        onConfirm={handleDeleteMedia}
        onCancel={() => setConfirmingDeleteMedia(false)}
      />

      <Sheet visible={addGearOpen} onClose={() => setAddGearOpen(false)}>
        <AppText variant="subtitle" style={{ marginBottom: spacing.sm }}>
          Elige equipo de tu Digital Closet
        </AppText>
        {myGear.isPending ? (
          <Skeleton height={80} />
        ) : availableGear.length === 0 ? (
          <AppText variant="body" tone="muted" style={{ paddingBottom: spacing.md }}>
            No tienes más equipo disponible para agregar.
          </AppText>
        ) : (
          <View style={{ gap: spacing.xs, paddingBottom: spacing.sm }}>
            {availableGear.map((product) => (
              <Pressable
                key={product.uuid}
                onPress={() => {
                  handleAddGear(product);
                  setAddGearOpen(false);
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyStrong">{product.product_name}</AppText>
                  {product.variant_name ? (
                    <AppText variant="caption" tone="muted">
                      {product.variant_name}
                    </AppText>
                  ) : null}
                </View>
                <Plus color={colors.gold} size={18} />
              </Pressable>
            ))}
          </View>
        )}
      </Sheet>

      <ConfirmDialog
        visible={removingGearUuid !== null}
        title="Quitar equipo"
        description="Este equipo dejará de estar asociado a esta carrera."
        confirmLabel="Quitar"
        loading={removeGear.isPending}
        onConfirm={handleRemoveGear}
        onCancel={() => setRemovingGearUuid(null)}
      />
    </Screen>
  );
}
