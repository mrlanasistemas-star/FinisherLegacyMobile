/**
 * Entrenamientos — the athlete's inbox of "Envíame ánimo" voice and text
 * messages. Large collapsing title, the "Modo entrenamiento" hero, counters,
 * a Todos / Sin escuchar / Favoritos filter, swipeable message cards with a
 * long-press menu, offline downloads, and the mini-player at the bottom.
 * Without signal it falls back to the messages downloaded on this phone.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import { ChevronLeft, CloudDownload, CloudOff, Link2, MessageCircleHeart, Play, Settings2 } from 'lucide-react-native';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppError } from '@/api/errors';
import { AppText } from '@/components/app-text';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { BrandRefreshControl } from '@/components/motion/brand-refresh-control';
import { PressableScale } from '@/components/motion/pressable-scale';
import { listEntering, Reveal } from '@/components/motion/reveal';
import { ScrollHeader, useScrollY } from '@/components/motion/scroll-header';
import { Skeleton } from '@/components/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { IconButton } from '@/components/ui/icon-button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { MessageCard } from '@/features/training/components/message-card';
import { AudioSettingsSheet, MessageActionsSheet } from '@/features/training/components/message-sheets';
import { MiniPlayer, PLAYER_HREF } from '@/features/training/components/mini-player';
import { downloadAll, downloadMessage, isOfflineAvailable, offlineMessages, removeDownload, useOfflineStore } from '@/features/training/offline-cache';
import { playFromList } from '@/features/training/player-controller';
import { usePlayerStore } from '@/features/training/player-store';
import { currentId } from '@/features/training/queue';
import {
  flattenMessages,
  useBlockSender,
  useHideMessage,
  useToggleFavorite,
  useTrainingMessages,
} from '@/features/training/use-training';
import { useI18n } from '@/i18n';
import type { TrainingFilter, TrainingMessage } from '@/schemas/training';
import { showToast } from '@/stores/toastStore';
import { gradients } from '@/theme/gradients';
import { colors, fontFamily, radius, shadows, spacing } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';

const NAV_HEIGHT = 52;
const SESSION_HREF = '/training/session' as Href;
const SHARE_HREF = '/training/share' as Href;

export default function TrainingHomeScreen() {
  const { t } = useI18n();
  const filters: { value: TrainingFilter; label: string }[] = [
    { value: 'all', label: t('Todos||filtro: todos los mensajes') },
    { value: 'unheard', label: t('Sin escuchar') },
    { value: 'favorites', label: t('Favoritos') },
  ];
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const { scrollY, onScroll } = useScrollY();
  const [filter, setFilter] = useState<TrainingFilter>('all');
  const [menuFor, setMenuFor] = useState<TrainingMessage | null>(null);
  const [blockTarget, setBlockTarget] = useState<TrainingMessage | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const query = useTrainingMessages(filter);
  const allQuery = useTrainingMessages('all');
  const favoritesQuery = useTrainingMessages('favorites');
  const toggleFavorite = useToggleFavorite();
  const hide = useHideMessage();
  const block = useBlockSender();

  const entries = useOfflineStore((s) => s.entries);
  const downloading = useOfflineStore((s) => s.downloading);
  const loadedId = usePlayerStore((s) => currentId(s.queue));
  const playing = usePlayerStore((s) => s.status.playing);
  const progress = usePlayerStore((s) => (s.status.duration > 0 ? s.status.position / s.status.duration : 0));
  const hasMini = usePlayerStore((s) => currentId(s.queue) !== null);

  const offlineFallback = query.isError && query.error instanceof AppError && (query.error.kind === 'network' || query.error.kind === 'timeout') && Object.keys(entries).length > 0;

  const messages = useMemo(() => {
    if (offlineFallback) {
      const saved = offlineMessages(entries);
      if (filter === 'unheard') return saved.filter((m) => !m.listened_at);
      if (filter === 'favorites') return saved.filter((m) => m.favorite);
      return saved;
    }
    return flattenMessages(query.data);
  }, [offlineFallback, entries, filter, query.data]);

  const unheardCount = allQuery.data?.pages[0]?.meta.unheard_count ?? query.data?.pages[0]?.meta.unheard_count ?? null;
  const favoritesCount = favoritesQuery.data?.pages[0]?.meta.total ?? null;
  const totalCount = allQuery.data?.pages[0]?.meta.total ?? null;

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([query.refetch(), allQuery.refetch(), favoritesQuery.refetch()]);
    setRefreshing(false);
  }, [query, allQuery, favoritesQuery]);

  const play = useCallback(
    (message: TrainingMessage) => {
      if (!playFromList(messages, message.uuid)) {
        showToast(t('Este audio se está procesando. Estará listo en unos segundos.'));
        return;
      }
      router.push(PLAYER_HREF);
    },
    [messages, t],
  );

  const onToggleFavorite = useCallback((message: TrainingMessage) => toggleFavorite.mutate({ uuid: message.uuid, favorite: !message.favorite }, { onError: (e) => showToast(e.message, 'destructive') }), [toggleFavorite]);

  const onHide = useCallback(
    (message: TrainingMessage) => {
      haptics.light();
      hide.mutate(message.uuid, {
        onSuccess: () => showToast(t('Mensaje oculto')),
        onError: (e) => showToast(e.message, 'destructive'),
      });
    },
    [hide, t],
  );

  const onToggleOffline = useCallback(async (message: TrainingMessage) => {
    if (useOfflineStore.getState().entries[message.uuid]) {
      removeDownload(message.uuid);
      showToast(t('Descarga eliminada'));
      return;
    }
    const ok = await downloadMessage(message);
    showToast(ok ? t('Disponible sin conexión') : t('No pudimos descargarlo. Actualiza la lista e intenta de nuevo.'), ok ? 'success' : 'destructive');
  }, [t]);

  const pendingDownloads = messages.filter((m) => m.audio_url && !entries[m.uuid]);
  const onDownloadAll = async () => {
    setDownloadingAll(true);
    // Signed URLs expire: refresh first so every download uses a fresh one.
    const fresh = await query.refetch();
    const list = flattenMessages(fresh.data).filter((m) => m.audio_url);
    const result = await downloadAll(list);
    setDownloadingAll(false);
    if (result.failed > 0) showToast(t('Descargamos {ok}. {failed} no se pudieron descargar.', { ok: result.ok, failed: result.failed }), 'destructive');
    else showToast(t('Tus mensajes están disponibles sin conexión'), 'success');
  };

  const header = (
    <View style={{ paddingHorizontal: spacing.lg, gap: spacing.lg, paddingBottom: spacing.md }}>
      <Reveal style={{ gap: 4 }}>
        <AppText variant="eyebrow">{t('Envíame ánimo')}</AppText>
        <AppText variant="display" accessibilityRole="header">
          {t('Entrenamientos')}
        </AppText>
        <AppText variant="body" tone="muted">
          {t('Escucha a quienes creen en ti mientras entrenas.')}
        </AppText>
      </Reveal>

      <Reveal delay={60}>
        <TrainingHero unheard={unheardCount} />
      </Reveal>

      <Reveal delay={110} style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Counter label={t('Nuevos')} value={unheardCount} active={filter === 'unheard'} onPress={() => setFilter('unheard')} />
        <Counter label={t('Favoritos')} value={favoritesCount} active={filter === 'favorites'} onPress={() => setFilter('favorites')} />
        <Counter label={t('Total')} value={totalCount} active={filter === 'all'} onPress={() => setFilter('all')} />
      </Reveal>

      <View style={{ gap: spacing.sm }}>
        <SegmentedControl options={filters} value={filter} onChange={setFilter} />
        {offlineFallback ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.xxs }}>
            <CloudOff size={16} color={colors.muted} />
            <AppText variant="caption" tone="muted" style={{ flex: 1 }}>
              {t('Sin conexión · te mostramos los mensajes descargados.')}
            </AppText>
          </View>
        ) : isOfflineAvailable() && pendingDownloads.length > 1 ? (
          <PressableScale
            onPress={onDownloadAll}
            disabled={downloadingAll}
            accessibilityRole="button"
            accessibilityLabel={t('Descargar todos para escucharlos sin conexión')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 40, alignSelf: 'flex-start', paddingHorizontal: spacing.xxs }}>
            {downloadingAll ? <ActivityIndicator size="small" color={colors.accent} /> : <CloudDownload size={17} color={colors.accent} />}
            <AppText variant="caption" tone="accent" style={{ fontFamily: fontFamily.semibold }}>
              {downloadingAll ? t('Descargando…') : t('Descargar todos ({count}) para sin conexión', { count: pendingDownloads.length })}
            </AppText>
          </PressableScale>
        ) : null}
      </View>
    </View>
  );

  const bottomSpace = insets.bottom + (hasMini ? 84 : spacing.xl);

  let body: ReactNode = null;
  if (query.isPending && !offlineFallback) {
    body = (
      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
        {[0, 1, 2, 3].map((i) => (
          <MessageSkeleton key={i} />
        ))}
      </View>
    );
  } else if (query.isError && !offlineFallback) {
    const notFound = query.error instanceof AppError && query.error.kind === 'not_found';
    body = notFound ? (
      <EmptyState
        icon={MessageCircleHeart}
        title={t('Muy pronto')}
        message={t('Estamos preparando tus mensajes de ánimo. Vuelve a intentarlo en un momento.')}
        actionLabel={t('Reintentar')}
        onAction={() => query.refetch()}
      />
    ) : (
      <ErrorState error={query.error} onRetry={() => query.refetch()} message={t('No pudimos cargar tus mensajes.')} />
    );
  } else if (messages.length === 0) {
    body =
      filter === 'all' ? (
        <EmptyState
          icon={MessageCircleHeart}
          title={t('Tu equipo de ánimo te espera')}
          message={t('Comparte tu enlace con familia y amigos. Te mandarán audios y mensajes que escucharás mientras entrenas — sin necesidad de app.')}
          actionLabel={t('Compartir mi enlace')}
          onAction={() => router.push(SHARE_HREF)}
        />
      ) : filter === 'unheard' ? (
        <EmptyState compact icon={MessageCircleHeart} title={t('Estás al día')} message={t('Ya escuchaste todos tus mensajes. Cuando llegue uno nuevo aparecerá aquí.')} />
      ) : (
        <EmptyState compact icon={MessageCircleHeart} title={t('Sin favoritos aún')} message={t('Desliza un mensaje a la izquierda o mantenlo presionado para guardarlo en favoritos.')} />
      );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Animated.FlatList
        data={body ? [] : messages}
        keyExtractor={(item) => item.uuid}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + NAV_HEIGHT, paddingBottom: bottomSpace }}
        ListHeaderComponent={header}
        ListEmptyComponent={body ? <View>{body}</View> : null}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        renderItem={({ item, index }) => (
          <Animated.View entering={listEntering(index, reduceMotion)} style={{ paddingHorizontal: spacing.lg }}>
            <MessageCard
              message={item}
              current={item.uuid === loadedId}
              playing={item.uuid === loadedId && playing}
              progress={item.uuid === loadedId ? progress : 0}
              offline={!!entries[item.uuid] && !downloading[item.uuid]}
              onPress={() => play(item)}
              onLongPress={() => {
                haptics.selection();
                setMenuFor(item);
              }}
              onToggleFavorite={() => onToggleFavorite(item)}
              onHide={() => onHide(item)}
            />
          </Animated.View>
        )}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (!offlineFallback && query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
        }}
        ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator style={{ marginTop: spacing.lg }} color={colors.accent} /> : null}
        refreshControl={<BrandRefreshControl refreshing={refreshing} onRefresh={refresh} progressViewOffset={insets.top + NAV_HEIGHT} />}
      />

      <ScrollHeader
        scrollY={scrollY}
        title={t('Entrenamientos')}
        threshold={90}
        left={<IconButton icon={ChevronLeft} label={t('Volver')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} size={26} />}
        right={
          <>
            <IconButton icon={Link2} label={t('Compartir mi enlace')} onPress={() => router.push(SHARE_HREF)} />
            <IconButton icon={Settings2} label={t('Audio del entrenamiento')} onPress={() => setSettingsOpen(true)} />
          </>
        }
      />

      <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + spacing.xs }}>
        <MiniPlayer />
      </View>

      <MessageActionsSheet
        message={menuFor}
        offline={!!(menuFor && entries[menuFor.uuid])}
        onClose={() => setMenuFor(null)}
        onPlay={play}
        onToggleFavorite={onToggleFavorite}
        onToggleOffline={(m) => void onToggleOffline(m)}
        onHide={onHide}
        onBlock={setBlockTarget}
      />

      <ConfirmDialog
        visible={!!blockTarget}
        title={t('¿Bloquear a {name}?', { name: blockTarget?.sender_name ?? '' })}
        description={t('Sus mensajes desaparecerán de tu lista y no podrá enviarte más desde tus enlaces.')}
        confirmLabel={t('Bloquear')}
        loading={block.isPending}
        onCancel={() => setBlockTarget(null)}
        onConfirm={() => {
          if (!blockTarget) return;
          block.mutate(blockTarget, {
            onSuccess: () => showToast(t('Remitente bloqueado')),
            onError: (e) => showToast(e.message, 'destructive'),
            onSettled: () => setBlockTarget(null),
          });
        }}
      />

      <AudioSettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </View>
  );
}

function TrainingHero({ unheard }: { unheard: number | null }) {
  const { t, tc } = useI18n();
  const subtitle =
    unheard === null
      ? t('Tu equipo te acompaña en cada kilómetro.')
      : unheard > 0
        ? tc('{count} mensaje nuevo te espera.|{count} mensajes nuevos te esperan.', unheard)
        : t('Escucha de nuevo a tu equipo mientras entrenas.');
  return (
    <PressableScale
      onPress={() => router.push(SESSION_HREF)}
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={t('Modo entrenamiento')}
      accessibilityHint={t('Empieza un entrenamiento con tus mensajes de ánimo')}
      style={{ borderRadius: radius.xl, ...shadows.card }}>
      <LinearGradient
        colors={gradients.carbon}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: radius.xl, borderCurve: 'continuous', padding: spacing.lg, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <LinearGradient
          colors={gradients.goldGlow}
          start={{ x: 1, y: 0.5 }}
          end={{ x: 0.3, y: 0.5 }}
          style={{ position: 'absolute', right: -40, top: -40, bottom: -40, width: 220 }}
          pointerEvents="none"
        />
        <View style={{ flex: 1, gap: spacing.xs }}>
          <AppText variant="eyebrow" style={{ color: colors.gold }}>
            {t('Modo entrenamiento')}
          </AppText>
          <AppText variant="subtitle" tone="onDark" style={{ fontSize: 21, lineHeight: 26 }}>
            {t('Entrena con tu equipo')}
          </AppText>
          <AppText variant="caption" tone="onDarkMuted">
            {subtitle}
          </AppText>
        </View>
        <LinearGradient
          colors={gradients.gold}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', ...shadows.gold }}>
          <Play size={28} color={colors.onGold} fill={colors.onGold} strokeWidth={0} style={{ marginLeft: 4 }} />
        </LinearGradient>
      </LinearGradient>
    </PressableScale>
  );
}

function Counter({ label, value, active, onPress }: { label: string; value: number | null; active: boolean; onPress: () => void }) {
  const { t } = useI18n();
  return (
    <PressableScale
      onPress={onPress}
      haptic="selection"
      scaleTo={0.96}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={t('{label}: {value}', { label, value: value ?? t('cargando') })}
      style={{
        flex: 1,
        backgroundColor: colors.card,
        borderRadius: radius.md,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: active ? colors.gold : colors.hairline,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.sm,
        gap: 2,
      }}>
      <AppText style={{ fontFamily: fontFamily.heading, fontSize: 22, color: colors.foreground, fontVariant: ['tabular-nums'] }} maxFontSizeMultiplier={1.3}>
        {value === null ? '–' : value}
      </AppText>
      <AppText variant="caption" tone="subtle" numberOfLines={1} style={{ fontSize: 12.5 }}>
        {label}
      </AppText>
    </PressableScale>
  );
}

function MessageSkeleton() {
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.hairline, padding: spacing.md, flexDirection: 'row', gap: spacing.sm }}>
      <Skeleton width={48} height={48} radius={24} />
      <View style={{ flex: 1, gap: 8 }}>
        <Skeleton width="45%" height={14} />
        <Skeleton width="30%" height={11} />
        <Skeleton width="90%" height={12} />
        <Skeleton width="55%" height={20} radius={10} />
      </View>
    </View>
  );
}
