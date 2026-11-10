import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  Share2,
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
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppError } from '@/api/errors';
import { AppButton } from '@/components/app-button';
import { PressableScale } from '@/components/motion/pressable-scale';
import { AppText } from '@/components/app-text';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { MediaGrid } from '@/components/media/media-grid';
import { MediaUploadSheet } from '@/components/media/media-upload-sheet';
import { MediaViewer } from '@/components/media/media-viewer';
import { Reveal } from '@/components/motion/reveal';
import { PressScale } from '@/components/motion/press-scale';
import { ScrollHeader, useScrollY } from '@/components/motion/scroll-header';
import { IconButton } from '@/components/ui/icon-button';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { SectionTitle } from '@/components/brand/section-title';
import { Skeleton } from '@/components/skeleton';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Sheet } from '@/components/ui/sheet';
import { SheetActionRow } from '@/components/ui/sheet-action-row';
import { useAddEventGear, useEventGear, useRemoveEventGear } from '@/hooks/use-event-gear';
import { useDeleteEventMedia, useEventMedia, useMediaEntitlement, useReorderEventMedia, useUpdateEventMediaVisibility } from '@/hooks/use-event-media';
import { useMyGear } from '@/hooks/use-gear';
import { useEventParticipant } from '@/hooks/use-my-events';
import { canOfferLiveTracking } from '@/features/tracking/eligibility';
import { LiveTrackingCard } from '@/features/tracking/components/live-tracking-card';
import { plateStatusLabel, supportStatusLabel } from '@/components/my-event-row';
import { showToast } from '@/stores/toastStore';
import { colors, radius, spacing } from '@/theme/tokens';
import { formatLongDate } from '@/utils/dates';
import { formatMoney } from '@/utils/money';
import type { AthleteEventMedia, AthleteOwnedProduct } from '@/types/models';
import { useI18n } from '@/i18n';

export default function MyEventDetailScreen() {
  const { t } = useI18n();
  const { participantId: participantIdParam } = useLocalSearchParams<{ participantId: string }>();
  const parsedParticipantId = Number(participantIdParam);
  const participantId = Number.isFinite(parsedParticipantId) ? parsedParticipantId : null;

  const { data, isPending, isError, error, refetch } = useEventParticipant(participantId);
  const insets = useSafeAreaInsets();
  const { scrollY, onScroll } = useScrollY();
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

  const entitlement = useMediaEntitlement(participantId);
  const reorderMedia = useReorderEventMedia(participantId);
  const mediaItems = useMemo(() => [...(media.data ?? [])].sort((a, b) => a.sort_order - b.sort_order), [media.data]);
  const imageCount = entitlement.data?.images.used ?? mediaItems.filter((item) => item.type === 'image').length;
  const videoCount = entitlement.data?.videos.used ?? mediaItems.filter((item) => item.type === 'video').length;
  // Limits come from the backend (free tier + any Memory Pack) — never hardcoded here.
  const imageLimit = entitlement.data?.images.limit ?? null;
  const videoLimit = entitlement.data?.videos.limit ?? null;
  const imagesFull = entitlement.data ? entitlement.data.images.remaining <= 0 : false;
  const videosFull = entitlement.data ? entitlement.data.videos.remaining <= 0 : false;

  /** Moves a media item one slot earlier/later and persists the order by uuid. */
  function moveMedia(uuid: string, direction: -1 | 1) {
    const order = mediaItems.map((item) => item.uuid);
    const from = order.indexOf(uuid);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= order.length) return;
    [order[from], order[to]] = [order[to], order[from]];
    reorderMedia.mutate(order, { onError: () => showToast(t('No pudimos guardar el nuevo orden. Intenta otra vez.'), 'destructive') });
  }

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
        <ScreenHeader title={t('Mi evento')} />
        <ErrorState message={t('Este enlace no es válido.')} />
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
        <ScreenHeader title={t('Mi evento')} />
        <ErrorState error={error} message={t('No pudimos cargar esta participación.')} onRetry={refetch} />
      </Screen>
    );
  }

  const { participant, result, medals, legacyPlate, gearUsed, purchases, supportSession } = data;
  const subtitle = [participant.edition, participant.race].filter(Boolean).join(' · ');

  async function handleToggleVisibility(item: AthleteEventMedia) {
    try {
      await updateVisibility.mutateAsync({ uuid: item.uuid, isPublic: !item.is_public });
      setActionsFor(null);
      showToast(item.is_public ? t('Ahora sólo tú puedes verlo.') : t('Ahora es público.'), 'success');
    } catch (caught) {
      showToast(caught instanceof AppError ? caught.message : t('No pudimos actualizar la visibilidad.'), 'destructive');
    }
  }

  async function handleDeleteMedia() {
    if (!actionsFor) return;
    try {
      await deleteMedia.mutateAsync(actionsFor.uuid);
      setConfirmingDeleteMedia(false);
      setActionsFor(null);
      showToast(t('Recuerdo eliminado.'), 'success');
    } catch (caught) {
      setConfirmingDeleteMedia(false);
      showToast(caught instanceof AppError ? caught.message : t('No pudimos eliminar este recuerdo.'), 'destructive');
    }
  }

  async function handleAddGear(product: AthleteOwnedProduct) {
    try {
      await addGear.mutateAsync({ athleteOwnedProductUuid: product.uuid });
      showToast(t('Equipo agregado a esta carrera.'), 'success');
    } catch (caught) {
      showToast(caught instanceof AppError ? caught.message : t('No pudimos agregar este equipo.'), 'destructive');
    }
  }

  async function handleRemoveGear() {
    if (!removingGearUuid) return;
    try {
      await removeGear.mutateAsync(removingGearUuid);
      setRemovingGearUuid(null);
      showToast(t('Equipo quitado de esta carrera.'), 'success');
    } catch (caught) {
      setRemovingGearUuid(null);
      showToast(caught instanceof AppError ? caught.message : t('No pudimos quitar este equipo.'), 'destructive');
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 52, paddingBottom: insets.bottom + spacing.xl }}>
      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.xl }}>
        <Reveal style={{ gap: spacing.xs }}>
          {participant.event_date ? <AppText variant="eyebrow">{formatLongDate(participant.event_date)}</AppText> : null}
          <AppText variant="display" accessibilityRole="header">
            {participant.event ?? t('Evento')}
          </AppText>
          {subtitle ? (
            <AppText variant="body" tone="muted">
              {subtitle}
            </AppText>
          ) : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs }}>
            {participant.bib_number ? <Badge label={t('Dorsal {number}', { number: participant.bib_number })} /> : null}
          </View>
        </Reveal>

        {/* Suggested, never automatic: the athlete decides what to share. */}
        <AppButton
          label={t('Compartir con mi comunidad')}
          icon={Share2}
          variant="secondary"
          size="md"
          onPress={() => router.push(`/moments/create?type=race_completed&participantId=${participant.id}`)}
        />

        {result ? (
          <View style={{ gap: spacing.sm }}>
            <SectionTitle title={t('Resultado')} />
            <Card>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, justifyContent: 'space-around' }}>
                {result.official_time ? (
                  <View>
                    <AppText variant="title" tone="gold">
                      {result.official_time}
                    </AppText>
                    <AppText variant="caption" tone="muted">
                      {t('Tiempo oficial')}
                    </AppText>
                  </View>
                ) : null}
                {result.pace ? (
                  <View>
                    <AppText variant="title">{result.pace}</AppText>
                    <AppText variant="caption" tone="muted">
                      {t('Ritmo')}
                    </AppText>
                  </View>
                ) : null}
                {result.overall_position ? (
                  <View>
                    <AppText variant="title">#{result.overall_position}</AppText>
                    <AppText variant="caption" tone="muted">
                      {t('General||clasificación general')}
                    </AppText>
                  </View>
                ) : null}
              </View>

              {result.splits.length > 0 ? (
                <View style={{ marginTop: spacing.md, gap: spacing.xs }}>
                  <AppText variant="eyebrow" tone="muted">
                    {t('Splits')}
                  </AppText>
                  {result.splits.map((split, index) => (
                    <View
                      key={`${split.label}-${index}`}
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        paddingVertical: spacing.xxs,
                        borderTopWidth: index === 0 ? 0 : 1,
                        borderTopColor: colors.hairline,
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
            <SectionTitle title={t('Medallas de esta carrera')} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {medals.map((medal) => (
                <PressScale key={medal.id} haptic onPress={() => router.push(`/medals/${medal.id}`)}>
                  <Card style={{ width: 140, alignItems: 'center', gap: spacing.xs }}>
                    <MedalIcon color={colors.accent} size={22} />
                    <AppText variant="caption" numberOfLines={2} align="center">
                      {medal.title ?? t('Medalla')}
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
                    backgroundColor: colors.surfaceMuted,
                  }}>
                  <Image
                    source={{ uri: legacyPlate.model.preview_image_url }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                  />
                </View>
              ) : null}
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="bodyStrong">{legacyPlate.personalization.athlete_name ?? t('Tu Legacy Plate')}</AppText>
                <AppText variant="caption" tone="muted">
                  {legacyPlate.model?.name ?? t('Modelo pendiente')}
                </AppText>
              </View>
              <Badge label={plateStatusLabel(legacyPlate.status, t) ?? legacyPlate.status} variant="gold" />
            </Card>
          ) : (
            <Card>
              <AppText variant="body" tone="muted">
                {t('Aún no tienes una Legacy Plate para esta participación.')}
              </AppText>
            </Card>
          )}
        </View>

        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <SectionTitle title={t('Recuerdos')} />
            <PressScale haptic onPress={() => setUploadOpen(true)} accessibilityRole="button" accessibilityLabel={t('Agregar recuerdo')}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: 6,
                  borderRadius: radius.pill,
                  backgroundColor: colors.goldWash,
                  minHeight: 32,
                }}>
                <Plus color={colors.accent} size={14} />
                <AppText variant="caption" tone="gold">
                  {t('Agregar')}
                </AppText>
              </View>
            </PressScale>
          </View>

          <View style={{ flexDirection: 'row', gap: spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <CameraIcon color={colors.muted} size={14} />
              <AppText variant="caption" tone={imagesFull ? 'gold' : 'muted'}>
                {imageLimit !== null ? t('Fotos {count}/{limit}', { count: imageCount, limit: imageLimit }) : t('Fotos {count}', { count: imageCount })}
              </AppText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <VideoIcon color={colors.muted} size={14} />
              <AppText variant="caption" tone={videosFull ? 'gold' : 'muted'}>
                {videoLimit !== null ? t('Videos {count}/{limit}', { count: videoCount, limit: videoLimit }) : t('Videos {count}', { count: videoCount })}
              </AppText>
            </View>
          </View>

          {media.isPending ? (
            <Skeleton height={160} radius={12} />
          ) : mediaItems.length === 0 ? (
            <EmptyState
              icon={CameraIcon}
              title={t('Sin recuerdos todavía')}
              message={t('Agrega fotos o un video de esta carrera para revivirla después.')}
              actionLabel={t('Agregar recuerdo')}
              onAction={() => setUploadOpen(true)}
            />
          ) : (
            <MediaGrid items={mediaItems} onPress={(index) => setViewerIndex(index)} />
          )}

          {imagesFull && videosFull ? (
            <Card style={{ alignItems: 'center', gap: spacing.xs }}>
              <AppText variant="bodyStrong" align="center">
                {t('Tus recuerdos incluidos están completos.')}
              </AppText>
              <AppText variant="caption" tone="muted" align="center">
                {t('Para agregar otro, elimina una foto o video de esta carrera.')}
              </AppText>
            </Card>
          ) : null}
        </View>

        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <SectionTitle title={t('Equipo usado')} />
            <PressScale haptic onPress={() => setAddGearOpen(true)} accessibilityRole="button" accessibilityLabel={t('Agregar equipo')}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: 6,
                  borderRadius: radius.pill,
                  backgroundColor: colors.goldWash,
                  minHeight: 32,
                }}>
                <Plus color={colors.accent} size={14} />
                <AppText variant="caption" tone="gold">
                  {t('Agregar')}
                </AppText>
              </View>
            </PressScale>
          </View>

          {(gearUsed.length === 0) ? (
            <AppText variant="body" tone="muted">
              {t('Aún no marcaste equipo para esta carrera.')}
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
                    accessibilityLabel={t('Quitar equipo')}>
                    <Trash2 color={colors.muted} size={18} />
                  </Pressable>
                </Card>
              ))}
            </View>
          )}
        </View>

        {purchases.length > 0 ? (
          <View style={{ gap: spacing.sm }}>
            <SectionTitle title={t('Compras de esta carrera')} />
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

        {canOfferLiveTracking(participant.event_date) ? (
          <View style={{ gap: spacing.sm }}>
            <SectionTitle title={t('Seguimiento en vivo')} />
            <LiveTrackingCard participantId={participant.id} />
          </View>
        ) : null}

        {supportSession ? (
          <View style={{ gap: spacing.sm }}>
            <SectionTitle title={t('Tu equipo de apoyo')} />
            <Card style={{ gap: spacing.xs }}>
              <AppText variant="bodyStrong">{supportSession.title}</AppText>
              <Badge label={supportStatusLabel(supportSession.status, t)} />
              {supportSession.messages.slice(0, 2).map((message) => (
                <AppText key={message.id} variant="caption" tone="muted" numberOfLines={2}>
                  {message.is_surprise ? t('🎁 Un mensaje sorpresa te espera.') : message.message_text ?? '…'}
                </AppText>
              ))}
            </Card>
          </View>
        ) : null}
      </View>
      </Animated.ScrollView>

      <ScrollHeader
        scrollY={scrollY}
        title={participant.event ?? t('Mi carrera')}
        threshold={60}
        left={<IconButton icon={ChevronLeft} label={t('Volver')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/legacy'))} size={26} />}
      />

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
        entitlement={entitlement.data}
        onLimitReached={() => showToast(t('Llegaste al límite de recuerdos de esta carrera. Elimina uno para agregar otro.'), 'default')}
      />

      <Sheet visible={actionsFor !== null} onClose={() => setActionsFor(null)}>
        {actionsFor ? (
          <>
            <SheetActionRow
              icon={actionsFor.is_public ? Lock : Globe}
              label={actionsFor.is_public ? t('Hacer sólo mío') : t('Hacer público')}
              onPress={() => handleToggleVisibility(actionsFor)}
            />
            {mediaItems.length > 1 && mediaItems[0]?.uuid !== actionsFor.uuid ? (
              <SheetActionRow
                icon={ArrowLeft}
                label={t('Mover antes')}
                onPress={() => {
                  moveMedia(actionsFor.uuid, -1);
                  setActionsFor(null);
                }}
              />
            ) : null}
            {mediaItems.length > 1 && mediaItems[mediaItems.length - 1]?.uuid !== actionsFor.uuid ? (
              <SheetActionRow
                icon={ArrowRight}
                label={t('Mover después')}
                onPress={() => {
                  moveMedia(actionsFor.uuid, 1);
                  setActionsFor(null);
                }}
              />
            ) : null}
            <SheetActionRow
              icon={Share2}
              label={t('Compartir con mi comunidad')}
              onPress={() => {
                const uuid = actionsFor.uuid;
                setActionsFor(null);
                router.push(`/moments/create?type=race_completed&participantId=${participantId}&mediaUuids=${uuid}`);
              }}
            />
            <SheetActionRow icon={Trash2} label={t('Eliminar')} destructive onPress={() => setConfirmingDeleteMedia(true)} />
          </>
        ) : null}
      </Sheet>

      <ConfirmDialog
        visible={confirmingDeleteMedia}
        title={t('Eliminar recuerdo')}
        description={t('Esta foto o video se quitará de esta carrera. Esta acción no se puede deshacer.')}
        confirmLabel={t('Eliminar')}
        loading={deleteMedia.isPending}
        onConfirm={handleDeleteMedia}
        onCancel={() => setConfirmingDeleteMedia(false)}
      />

      <Sheet visible={addGearOpen} onClose={() => setAddGearOpen(false)}>
        <AppText variant="subtitle" style={{ marginBottom: spacing.sm }}>
          {t('Elige de Mi equipo')}
        </AppText>
        {myGear.isPending ? (
          <Skeleton height={80} />
        ) : availableGear.length === 0 ? (
          <AppText variant="body" tone="muted" style={{ paddingBottom: spacing.md }}>
            {t('No tienes más equipo disponible para agregar.')}
          </AppText>
        ) : (
          <View style={{ gap: spacing.xs, paddingBottom: spacing.sm }}>
            {availableGear.map((product) => (
              <PressableScale
                dim
                scaleTo={0.98}
                key={product.uuid}
                onPress={() => {
                  handleAddGear(product);
                  setAddGearOpen(false);
                }}
                accessibilityRole="button"
                accessibilityLabel={t('Agregar {name}', { name: product.product_name })}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 52, paddingVertical: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyStrong">{product.product_name}</AppText>
                  {product.variant_name ? (
                    <AppText variant="caption" tone="muted">
                      {product.variant_name}
                    </AppText>
                  ) : null}
                </View>
                <Plus color={colors.accent} size={18} />
              </PressableScale>
            ))}
          </View>
        )}
      </Sheet>

      <ConfirmDialog
        visible={removingGearUuid !== null}
        title={t('Quitar equipo')}
        description={t('Este equipo dejará de estar asociado a esta carrera.')}
        confirmLabel={t('Quitar')}
        loading={removeGear.isPending}
        onConfirm={handleRemoveGear}
        onCancel={() => setRemovingGearUuid(null)}
      />
    </View>
  );
}
