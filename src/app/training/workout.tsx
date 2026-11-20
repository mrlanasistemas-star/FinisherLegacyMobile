/**
 * Entrenar — the live workout (Modo entrenamiento).
 *
 * Setup: pick the activity (the server's sports list), outdoor with GPS or
 * indoor (time only), and whether the cheer messages ride along.
 * Running: a big glanceable clock (timestamp-based: exact after the phone
 * slept), distance by GPS outdoors, pace or speed only once there is enough
 * real data, GPS + connection status, short encouragement at milestones,
 * the current cheer message, and pause / resume / finish.
 *
 * Everything is persisted on the phone first (features/training/workout)
 * and sent to the server now or when the connection returns.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack, type Href } from 'expo-router';
import { Headphones, MapPin, MapPinOff, Pause, Play, SkipForward, Square, Users } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, AppState, Linking, Platform, ScrollView, Switch, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { ErrorState } from '@/components/error-state';
import { PressableScale } from '@/components/motion/pressable-scale';
import { Reveal } from '@/components/motion/reveal';
import { Skeleton } from '@/components/skeleton';
import { Chip } from '@/components/ui/chip';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ListGroup, ListRow } from '@/components/ui/list-row';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Sheet } from '@/components/ui/sheet';
import { TopBar } from '@/components/ui/top-bar';
import { SenderAvatar } from '@/features/training/components/message-visuals';
import { offlineMessages, useOfflineStore } from '@/features/training/offline-cache';
import { nextTrack, startSession, togglePlay } from '@/features/training/player-controller';
import { useCurrentMessage, usePlayerStore } from '@/features/training/player-store';
import { buildQueueIds, type QueueMode } from '@/features/training/queue';
import { elapsedMs, formatClock, INTERVAL_OPTIONS } from '@/features/training/session-clock';
import { useTrainingSettings } from '@/features/training/settings-store';
import { flattenMessages, useTrainingMessages } from '@/features/training/use-training';
import { SUMMARY_HREF } from '@/features/training/workout/components/interrupted-workout-card';
import { SyncStatus } from '@/features/training/workout/components/sync-status';
import { kmLabel, NO_VALUE, rhythmLabel } from '@/features/training/workout/format';
import { milestoneLine, runningLine } from '@/features/training/workout/motivation';
import { useWorkoutSports } from '@/features/training/workout/use-workouts';
import {
  bootstrapWorkouts,
  discardLiveWorkout,
  enableFamilyFollow,
  finishLiveWorkout,
  pauseLiveWorkout,
  resumeLiveWorkout,
  sendHeartbeat,
  startLiveWorkout,
  WorkoutError,
} from '@/features/training/workout/workout-controller';
import { ensureWorkoutLocationPermission } from '@/features/training/workout/workout-gps';
import { crossedMilestone, formatKm, paceSecondsPerKm, recentPaceSecondsPerKm } from '@/features/training/workout/workout-math';
import { loadWorkoutPoints, useActiveWorkoutStore, type ActiveWorkout } from '@/features/training/workout/workout-storage';
import { getLocale, useI18n } from '@/i18n';
import { AppError } from '@/api/errors';
import type { TrainingMessage } from '@/schemas/training';
import type { WorkoutSport } from '@/schemas/workouts';
import { showToast } from '@/stores/toastStore';
import { gradients } from '@/theme/gradients';
import { colors, fontFamily, radius, shadows, spacing } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';

const HEARTBEAT_MS = 60_000;
const KEEP_AWAKE_TAG = 'fl-live-workout';

export default function WorkoutScreen() {
  const workout = useActiveWorkoutStore((s) => s.workout);
  const hydrated = useActiveWorkoutStore((s) => s.hydrated);

  useEffect(() => {
    bootstrapWorkouts().catch(() => {});
  }, []);

  return (
    <>
      <Stack.Screen options={{ gestureEnabled: !workout }} />
      {!hydrated ? <View style={{ flex: 1, backgroundColor: colors.background }} /> : workout ? <RunningWorkout workout={workout} /> : <WorkoutSetup />}
    </>
  );
}

// ─── Setup ──────────────────────────────────────────────────────────────────

function WorkoutSetup() {
  const { t, tc } = useI18n();
  const insets = useSafeAreaInsets();
  const sports = useWorkoutSports();
  const [sportId, setSportId] = useState<number | null>(null);
  const [outdoor, setOutdoor] = useState<boolean | null>(null);
  const [withCheers, setWithCheers] = useState(true);
  const [starting, setStarting] = useState(false);
  const [noPermission, setNoPermission] = useState(false);

  const messagesQuery = useTrainingMessages('all');
  const entries = useOfflineStore((s) => s.entries);
  const queueMode = useTrainingSettings((s) => s.queueMode);
  const setQueueMode = useTrainingSettings((s) => s.setQueueMode);
  const intervalMinutes = useTrainingSettings((s) => s.intervalMinutes);
  const setIntervalMinutes = useTrainingSettings((s) => s.setIntervalMinutes);

  const offlineMessagesMode = messagesQuery.isError && messagesQuery.error instanceof AppError && (messagesQuery.error.kind === 'network' || messagesQuery.error.kind === 'timeout');
  const messages = useMemo<TrainingMessage[]>(() => (offlineMessagesMode ? offlineMessages(entries) : flattenMessages(messagesQuery.data)), [offlineMessagesMode, entries, messagesQuery.data]);
  const queueCount = buildQueueIds(messages, queueMode).length;

  const list = sports.data ?? [];
  const sport: WorkoutSport | null = list.find((s) => s.id === sportId) ?? list[0] ?? null;
  const usesGps = outdoor ?? sport?.gps_default ?? false;

  const queueOptions: { value: QueueMode; label: string }[] = [
    { value: 'unheard_first', label: t('Nuevos primero') },
    { value: 'favorites', label: t('Favoritos') },
    { value: 'all', label: t('Todos||filtro: todos los mensajes') },
  ];

  const begin = async (gps: boolean) => {
    if (!sport) return;
    setStarting(true);
    try {
      if (gps && !(await ensureWorkoutLocationPermission())) {
        setNoPermission(true);
        return;
      }
      await startLiveWorkout({ id: sport.id, name: sport.name, slug: sport.slug, metric: sport.metric }, gps);
      if (withCheers && queueCount > 0) startSession(messages, queueMode, intervalMinutes);
      haptics.success();
    } catch (error) {
      showToast(error instanceof WorkoutError && error.reason === 'already_active' ? t('Ya tienes un entrenamiento en curso.') : t('No pudimos empezar el entrenamiento. Intenta de nuevo.'), 'destructive');
    } finally {
      setStarting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top, paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + 140, gap: spacing.lg }}>
        <TopBar title={t('Entrenar')} large />
        <AppText variant="body" tone="muted" style={{ marginTop: -spacing.md }}>
          {t('Un entrenamiento en vivo: el cronómetro corre y, al aire libre, el GPS mide tu distancia.')}
        </AppText>

        <Reveal style={{ gap: spacing.sm }}>
          <AppText variant="eyebrow" tone="subtle">
            {t('Actividad')}
          </AppText>
          {sports.isPending ? (
            <Skeleton height={44} radius={radius.pill} />
          ) : sports.isError ? (
            <ErrorState error={sports.error} onRetry={() => sports.refetch()} message={t('No pudimos cargar las actividades.')} />
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
              {list.map((item) => (
                <Chip
                  key={item.id}
                  label={item.name}
                  selected={item.id === sport?.id}
                  onPress={() => {
                    setSportId(item.id);
                    setOutdoor(null);
                  }}
                />
              ))}
            </View>
          )}
        </Reveal>

        <Reveal delay={60} style={{ gap: spacing.sm }}>
          <AppText variant="eyebrow" tone="subtle">
            {t('Dónde entrenas')}
          </AppText>
          <SegmentedControl
            options={[
              { value: 'out', label: t('Al aire libre · GPS') },
              { value: 'in', label: t('Bajo techo · solo tiempo') },
            ]}
            value={usesGps ? 'out' : 'in'}
            onChange={(value) => setOutdoor(value === 'out')}
          />
          <AppText variant="caption" tone="muted">
            {usesGps
              ? Platform.OS === 'ios'
                ? t('Usamos tu ubicación solo durante este entrenamiento para medir la distancia. Sigue midiendo con la pantalla bloqueada (verás el indicador azul) y usa más batería.')
                : t('Usamos tu ubicación solo durante este entrenamiento para medir la distancia. Verás una notificación fija mientras mide, también con la pantalla bloqueada. Usa más batería.')
              : t('Solo cronómetro: sin ubicación, sin distancia ni ritmo.')}
          </AppText>
        </Reveal>

        <Reveal delay={110} style={{ gap: spacing.sm }}>
          <AppText variant="eyebrow" tone="subtle">
            {t('Ánimos de tu equipo')}
          </AppText>
          <ListGroup>
            <ListRow
              icon={Headphones}
              label={t('Escuchar mis mensajes de ánimo')}
              description={queueCount > 0 ? tc('{count} mensaje en tu cola|{count} mensajes en tu cola', queueCount) : t('Aún no tienes mensajes en esta cola')}
              divider={false}
              trailing={
                <Switch
                  value={withCheers && queueCount > 0}
                  disabled={queueCount === 0}
                  onValueChange={setWithCheers}
                  trackColor={{ false: colors.surfaceMuted, true: colors.gold }}
                  thumbColor={colors.white}
                  ios_backgroundColor={colors.surfaceMuted}
                  accessibilityLabel={t('Escuchar mis mensajes de ánimo')}
                />
              }
            />
          </ListGroup>
          {withCheers && queueCount > 0 ? (
            <>
              <SegmentedControl options={queueOptions} value={queueMode} onChange={setQueueMode} />
              <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                {INTERVAL_OPTIONS.map((option) => (
                  <Chip
                    key={String(option)}
                    label={option === null ? t('Seguido||mensajes uno tras otro, sin pausa') : t('Cada {minutes} min', { minutes: option })}
                    selected={intervalMinutes === option}
                    onPress={() => setIntervalMinutes(option)}
                  />
                ))}
              </View>
            </>
          ) : null}
        </Reveal>
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
        <AppButton label={t('Empezar')} variant="legacy" onPress={() => begin(usesGps)} loading={starting} disabled={!sport || starting} />
      </View>

      <ConfirmDialog
        visible={noPermission}
        title={t('Sin permiso de ubicación')}
        description={t('Sin ubicación no podemos medir tu distancia. Puedes permitirla en Ajustes o entrenar solo con el cronómetro.')}
        confirmLabel={t('Entrenar solo con tiempo')}
        onCancel={() => {
          setNoPermission(false);
          Linking.openSettings().catch(() => {});
        }}
        onConfirm={() => {
          setNoPermission(false);
          begin(false).catch(() => {});
        }}
      />
    </View>
  );
}

// ─── Running ────────────────────────────────────────────────────────────────

function RunningWorkout({ workout }: { workout: ActiveWorkout }) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const keepAwake = useTrainingSettings((s) => s.keepAwake);
  const [now, setNow] = useState(() => Date.now());
  const [endSheet, setEndSheet] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [recentPace, setRecentPace] = useState<number | null>(null);
  const [cheer, setCheer] = useState<string | null>(null);
  const previous = useRef({ distanceM: workout.distanceM, elapsedMs: elapsedMs(workout.clock, now) });

  const paused = workout.clock.pausedAt !== null;
  const elapsed = elapsedMs(workout.clock, now);
  const seconds = Math.round(elapsed / 1000);
  const movingS = Math.round(workout.movingMs / 1000);
  const avgPace = workout.usesGps ? paceSecondsPerKm(workout.distanceM, movingS > 0 ? movingS : seconds) : null;
  const avgSpeed = workout.usesGps && avgPace ? workout.distanceM / (movingS > 0 ? movingS : seconds) : null;
  const metric = workout.sport.metric;

  // Clock tick (timestamps, so a suspended JS thread loses nothing).
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(Date.now());
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, []);

  // Heartbeat: keeps the server's copy current and the workout from being auto-closed.
  useEffect(() => {
    sendHeartbeat().catch(() => {});
    const timer = setInterval(() => sendHeartbeat().catch(() => {}), HEARTBEAT_MS);
    return () => clearInterval(timer);
  }, []);

  // Live pace from the last ~400 m of real fixes.
  useEffect(() => {
    if (!workout.usesGps || metric !== 'pace') return;
    loadWorkoutPoints()
      .then((points) => setRecentPace(recentPaceSecondsPerKm(points.slice(-200))))
      .catch(() => {});
  }, [workout.usesGps, workout.pointsCount, metric]);

  // Milestones: a short line + haptic each km (GPS) or 10 min (indoor).
  useEffect(() => {
    const next = { distanceM: workout.distanceM, elapsedMs: elapsed };
    const milestone = crossedMilestone(previous.current, next, { usesGps: workout.usesGps, sportSlug: workout.sport.slug });
    previous.current = next;
    if (milestone && !paused) {
      haptics.success();
      setCheer(milestoneLine(milestone));
      const timer = setTimeout(() => setCheer(null), 8000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [workout.distanceM, elapsed, workout.usesGps, workout.sport.slug, paused]);

  // Optional keep-awake (Ajustes de audio → "Mantener pantalla encendida").
  useEffect(() => {
    if (!keepAwake || paused) return;
    let mod: typeof import('expo-keep-awake') | null = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      mod = require('expo-keep-awake') as typeof import('expo-keep-awake');
      mod.activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    } catch {
      mod = null;
    }
    return () => {
      mod?.deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
    };
  }, [keepAwake, paused]);

  const finish = async () => {
    setFinishing(true);
    try {
      await finishLiveWorkout();
      haptics.success();
      setEndSheet(false);
      router.replace(SUMMARY_HREF);
    } catch {
      showToast(t('No pudimos terminar el entrenamiento. Intenta de nuevo.'), 'destructive');
    } finally {
      setFinishing(false);
    }
  };

  const gps = gpsStatus(workout, now, t);
  const rhythmNow = metric === 'pace' ? rhythmLabel('pace', recentPace, null) : rhythmLabel('speed', null, avgSpeed);
  const rhythmAvg = rhythmLabel(metric, avgPace, avgSpeed);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <LinearGradient colors={gradients.goldGlow} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 360 }} pointerEvents="none" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top, paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + 180, gap: spacing.lg }}>
        <TopBar title={workout.sport.name} onBack={() => (router.canGoBack() ? router.back() : router.replace('/training' as Href))} />

        <View style={{ alignItems: 'center', gap: spacing.xs }}>
          <SyncStatus compact />
          {gps ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }} accessible accessibilityLabel={gps.label}>
              {gps.ok ? <MapPin size={14} color={colors.success} /> : <MapPinOff size={14} color={colors.muted} />}
              <AppText variant="caption" tone={gps.ok ? 'success' : 'muted'}>
                {gps.label}
              </AppText>
            </View>
          ) : null}
        </View>

        <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(300)} style={{ alignItems: 'center', gap: spacing.xs, paddingTop: spacing.md }}>
          <AppText variant="eyebrow">{paused ? t('En pausa') : t('Tiempo')}</AppText>
          <AppText
            accessibilityRole="timer"
            accessibilityLabel={t('Tiempo de entrenamiento {time}', { time: formatClock(elapsed) })}
            maxFontSizeMultiplier={1.2}
            adjustsFontSizeToFit
            numberOfLines={1}
            style={{ fontFamily: fontFamily.heading, fontSize: 84, lineHeight: 96, letterSpacing: -2, color: paused ? colors.subtle : colors.foreground, fontVariant: ['tabular-nums'] }}>
            {formatClock(elapsed)}
          </AppText>
          <AppText variant="bodyStrong" tone={cheer ? 'accent' : 'muted'} align="center" accessibilityLiveRegion="polite">
            {paused ? t('Toca reanudar cuando estés listo.') : (cheer ?? runningLine(Math.floor(seconds / 60)))}
          </AppText>
        </Animated.View>

        {workout.usesGps ? (
          <View style={{ flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.hairline, paddingVertical: spacing.md, ...shadows.soft }}>
            <Metric label={t('Distancia')} value={workout.distanceM > 0 ? formatKm(workout.distanceM, getLocale()) : '0'} unit="km" />
            <Divider />
            <Metric label={metric === 'pace' ? t('Ritmo actual') : t('Velocidad')} value={rhythmNow ?? NO_VALUE} />
            <Divider />
            <Metric label={metric === 'pace' ? t('Ritmo promedio') : t('Promedio')} value={rhythmAvg ?? NO_VALUE} />
          </View>
        ) : (
          <AppText variant="caption" tone="subtle" align="center">
            {t('Bajo techo: registramos solo el tiempo.')}
          </AppText>
        )}
        {workout.usesGps && !rhythmAvg ? (
          <AppText variant="caption" tone="subtle" align="center" style={{ marginTop: -spacing.sm }}>
            {t('El ritmo aparece cuando hay suficientes datos de GPS.')}
          </AppText>
        ) : null}

        <CheersCard />

        {workout.usesGps && workout.gpsMode !== 'denied' ? <FamilyFollowRow workout={workout} /> : null}
      </ScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: spacing.sm, paddingBottom: insets.bottom + spacing.md, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.hairline }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xl }}>
          <RoundAction label={t('Terminar entrenamiento')} onPress={() => setEndSheet(true)}>
            <Square size={20} color={colors.destructive} fill={colors.destructive} strokeWidth={0} />
          </RoundAction>
          <PressableScale
            onPress={() => {
              haptics.light();
              (paused ? resumeLiveWorkout() : pauseLiveWorkout()).catch(() => {});
            }}
            scaleTo={0.92}
            accessibilityRole="button"
            accessibilityLabel={paused ? t('Reanudar entrenamiento') : t('Pausar entrenamiento')}
            style={{ borderRadius: 44, ...shadows.gold }}>
            <LinearGradient colors={gradients.gold} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' }}>
              {paused ? <Play size={34} color={colors.onGold} fill={colors.onGold} strokeWidth={0} style={{ marginLeft: 5 }} /> : <Pause size={34} color={colors.onGold} fill={colors.onGold} strokeWidth={0} />}
            </LinearGradient>
          </PressableScale>
          <View style={{ width: 56 }} />
        </View>
      </View>

      <Sheet visible={endSheet} onClose={() => setEndSheet(false)}>
        <View style={{ gap: spacing.md }}>
          <AppText variant="subtitle">{t('¿Terminar entrenamiento?')}</AppText>
          <AppText variant="body" tone="muted">
            {workout.usesGps && workout.distanceM > 0
              ? t('Llevas {time} y {distance}.', { time: formatClock(elapsed), distance: kmLabel(workout.distanceM) })
              : t('Llevas {time}.', { time: formatClock(elapsed) })}
          </AppText>
          {seconds < 60 ? (
            <AppText variant="caption" tone="subtle">
              {t('Es un entrenamiento muy corto. Si fue por error, descártalo.')}
            </AppText>
          ) : null}
          <AppButton label={t('Guardar entrenamiento')} onPress={finish} loading={finishing} />
          <AppButton label={t('Seguir entrenando')} variant="secondary" onPress={() => setEndSheet(false)} disabled={finishing} />
          <AppButton label={t('Descartar')} variant="ghost" onPress={() => setConfirmDiscard(true)} disabled={finishing} />
        </View>
      </Sheet>

      <ConfirmDialog
        visible={confirmDiscard}
        title={t('¿Descartar este entrenamiento?')}
        description={t('No se guardará nada de este entrenamiento.')}
        confirmLabel={t('Descartar')}
        destructive
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={async () => {
          setConfirmDiscard(false);
          setEndSheet(false);
          await discardLiveWorkout().catch(() => {});
          showToast(t('Entrenamiento descartado'));
          router.replace('/training' as Href);
        }}
      />
    </View>
  );
}

function gpsStatus(workout: ActiveWorkout, now: number, t: (s: string, p?: Record<string, string | number>) => string): { ok: boolean; label: string } | null {
  if (!workout.usesGps) return null;
  if (workout.gpsMode === 'denied') return { ok: false, label: t('GPS no disponible · solo tiempo') };
  if (workout.clock.pausedAt !== null) return { ok: false, label: t('GPS en pausa') };
  if (!workout.lastFixAt || now - workout.lastFixAt > 30_000) return { ok: false, label: t('Buscando señal GPS…') };
  if (workout.gpsMode === 'foreground') return { ok: true, label: t('GPS activo · solo con la app abierta') };
  return { ok: true, label: t('GPS activo') };
}

/**
 * "Compartir con mi familia" — optional, never automatic. Opens the
 * workout's live session and goes to "Quién ve mi ubicación", where the
 * athlete picks who and for how long. Sharing ends with the workout.
 */
function FamilyFollowRow({ workout }: { workout: ActiveWorkout }) {
  const { t } = useI18n();
  const [opening, setOpening] = useState(false);
  const shared = !!workout.trackingSessionUuid;

  const open = async () => {
    setOpening(true);
    try {
      const session = await enableFamilyFollow();
      router.push(`/family/sharing?session=${encodeURIComponent(session)}` as Href);
    } catch (error) {
      const reason = error instanceof WorkoutError ? error.reason : null;
      showToast(
        reason === 'race_tracking_active'
          ? t('Ya estás compartiendo una carrera en vivo. Detén ese seguimiento para compartir este entrenamiento.')
          : reason === 'not_synced'
            ? t('Necesitamos conexión para compartir tu ubicación. Intenta en cuanto tengas señal.')
            : error instanceof Error && error.message
              ? error.message
              : t('No pudimos compartir tu ubicación. Intenta de nuevo.'),
        'destructive',
      );
    } finally {
      setOpening(false);
    }
  };

  return (
    <ListGroup footer={shared ? t('Tu ubicación deja de compartirse en cuanto termines el entrenamiento.') : t('Opcional. Tú eliges quién te ve y por cuánto tiempo; termina con tu entrenamiento.')}>
      <ListRow
        icon={Users}
        label={shared ? t('Quién ve mi ubicación') : t('Compartir con mi familia')}
        description={shared ? t('Tu familia puede seguir este entrenamiento') : t('Que te sigan en el mapa mientras entrenas')}
        onPress={open}
        loading={opening}
        divider={false}
      />
    </ListGroup>
  );
}

/** The cheer messages riding along the workout (same player as Mensajes de ánimo). */
function CheersCard() {
  const { t } = useI18n();
  const sessionActive = usePlayerStore((s) => s.session.active);
  const status = usePlayerStore((s) => s.status);
  const message = useCurrentMessage();
  const messagesQuery = useTrainingMessages('all');
  const queueMode = useTrainingSettings((s) => s.queueMode);
  const intervalMinutes = useTrainingSettings((s) => s.intervalMinutes);
  const entries = useOfflineStore((s) => s.entries);

  if (!sessionActive) {
    const offline = messagesQuery.isError;
    const list = offline ? offlineMessages(entries) : flattenMessages(messagesQuery.data);
    if (messagesQuery.isPending && !offline) return <ActivityIndicator color={colors.accent} />;
    if (buildQueueIds(list, queueMode).length === 0) return null;
    return (
      <AppButton
        label={t('Escuchar mis mensajes de ánimo')}
        variant="secondary"
        icon={Headphones}
        onPress={() => {
          if (startSession(list, queueMode, intervalMinutes)) haptics.light();
        }}
      />
    );
  }

  if (!message) {
    return (
      <AppText variant="caption" tone="muted" align="center">
        {t('Tus mensajes de ánimo sonarán durante el entrenamiento.')}
      </AppText>
    );
  }

  return (
    <View style={{ backgroundColor: colors.card, borderRadius: radius.xl, borderWidth: 1, borderColor: status.playing ? colors.gold : colors.hairline, padding: spacing.md, gap: spacing.sm, ...shadows.card }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <SenderAvatar name={message.sender_name} icon={message.icon} size={48} highlight={status.playing} />
        <View style={{ flex: 1 }}>
          <AppText variant="eyebrow" tone="subtle">
            {status.playing ? t('Escuchando a tu equipo') : t('Mensaje de ánimo')}
          </AppText>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {message.sender_name}
          </AppText>
        </View>
        <RoundAction label={status.playing ? t('Pausar mensaje') : t('Reproducir mensaje')} onPress={togglePlay} size={44}>
          {status.playing ? <Pause size={18} color={colors.foreground} fill={colors.foreground} strokeWidth={0} /> : <Play size={18} color={colors.foreground} fill={colors.foreground} strokeWidth={0} style={{ marginLeft: 2 }} />}
        </RoundAction>
        <RoundAction label={t('Siguiente mensaje')} onPress={nextTrack} size={44}>
          <SkipForward size={18} color={colors.foreground} fill={colors.foreground} strokeWidth={0} />
        </RoundAction>
      </View>
      {message.body ? (
        <AppText variant="body" numberOfLines={3}>
          “{message.body}”
        </AppText>
      ) : null}
    </View>
  );
}

function Metric({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: spacing.xs }} accessible accessibilityLabel={`${label}: ${value}${unit ? ` ${unit}` : ''}`}>
      <AppText style={{ fontFamily: fontFamily.heading, fontSize: 24, color: colors.foreground, fontVariant: ['tabular-nums'] }} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.3}>
        {value}
        {unit ? <AppText style={{ fontFamily: fontFamily.semibold, fontSize: 13, color: colors.muted }}>{` ${unit}`}</AppText> : null}
      </AppText>
      <AppText variant="caption" tone="subtle" numberOfLines={1} style={{ fontSize: 12 }}>
        {label}
      </AppText>
    </View>
  );
}

function Divider() {
  return <View style={{ width: 1, alignSelf: 'stretch', backgroundColor: colors.hairline }} />;
}

function RoundAction({ label, onPress, children, size = 56 }: { label: string; onPress: () => void; children: ReactNode; size?: number }) {
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.9}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', ...shadows.soft }}>
      {children}
    </PressableScale>
  );
}
