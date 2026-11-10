/**
 * One story ("recuerdo") as its owner sees it: the cover as a full-bleed
 * hero with the event and title, the race set like a results sheet, the
 * story text, the gallery (photos + videos → full-screen viewer with
 * swipe and pinch-zoom), the voice message, native share and who can see
 * it. From here the athlete edits the data (`…/edit`) and manages photos
 * and videos (`…/media`).
 *
 * Data: `GET /me/stories/{id}` (editable story) + `GET /me/stories/{id}/media`.
 * While that contract is not deployed (404) the screen still shows what
 * the existing `GET /stories/{id}` returns — read-only, nothing invented —
 * and says editing is not available yet.
 */

import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { ChevronLeft, Globe, ImagePlus, Images, Link2, Lock, PenLine, Share2, type LucideIcon } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Share, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppError } from '@/api/errors';
import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { GradientOverlay } from '@/components/brand/gradient-overlay';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { BrandRefreshControl } from '@/components/motion/brand-refresh-control';
import { PressableScale } from '@/components/motion/pressable-scale';
import { Reveal } from '@/components/motion/reveal';
import { ScrollHeader, useParallax, useScrollY } from '@/components/motion/scroll-header';
import { Skeleton } from '@/components/skeleton';
import { IconButton } from '@/components/ui/icon-button';
import { SectionHeader } from '@/components/ui/section-header';
import { useStory } from '@/features/iap/use-photo-expansion';
import { MediaTile } from '@/features/stories/components/media-tile';
import { hasRaceData, RaceDataCard } from '@/features/stories/components/race-data-card';
import { StoryViewer } from '@/features/stories/components/story-viewer';
import { VisibilitySheet, VISIBILITY_COPY } from '@/features/stories/components/visibility-sheet';
import { VoicePlayer } from '@/features/stories/components/voice-player';
import { isoToDisplayDate } from '@/features/stories/story-form';
import { summarize, uploadsForStory } from '@/features/stories/upload-queue';
import { useUploadStore } from '@/features/stories/upload-store';
import { useEditableStory, useStoryMedia } from '@/features/stories/use-stories';
import { useResponsive } from '@/hooks/use-responsive';
import type { StoryMedia, StoryVisibility } from '@/schemas/story';
import { showToast } from '@/stores/toastStore';
import { gradients } from '@/theme/gradients';
import { colors, fontFamily, radius, spacing } from '@/theme/tokens';
import { formatLongDate } from '@/utils/dates';
import { haptics } from '@/utils/haptics';

const GAP = 6;
const VISIBILITY_ICON: Record<StoryVisibility, LucideIcon> = { private: Lock, unlisted: Link2, public: Globe };

function notDeployed(error: unknown): boolean {
  return error instanceof AppError && error.kind === 'not_found';
}

function dateLabel(value: string | null | undefined): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}/.test(value)) return null;
  return isoToDisplayDate(value) ? formatLongDate(value.slice(0, 10)) : null;
}

export default function StoryScreen() {
  const { publicId = '' } = useLocalSearchParams<{ publicId?: string }>();
  const insets = useSafeAreaInsets();
  const { width, height } = useResponsive();
  const { scrollY, onScroll } = useScrollY();

  const story = useEditableStory(publicId);
  const summary = useStory(publicId);
  const media = useStoryMedia(publicId);
  const uploads = useUploadStore((state) => state.queue);
  const previews = useUploadStore((state) => state.previews);

  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [visibilityOpen, setVisibilityOpen] = useState(false);

  const editable = story.data ?? null;
  const fallback = summary.data ?? null;
  /** The new contract is not live yet: show the read-only story, hide the editor. */
  const editingUnavailable = !editable && notDeployed(story.error);
  const isOwner = !!editable;

  const contentWidth = Math.min(width, 720);
  const heroHeight = Math.round(Math.min(Math.max(contentWidth * 1.08, 340), height * 0.58));
  const parallax = useParallax(scrollY, heroHeight);

  const gallery = useMemo<StoryMedia[]>(() => {
    if (media.data) return media.data.items.filter((item) => item.role !== 'audio');
    if (!fallback) return [];
    return fallback.photos.map((photo, index) => ({
      uuid: `summary-${photo.id}`,
      role: 'photo' as const,
      url: photo.url,
      thumb_url: photo.thumb_url,
      poster_url: null,
      duration_seconds: null,
      status: 'ready' as const,
      sort_order: index,
      source: 'upload' as const,
    }));
  }, [media.data, fallback]);

  const viewable = useMemo(() => gallery.filter((item) => item.status === 'ready' && !!item.url), [gallery]);
  const voice = media.data?.items.find((item) => item.role === 'audio') ?? null;
  const voiceUrl = voice?.url ?? (media.data ? null : (fallback?.audio_url ?? null));

  const firstPhoto = gallery.find((item) => item.role === 'photo' && item.status === 'ready');
  // Until the first photo is processed, the hero shows the file it was uploaded from.
  const firstLocal = gallery.find((item) => item.role === 'photo' && previews[item.uuid]);
  const coverUrl = firstPhoto?.url ?? firstPhoto?.thumb_url ?? fallback?.cover_url ?? editable?.cover_url ?? (firstLocal ? previews[firstLocal.uuid] : null) ?? null;

  const title = editable?.title || fallback?.title || editable?.event_name || fallback?.event?.name || 'Mi recuerdo';
  const eventName = editable?.event_name ?? fallback?.event?.name ?? null;
  const date = dateLabel(editable?.race_date ?? fallback?.event?.date);
  const eyebrow = [eventName && eventName !== title ? eventName : null, date].filter(Boolean).join('  ·  ');
  const dedication = editable?.dedication ?? fallback?.dedication ?? null;
  const body = editable?.body ?? fallback?.body ?? null;

  const queue = summarize(uploadsForStory(uploads, publicId).filter((item) => item.status !== 'done'));
  const tile = Math.floor((contentWidth - spacing.lg * 2 - GAP * 2) / 3);
  const loading = story.isPending && summary.isPending;
  const failed = !editable && !fallback && !loading;
  const footerHeight = isOwner ? 44 + spacing.sm + Math.max(insets.bottom, spacing.sm) + spacing.xs : 0;

  function refresh() {
    void story.refetch();
    void summary.refetch();
    void media.refetch();
  }

  async function share() {
    const url = editable?.share_url ?? fallback?.web_url ?? null;
    if (editable?.visibility === 'private') {
      showToast('Tu recuerdo es privado. Elige quién puede verlo para compartirlo.');
      setVisibilityOpen(true);
      return;
    }
    if (!url) {
      showToast('Este recuerdo aún no tiene un enlace para compartir.');
      return;
    }
    haptics.light();
    try {
      await Share.share({ message: `${title}\n${url}`, url, title });
    } catch {
      // The share sheet was dismissed or is unavailable — nothing to report.
    }
  }

  function openViewer(item: StoryMedia) {
    const index = viewable.findIndex((candidate) => candidate.uuid === item.uuid);
    if (index >= 0) setViewerIndex(index);
    else if (item.status === 'processing') showToast('Todavía lo estamos procesando. En un momento podrás abrirlo.');
  }

  const back = () => (router.canGoBack() ? router.back() : router.replace('/legacy'));
  const VisibilityIcon = editable ? VISIBILITY_ICON[editable.visibility] : Lock;

  if (failed) {
    const error = story.error ?? summary.error;
    const missing = notDeployed(story.error) && (summary.isError ? notDeployed(summary.error) : true);
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        <View style={{ paddingHorizontal: spacing.sm, minHeight: 52, justifyContent: 'center' }}>
          <IconButton icon={ChevronLeft} label="Volver" onPress={back} size={26} />
        </View>
        <ErrorState
          error={error}
          title={missing ? 'Recuerdo no disponible' : undefined}
          message={missing ? 'No encontramos este recuerdo o ya no tienes acceso a él.' : 'No pudimos abrir este recuerdo.'}
          onRetry={missing ? undefined : refresh}
          onBack={back}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={<BrandRefreshControl refreshing={story.isRefetching || summary.isRefetching} onRefresh={refresh} progressViewOffset={insets.top + 52} />}
        contentContainerStyle={{ paddingBottom: footerHeight + insets.bottom + spacing.xl }}>
        {/* Hero */}
        <View style={{ height: heroHeight, backgroundColor: colors.black, overflow: 'hidden' }}>
          <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, parallax]}>
            {coverUrl ? (
              <Image source={{ uri: coverUrl }} style={{ flex: 1 }} contentFit="cover" transition={260} accessibilityIgnoresInvertColors />
            ) : (
              <>
                <LinearGradient colors={gradients.carbon} style={{ flex: 1 }} />
                <LinearGradient colors={gradients.goldGlow} start={{ x: 1, y: 0 }} end={{ x: 0.2, y: 0.9 }} style={{ position: 'absolute', top: 0, right: 0, width: '90%', height: '80%' }} />
              </>
            )}
          </Animated.View>
          <GradientOverlay variant="top" />
          <GradientOverlay variant="bottom" />

          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' }}>
            <View style={{ width: contentWidth, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: 6 }}>
              {loading ? (
                <>
                  <Skeleton width={140} height={12} />
                  <Skeleton width={240} height={30} />
                </>
              ) : (
                <Reveal style={{ gap: 6 }}>
                  {eyebrow ? (
                    <AppText maxFontSizeMultiplier={1.3} numberOfLines={2} style={{ fontFamily: fontFamily.bold, fontSize: 11, letterSpacing: 2, color: colors.goldSoft, textTransform: 'uppercase' }}>
                      {eyebrow}
                    </AppText>
                  ) : null}
                  <AppText
                    accessibilityRole="header"
                    numberOfLines={3}
                    maxFontSizeMultiplier={1.3}
                    style={{ fontFamily: fontFamily.heading, fontSize: title.length > 34 ? 28 : 34, lineHeight: title.length > 34 ? 33 : 39, letterSpacing: -0.6, color: colors.onDark }}>
                    {title}
                  </AppText>
                  {editable?.location ? (
                    <AppText numberOfLines={1} style={{ fontFamily: fontFamily.medium, fontSize: 14, color: colors.onDarkMuted }}>
                      {editable.location}
                    </AppText>
                  ) : null}
                </Reveal>
              )}
            </View>
          </View>
        </View>

        <View style={{ alignItems: 'center' }}>
          <View style={{ width: contentWidth, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.xl }}>
            {/* Who can see it */}
            {editable ? (
              <PressableScale
                onPress={() => setVisibilityOpen(true)}
                scaleTo={0.98}
                dim
                accessibilityRole="button"
                accessibilityLabel={`Quién puede verlo: ${VISIBILITY_COPY[editable.visibility].title}`}
                accessibilityHint="Abre las opciones de privacidad"
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start', minHeight: 36, marginBottom: -spacing.md }}>
                <VisibilityIcon size={15} color={colors.accent} strokeWidth={2} />
                <AppText style={{ fontFamily: fontFamily.semibold, fontSize: 14, color: colors.foreground }}>{VISIBILITY_COPY[editable.visibility].label}</AppText>
                <AppText style={{ fontFamily: fontFamily.regular, fontSize: 14, color: colors.subtle }}>· Cambiar</AppText>
              </PressableScale>
            ) : null}

            {editingUnavailable && fallback?.is_owner ? (
              <View style={{ padding: spacing.md, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.goldWash }}>
                <AppText variant="caption" style={{ color: colors.foreground }}>
                  Muy pronto podrás editar este recuerdo y subir fotos desde la app. Por ahora puedes hacerlo en finisherlegacy.com.
                </AppText>
              </View>
            ) : null}

            {/* Uploads still running (they continue outside the editor) */}
            {isOwner && queue.total > 0 ? (
              <PressableScale
                onPress={() => router.push(`/stories/${publicId}/media` as Href)}
                scaleTo={0.985}
                accessibilityRole="button"
                accessibilityLabel={queue.busy ? `Subiendo archivos, ${queue.progress} por ciento` : 'Hay archivos que no se subieron'}
                style={{ padding: spacing.md, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.hairline, gap: spacing.xs }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <AppText variant="bodyStrong">
                    {queue.busy ? `Subiendo ${queue.waiting} ${queue.waiting === 1 ? 'archivo' : 'archivos'}…` : queue.blocked > 0 ? 'Te quedaste sin espacio' : 'Algunos archivos no se subieron'}
                  </AppText>
                  <AppText variant="caption" tone="accent">
                    Ver
                  </AppText>
                </View>
                {queue.busy ? (
                  <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.surfaceMuted, overflow: 'hidden' }}>
                    <View style={{ width: `${queue.progress}%`, height: '100%', backgroundColor: colors.gold }} />
                  </View>
                ) : null}
              </PressableScale>
            ) : null}

            {/* Race */}
            {editable && hasRaceData(editable) ? (
              <Reveal delay={60}>
                <RaceDataCard story={editable} />
              </Reveal>
            ) : editable ? (
              <EmptyState
                compact
                icon={PenLine}
                title="Agrega los datos de tu carrera"
                message="Tu tiempo, dorsal, ritmo y posición: lo que quieres recordar de ese día."
                actionLabel="Completar datos"
                onAction={() => router.push(`/stories/${publicId}/edit` as Href)}
                style={{ backgroundColor: colors.card, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.hairline }}
              />
            ) : story.isPending ? (
              <Skeleton height={220} radius={radius.xl} />
            ) : null}

            {/* Story */}
            {dedication || body ? (
              <View style={{ gap: spacing.md }}>
                <AppText accessibilityRole="header" style={{ fontFamily: fontFamily.heading, fontSize: 20, letterSpacing: -0.2 }}>
                  Mi historia
                </AppText>
                {dedication ? (
                  <View style={{ borderLeftWidth: 2, borderLeftColor: colors.gold, paddingLeft: spacing.md, paddingVertical: 2 }}>
                    <AppText style={{ fontFamily: fontFamily.headingSemibold, fontSize: 18, lineHeight: 27, color: colors.foreground }}>{dedication}</AppText>
                  </View>
                ) : null}
                {body ? (
                  <AppText selectable style={{ fontFamily: fontFamily.regular, fontSize: 16.5, lineHeight: 27, color: colors.foreground }}>
                    {body}
                  </AppText>
                ) : null}
              </View>
            ) : editable ? (
              <PressableScale
                onPress={() => router.push(`/stories/${publicId}/edit` as Href)}
                scaleTo={0.985}
                accessibilityRole="button"
                accessibilityLabel="Escribir mi historia"
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.hairline }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, borderCurve: 'continuous', backgroundColor: colors.goldWash, alignItems: 'center', justifyContent: 'center' }}>
                  <PenLine size={18} color={colors.accent} strokeWidth={1.9} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyStrong">Cuenta tu historia</AppText>
                  <AppText variant="caption" tone="muted">
                    Lo que sentiste, a quién se la dedicas, lo que no quieres olvidar.
                  </AppText>
                </View>
              </PressableScale>
            ) : null}

            {/* Voice */}
            {voice || voiceUrl ? <VoicePlayer url={voiceUrl} durationSeconds={voice?.duration_seconds} processing={voice?.status === 'processing'} /> : null}

            {/* Gallery */}
            <View>
              <SectionHeader
                title="Fotos y videos"
                actionLabel={isOwner && gallery.length > 0 ? 'Administrar' : undefined}
                onAction={isOwner ? () => router.push(`/stories/${publicId}/media` as Href) : undefined}
              />
              {gallery.length > 0 ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
                  {gallery.map((item, index) => (
                    <PressableScale key={item.uuid} onPress={() => openViewer(item)} scaleTo={0.96} accessibilityRole="imagebutton" accessibilityLabel={`${item.role === 'video' ? 'Video' : 'Foto'} ${index + 1} de ${gallery.length}`}>
                      <MediaTile item={item} size={tile} previewUri={previews[item.uuid]} />
                    </PressableScale>
                  ))}
                </View>
              ) : media.isPending && summary.isPending ? (
                <View style={{ flexDirection: 'row', gap: GAP }}>
                  <Skeleton width={tile} height={tile} radius={radius.md} />
                  <Skeleton width={tile} height={tile} radius={radius.md} />
                  <Skeleton width={tile} height={tile} radius={radius.md} />
                </View>
              ) : isOwner ? (
                <EmptyState
                  compact
                  icon={Images}
                  title="Aún no hay fotos"
                  message="Sube las fotos y videos de ese día desde tu teléfono, o agrega las que compraste a los fotógrafos."
                  actionLabel="Agregar fotos"
                  onAction={() => router.push(`/stories/${publicId}/media?add=1` as Href)}
                />
              ) : (
                <AppText variant="body" tone="muted">
                  Este recuerdo aún no tiene fotos.
                </AppText>
              )}
            </View>
          </View>
        </View>
      </Animated.ScrollView>

      {/* Owner actions — pinned above the Android navigation bar / home indicator. */}
      {isOwner ? (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: 'center',
            backgroundColor: colors.background,
            borderTopWidth: 1,
            borderTopColor: colors.hairline,
            paddingTop: spacing.sm,
            paddingBottom: Math.max(insets.bottom, spacing.sm) + spacing.xs,
            paddingLeft: Math.max(insets.left, spacing.lg),
            paddingRight: Math.max(insets.right, spacing.lg),
          }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm, width: '100%', maxWidth: 720 - spacing.lg * 2 }}>
            <AppButton label="Editar" icon={PenLine} variant="secondary" size="md" fullWidth={false} style={{ flex: 1 }} onPress={() => router.push(`/stories/${publicId}/edit` as Href)} />
            <AppButton label="Fotos y videos" icon={ImagePlus} size="md" fullWidth={false} style={{ flex: 1.3 }} onPress={() => router.push(`/stories/${publicId}/media` as Href)} />
          </View>
        </View>
      ) : null}

      <ScrollHeader
        scrollY={scrollY}
        title={title}
        threshold={heroHeight - insets.top - 52}
        left={<IconButton icon={ChevronLeft} label="Volver" onPress={back} size={26} filled />}
        right={<IconButton icon={Share2} label="Compartir" onPress={() => void share()} filled />}
      />

      {editable ? <VisibilitySheet visible={visibilityOpen} onClose={() => setVisibilityOpen(false)} publicId={publicId} value={editable.visibility} /> : null}

      {viewerIndex !== null && viewable.length > 0 ? <StoryViewer key={viewerIndex} items={viewable} initialIndex={viewerIndex} onClose={() => setViewerIndex(null)} /> : null}
    </View>
  );
}
