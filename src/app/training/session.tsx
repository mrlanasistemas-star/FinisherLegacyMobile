/**
 * Modo entrenamiento — a workout with your messages. Setup: choose the queue
 * (unheard first / favorites / all), the interval (seguido or one message
 * every 3 / 5 / 10 min), how audio mixes with your music, and whether the
 * screen stays on. Running: a big glanceable workout clock, the countdown to
 * the next message, the current message, pause / skip / end, and a
 * "Sesión activa" badge while the workout keeps its audio session alive
 * (silent keep-alive between messages, so interval messages also arrive
 * with the screen locked — see `features/training/audio-session.ts`).
 * The clock is timestamp-based so it stays exact after the phone sleeps.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { CloudOff, Pause, Play, SkipForward, Square } from 'lucide-react-native';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform, ScrollView, Switch, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppError } from '@/api/errors';
import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { ErrorState } from '@/components/error-state';
import { PressableScale } from '@/components/motion/pressable-scale';
import { Reveal } from '@/components/motion/reveal';
import { Skeleton } from '@/components/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ListGroup, ListRow } from '@/components/ui/list-row';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { TopBar } from '@/components/ui/top-bar';
import type { MixMode } from '@/features/training/audio-driver';
import { mixModeCaption, type Os } from '@/features/training/audio-session';
import { SenderAvatar } from '@/features/training/components/message-visuals';
import { PLAYER_HREF } from '@/features/training/components/mini-player';
import { offlineMessages, useOfflineStore } from '@/features/training/offline-cache';
import { endSession, nextTrack, pauseSession, resumeSession, startSession, togglePlay } from '@/features/training/player-controller';
import { useCurrentMessage, usePlayerStore } from '@/features/training/player-store';
import { buildQueueIds, remainingCount, type QueueMode } from '@/features/training/queue';
import { elapsedMs, formatClock, INTERVAL_OPTIONS, msUntilNext, type IntervalMinutes } from '@/features/training/session-clock';
import { useTrainingSettings } from '@/features/training/settings-store';
import { flattenMessages, useTrainingMessages } from '@/features/training/use-training';
import { useI18n } from '@/i18n';
import type { TrainingMessage } from '@/schemas/training';
import { showToast } from '@/stores/toastStore';
import { gradients } from '@/theme/gradients';
import { colors, fontFamily, radius, shadows, spacing } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';

/** Max pages pulled into a session queue (keeps a huge inbox from stalling the start). */
const MAX_PAGES = 10;

export default function TrainingSessionScreen() {
  const active = usePlayerStore((s) => s.session.active);
  return active ? <RunningSession /> : <SessionSetup />;
}

function SessionSetup() {
  const { t, tc } = useI18n();
  const queueOptions: { value: QueueMode; label: string }[] = [
    { value: 'unheard_first', label: t('Nuevos primero') },
    { value: 'favorites', label: t('Favoritos') },
    { value: 'all', label: t('Todos') },
  ];
  const mixOptions: { value: MixMode; label: string }[] = [
    { value: 'mix', label: t('Mezclar con mi música') },
    { value: 'pause', label: t('Pausar mi música') },
  ];
  const insets = useSafeAreaInsets();
  const query = useTrainingMessages('all');
  const entries = useOfflineStore((s) => s.entries);
  const queueMode = useTrainingSettings((s) => s.queueMode);
  const setQueueMode = useTrainingSettings((s) => s.setQueueMode);
  const intervalMinutes = useTrainingSettings((s) => s.intervalMinutes);
  const setIntervalMinutes = useTrainingSettings((s) => s.setIntervalMinutes);
  const mixMode = useTrainingSettings((s) => s.mixMode);
  const setMixMode = useTrainingSettings((s) => s.setMixMode);
  const keepAwake = useTrainingSettings((s) => s.keepAwake);
  const setKeepAwake = useTrainingSettings((s) => s.setKeepAwake);
  const [starting, setStarting] = useState(false);

  const offline = query.isError && query.error instanceof AppError && (query.error.kind === 'network' || query.error.kind === 'timeout') && Object.keys(entries).length > 0;
  const messages = useMemo<TrainingMessage[]>(() => (offline ? offlineMessages(entries) : flattenMessages(query.data)), [offline, entries, query.data]);
  const count = buildQueueIds(messages, queueMode).length;

  const start = async () => {
    setStarting(true);
    let list = messages;
    if (!offline) {
      // Pull the rest of the inbox so the whole queue is available.
      let hasMore = query.hasNextPage;
      let data = query.data;
      let pages = data?.pages.length ?? 0;
      while (hasMore && pages < MAX_PAGES) {
        const result = await query.fetchNextPage();
        hasMore = result.hasNextPage;
        data = result.data;
        pages += 1;
      }
      list = flattenMessages(data);
    }
    setStarting(false);
    if (!startSession(list, queueMode, intervalMinutes)) {
      showToast(queueMode === 'favorites' ? t('Aún no tienes favoritos. Elige otra cola.') : t('Aún no tienes mensajes para entrenar.'), 'destructive');
      return;
    }
    haptics.success();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top, paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + 120, gap: spacing.lg }}>
        <TopBar title={t('Modo entrenamiento')} large />
        <AppText variant="body" tone="muted" style={{ marginTop: -spacing.md }}>
          {t('Tus mensajes suenan mientras entrenas, incluso con la pantalla bloqueada.')}
        </AppText>

        {query.isPending && !offline ? (
          <Skeleton height={120} radius={radius.lg} />
        ) : query.isError && !offline ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} message={t('No pudimos cargar tus mensajes.')} />
        ) : (
          <>
            {offline ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <CloudOff size={16} color={colors.muted} />
                <AppText variant="caption" tone="muted" style={{ flex: 1 }}>
                  {t('Sin conexión · entrenarás con tus mensajes descargados.')}
                </AppText>
              </View>
            ) : null}

            <Reveal style={{ gap: spacing.sm }}>
              <AppText variant="eyebrow" tone="subtle">
                {t('Cola de mensajes')}
              </AppText>
              <SegmentedControl options={queueOptions} value={queueMode} onChange={setQueueMode} />
              <AppText variant="caption" tone="muted">
                {count === 0 ? t('No hay mensajes en esta cola.') : tc('{count} mensaje en tu cola.|{count} mensajes en tu cola.', count)}
              </AppText>
            </Reveal>

            <Reveal delay={60} style={{ gap: spacing.sm }}>
              <AppText variant="eyebrow" tone="subtle">
                {t('Un mensaje cada')}
              </AppText>
              <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                {INTERVAL_OPTIONS.map((option) => (
                  <IntervalChip key={String(option)} value={option} selected={intervalMinutes === option} onPress={() => setIntervalMinutes(option)} />
                ))}
              </View>
              <AppText variant="caption" tone="muted">
                {intervalMinutes === null
                  ? t('Los mensajes suenan uno tras otro.')
                  : t(
                      'Suena uno al empezar y luego uno cada {minutes} minutos de entrenamiento. Con la pantalla bloqueada la sesión sigue activa en segundo plano (usa un poco más de batería).',
                      { minutes: intervalMinutes },
                    )}
              </AppText>
            </Reveal>

            <Reveal delay={110} style={{ gap: spacing.sm }}>
              <AppText variant="eyebrow" tone="subtle">
                {t('Tu música')}
              </AppText>
              <SegmentedControl options={mixOptions} value={mixMode} onChange={setMixMode} />
              <AppText variant="caption" tone="muted">
                {mixModeCaption(Platform.OS as Os, mixMode)}
              </AppText>
              <ListGroup>
                <ListRow
                  label={t('Mantener pantalla encendida')}
                  description={t('Para ver el reloj sin desbloquear')}
                  divider={false}
                  trailing={
                    <Switch
                      value={keepAwake}
                      onValueChange={setKeepAwake}
                      trackColor={{ false: colors.surfaceMuted, true: colors.gold }}
                      thumbColor={colors.white}
                      ios_backgroundColor={colors.surfaceMuted}
                      accessibilityLabel={t('Mantener pantalla encendida')}
                    />
                  }
                />
              </ListGroup>
            </Reveal>
          </>
        )}
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm,
          paddingBottom: insets.bottom + spacing.md,
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.hairline,
        }}>
        <AppButton label={t('Empezar entrenamiento')} variant="legacy" onPress={start} loading={starting} disabled={count === 0 || query.isPending} />
      </View>
    </View>
  );
}

function IntervalChip({ value, selected, onPress }: { value: IntervalMinutes; selected: boolean; onPress: () => void }) {
  const { t } = useI18n();
  const label = value === null ? t('Seguido') : `${value} min`;
  return (
    <PressableScale
      onPress={onPress}
      haptic="selection"
      scaleTo={0.94}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={value === null ? t('Mensajes seguidos') : t('Un mensaje cada {minutes} minutos', { minutes: value })}
      style={{
        flex: 1,
        height: 44,
        borderRadius: radius.md,
        borderCurve: 'continuous',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: selected ? colors.black : colors.card,
        borderWidth: 1,
        borderColor: selected ? colors.black : colors.border,
      }}>
      <AppText style={{ fontFamily: fontFamily.semibold, fontSize: 14, color: selected ? colors.gold : colors.foreground }} maxFontSizeMultiplier={1.3}>
        {label}
      </AppText>
    </PressableScale>
  );
}

function RunningSession() {
  const { t, tc } = useI18n();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const session = usePlayerStore((s) => s.session);
  const status = usePlayerStore((s) => s.status);
  const remaining = usePlayerStore((s) => remainingCount(s.queue));
  const message = useCurrentMessage();
  const audioPhase = usePlayerStore((s) => s.audioPhase);
  const backgroundActive = audioPhase === 'keepAlive' || audioPhase === 'message';
  const [now, setNow] = useState(() => Date.now());
  const [confirmEnd, setConfirmEnd] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);

  const elapsed = elapsedMs(session.clock, now);
  const paused = session.clock.pausedAt !== null;
  const waiting = !!session.schedule && !status.playing && !status.buffering;
  const countdown = session.schedule ? formatClock(msUntilNext(session.schedule, elapsed)) : null;

  let statusLine = t('Mensajes seguidos');
  if (paused) statusLine = t('En pausa');
  else if (session.exhausted) statusLine = t('Escuchaste todos tus mensajes');
  else if (status.playing) statusLine = t('Escuchando a tu equipo');
  else if (waiting && countdown) statusLine = t('Próximo mensaje en {time}', { time: countdown });
  else if (status.ended && remaining === 0) statusLine = t('Escuchaste todos tus mensajes');

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <LinearGradient colors={gradients.goldGlow} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 360 }} pointerEvents="none" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top, paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + 180, gap: spacing.lg }}>
        <TopBar title={t('Modo entrenamiento')} />

        <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(300)} style={{ alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.lg }}>
          <AppText variant="eyebrow">{paused ? t('Pausado') : t('Tiempo de entrenamiento')}</AppText>
          <AppText
            accessibilityRole="timer"
            accessibilityLabel={t('Tiempo de entrenamiento {time}', { time: formatClock(elapsed) })}
            maxFontSizeMultiplier={1.2}
            adjustsFontSizeToFit
            numberOfLines={1}
            style={{
              fontFamily: fontFamily.heading,
              fontSize: 88,
              lineHeight: 100,
              letterSpacing: -2,
              color: paused ? colors.subtle : colors.foreground,
              fontVariant: ['tabular-nums'],
            }}>
            {formatClock(elapsed)}
          </AppText>
          <AppText variant="bodyStrong" tone={status.playing ? 'accent' : 'muted'} accessibilityLiveRegion="polite">
            {statusLine}
          </AppText>
          {backgroundActive ? <ActiveSessionBadge /> : null}
        </Animated.View>

        {message ? (
          <PressableScale
            onPress={() => router.push(PLAYER_HREF)}
            scaleTo={0.98}
            accessibilityRole="button"
            accessibilityLabel={t('Mensaje actual de {name}. Abre el reproductor.', { name: message.sender_name })}
            style={{ backgroundColor: colors.card, borderRadius: radius.xl, borderCurve: 'continuous', borderWidth: 1, borderColor: status.playing ? colors.gold : colors.hairline, padding: spacing.lg, gap: spacing.md, ...shadows.card }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <SenderAvatar name={message.sender_name} icon={message.icon} size={56} highlight={status.playing} />
              <View style={{ flex: 1 }}>
                <AppText variant="subtitle" numberOfLines={1}>
                  {message.sender_name}
                </AppText>
                <AppText variant="caption" tone="subtle" numberOfLines={1}>
                  {[message.relationship, remaining > 0 ? tc('{count} más en la cola|{count} más en la cola', remaining) : t('Último de la cola')].filter(Boolean).join(' · ')}
                </AppText>
              </View>
              <PressableScale
                onPress={togglePlay}
                scaleTo={0.9}
                accessibilityRole="button"
                accessibilityLabel={status.playing ? t('Pausar mensaje') : t('Reproducir mensaje')}
                style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center' }}>
                {status.playing ? (
                  <Pause size={20} color={colors.gold} fill={colors.gold} strokeWidth={0} />
                ) : (
                  <Play size={20} color={colors.gold} fill={colors.gold} strokeWidth={0} style={{ marginLeft: 3 }} />
                )}
              </PressableScale>
            </View>
            {message.body ? (
              <AppText variant="body" numberOfLines={6} style={{ fontSize: 17, lineHeight: 26 }}>
                “{message.body}”
              </AppText>
            ) : null}
          </PressableScale>
        ) : null}
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingTop: spacing.sm,
          paddingBottom: insets.bottom + spacing.md,
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.hairline,
          gap: spacing.sm,
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xl, paddingHorizontal: spacing.lg }}>
          <RoundAction label={t('Terminar entrenamiento')} onPress={() => setConfirmEnd(true)}>
            <Square size={20} color={colors.destructive} fill={colors.destructive} strokeWidth={0} />
          </RoundAction>
          <PressableScale
            onPress={() => {
              haptics.light();
              if (paused) resumeSession();
              else pauseSession();
            }}
            scaleTo={0.92}
            accessibilityRole="button"
            accessibilityLabel={paused ? t('Reanudar entrenamiento') : t('Pausar entrenamiento')}
            style={{ borderRadius: 44, ...shadows.gold }}>
            <LinearGradient colors={gradients.gold} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' }}>
              {paused ? (
                <Play size={34} color={colors.onGold} fill={colors.onGold} strokeWidth={0} style={{ marginLeft: 5 }} />
              ) : (
                <Pause size={34} color={colors.onGold} fill={colors.onGold} strokeWidth={0} />
              )}
            </LinearGradient>
          </PressableScale>
          <RoundAction label={t('Siguiente mensaje')} onPress={nextTrack} disabled={remaining === 0}>
            <SkipForward size={22} color={colors.foreground} fill={colors.foreground} strokeWidth={0} />
          </RoundAction>
        </View>
      </View>

      <ConfirmDialog
        visible={confirmEnd}
        title={t('¿Terminar entrenamiento?')}
        description={t('Llevas {time}. Los mensajes dejarán de sonar.', { time: formatClock(elapsed) })}
        confirmLabel={t('Terminar')}
        onCancel={() => setConfirmEnd(false)}
        onConfirm={() => {
          setConfirmEnd(false);
          endSession();
          haptics.success();
          showToast(t('Entrenamiento de {time} terminado', { time: formatClock(elapsed) }), 'success');
        }}
      />
    </View>
  );
}

/** "Sesión activa": the workout keeps its audio session alive so messages arrive with the screen locked. */
function ActiveSessionBadge() {
  const { t } = useI18n();
  return (
    <View
      accessible
      accessibilityLabel={t('Sesión activa. Sigue funcionando con la pantalla bloqueada y usa un poco más de batería.')}
      style={{ alignItems: 'center', gap: 2, marginTop: spacing.xs }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          paddingHorizontal: spacing.sm,
          paddingVertical: 4,
          borderRadius: radius.pill,
          backgroundColor: colors.successWash,
        }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success }} />
        <AppText variant="caption" style={{ color: colors.success, fontFamily: fontFamily.semibold }}>
          {t('Sesión activa · puedes bloquear la pantalla')}
        </AppText>
      </View>
      <AppText variant="caption" tone="subtle">
        {t('Usa un poco más de batería mientras entrenas.')}
      </AppText>
    </View>
  );
}

function RoundAction({ label, onPress, disabled, children }: { label: string; onPress: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.9}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={{
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.35 : 1,
        ...shadows.soft,
      }}>
      {children}
    </PressableScale>
  );
}
