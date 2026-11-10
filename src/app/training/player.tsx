/**
 * Full-screen player of a training message, presented as a sheet over the
 * app (transparent modal) that slides up and is dismissed by dragging it
 * down. Animated artwork with gold progress ring and pulse, sender and text,
 * scrubber with elapsed / remaining time, prev / ±15 s / play / next, speed
 * chips (pitch-corrected), volume, repeat and shuffle, favorite, and a
 * retry hint when a stream fails even after the controller re-signed its
 * URL. The "listened" mark is automatic (80 % or the end) in the controller.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import {
  ChevronDown,
  Pause,
  Play,
  Repeat,
  Repeat1,
  RotateCcw,
  RotateCw,
  Shuffle,
  SkipBack,
  SkipForward,
  Smartphone,
  Star,
  Volume1,
  Volume2,
} from 'lucide-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import { BackHandler, ScrollView, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { EmptyState } from '@/components/empty-state';
import { PressableScale } from '@/components/motion/pressable-scale';
import { IconButton } from '@/components/ui/icon-button';
import { GoldSlider } from '@/features/training/components/gold-slider';
import { PlayerArtwork } from '@/features/training/components/player-artwork';
import {
  cycleRepeat,
  nextTrack,
  previousTrack,
  seekTo,
  setRate,
  setVolume,
  skipBy,
  togglePlay,
  toggleShuffle,
} from '@/features/training/player-controller';
import { setPlayerState, useCurrentMessage, usePlayerStore } from '@/features/training/player-store';
import { hasNext } from '@/features/training/queue';
import { formatPlayerTime } from '@/features/training/session-clock';
import { PLAYBACK_RATES, useTrainingSettings } from '@/features/training/settings-store';
import { useToggleFavorite } from '@/features/training/use-training';
import { showToast } from '@/stores/toastStore';
import { gradients } from '@/theme/gradients';
import { colors, fontFamily, radius, spacing } from '@/theme/tokens';

const DISMISS_DISTANCE = 140;
const TRAINING_HREF = '/training' as Href;

export default function TrainingPlayerScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const message = useCurrentMessage();
  const status = usePlayerStore((s) => s.status);
  const queue = usePlayerStore((s) => s.queue);
  const audioUnavailable = usePlayerStore((s) => s.audioUnavailable);
  const rate = useTrainingSettings((s) => s.rate);
  const volume = useTrainingSettings((s) => s.volume);
  const toggleFavorite = useToggleFavorite();
  const [scrub, setScrub] = useState<number | null>(null);

  const translateY = useSharedValue(reduceMotion ? 0 : height);
  const scrollOffset = useSharedValue(0);

  useEffect(() => {
    setPlayerState({ sheetOpen: true });
    translateY.value = reduceMotion ? 0 : withSpring(0, { damping: 26, stiffness: 240, mass: 0.9 });
    return () => setPlayerState({ sheetOpen: false });
  }, [translateY, reduceMotion]);

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace(TRAINING_HREF);
  };

  const animateClose = () => {
    if (reduceMotion) {
      close();
      return;
    }
    // eslint-disable-next-line react-hooks/immutability
    translateY.value = withTiming(height, { duration: 220 }, (finished) => {
      if (finished) runOnJS(close)();
    });
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      animateClose();
      return true;
    });
    return () => sub.remove();
  });

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollOffset.value = event.contentOffset.y;
  });

  const native = Gesture.Native();
  const pan = Gesture.Pan()
    .activeOffsetY(12)
    .failOffsetX([-24, 24])
    .simultaneousWithExternalGesture(native)
    .onUpdate((event) => {
      if (scrollOffset.value > 0 || event.translationY < 0) return;
      // eslint-disable-next-line react-hooks/immutability -- shared value written on the UI thread (worklet)
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      if (translateY.value > DISMISS_DISTANCE || (event.velocityY > 900 && translateY.value > 20)) {
        // eslint-disable-next-line react-hooks/immutability -- shared value written on the UI thread (worklet)
        translateY.value = withTiming(height, { duration: 200 }, (finished) => {
          if (finished) runOnJS(close)();
        });
      } else {
        translateY.value = withSpring(0, { damping: 24, stiffness: 260 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    borderRadius: interpolate(translateY.value, [0, 60], [0, radius.xl], Extrapolation.CLAMP),
  }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: interpolate(translateY.value, [0, height], [1, 0], Extrapolation.CLAMP) }));

  const duration = status.duration || message?.duration_seconds || 0;
  const position = scrub !== null ? scrub * duration : status.position;
  const progress = duration > 0 ? Math.min(1, position / duration) : 0;
  const hasAudio = !!message?.audio_url;
  const needsUpdate = hasAudio && (audioUnavailable || status.error === 'unavailable');
  const artSize = Math.min(width - spacing.xxl * 2, height * 0.36, 320);
  const index = queue.position + 1;
  const total = queue.order.length;

  return (
    <View style={{ flex: 1 }}>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.backdrop }, backdropStyle]} />
      <GestureDetector gesture={pan}>
        <Animated.View style={[{ flex: 1, backgroundColor: colors.background, overflow: 'hidden' }, sheetStyle]}>
          <LinearGradient colors={gradients.goldGlow} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: height * 0.5 }} pointerEvents="none" />

          <View style={{ paddingTop: insets.top + spacing.xxs, paddingHorizontal: spacing.sm }}>
            <View style={{ alignItems: 'center', paddingBottom: spacing.xxs }}>
              <View style={{ width: 38, height: 5, borderRadius: 3, backgroundColor: colors.border }} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <IconButton icon={ChevronDown} label="Cerrar reproductor" onPress={animateClose} size={26} />
              <View style={{ flex: 1, alignItems: 'center' }}>
                <AppText variant="eyebrow">{message?.link?.title ?? 'Envíame ánimo'}</AppText>
                {total > 1 ? (
                  <AppText variant="caption" tone="subtle" style={{ fontSize: 12 }}>
                    Mensaje {index} de {total}
                  </AppText>
                ) : null}
              </View>
              {message ? (
                <IconButton
                  icon={Star}
                  label={message.favorite ? 'Quitar de favoritos' : 'Marcar como favorito'}
                  color={message.favorite ? colors.gold : colors.foreground}
                  onPress={() =>
                    toggleFavorite.mutate(
                      { uuid: message.uuid, favorite: !message.favorite },
                      { onError: (e) => showToast(e.message, 'destructive') },
                    )
                  }
                />
              ) : (
                <View style={{ width: 44 }} />
              )}
            </View>
          </View>

          {!message ? (
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <EmptyState icon={Play} title="Nada en reproducción" message="Elige un mensaje de tu lista para escucharlo." actionLabel="Ver mis mensajes" onAction={() => router.replace(TRAINING_HREF)} />
            </View>
          ) : (
            <GestureDetector gesture={native}>
              <Animated.ScrollView
                onScroll={onScroll}
                scrollEventThrottle={16}
                bounces={false}
                overScrollMode="never"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.lg, gap: spacing.lg }}>
                <View style={{ alignItems: 'center', paddingTop: spacing.sm }}>
                  <PlayerArtwork name={message.sender_name} icon={message.icon} playing={status.playing} progress={progress} size={artSize} />
                </View>

                <View style={{ alignItems: 'center', gap: 2 }}>
                  <AppText variant="title" align="center" numberOfLines={2} accessibilityRole="header">
                    {message.sender_name}
                  </AppText>
                  {message.relationship ? (
                    <AppText variant="body" tone="accent" align="center" style={{ fontFamily: fontFamily.semibold }}>
                      {message.relationship}
                    </AppText>
                  ) : null}
                </View>

                {message.body ? (
                  <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.hairline, padding: spacing.md }}>
                    <ScrollView nestedScrollEnabled style={{ maxHeight: hasAudio ? 140 : 260 }} showsVerticalScrollIndicator={false}>
                      <AppText variant="body" style={{ fontSize: hasAudio ? 16 : 18, lineHeight: hasAudio ? 24 : 28 }}>
                        “{message.body}”
                      </AppText>
                    </ScrollView>
                  </View>
                ) : null}

                {needsUpdate ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.goldWash, borderRadius: radius.md, padding: spacing.md }}>
                    <Smartphone size={20} color={colors.accent} />
                    <AppText variant="caption" style={{ flex: 1 }}>
                      Actualiza la app para escuchar los audios. Mientras tanto puedes leer los mensajes.
                    </AppText>
                  </View>
                ) : hasAudio && status.error && !status.playing && !status.buffering ? (
                  <AppText variant="caption" tone="muted" accessibilityLiveRegion="polite" style={{ textAlign: 'center' }}>
                    No pudimos reproducir este audio. Revisa tu conexión y toca reproducir para reintentar.
                  </AppText>
                ) : null}

                <View style={{ gap: 2 }}>
                  <GoldSlider
                    value={progress}
                    onChange={(v) => setScrub(v)}
                    onCommit={(v) => {
                      setScrub(null);
                      seekTo(v * duration);
                    }}
                    disabled={needsUpdate || duration <= 0}
                    accessibilityLabel="Posición del mensaje"
                    accessibilityValueText={`${formatPlayerTime(position)} de ${formatPlayerTime(duration)}`}
                  />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <TimeLabel>{formatPlayerTime(position)}</TimeLabel>
                    <TimeLabel>{formatPlayerTime(Math.max(0, duration - position), true)}</TimeLabel>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <ControlButton label="Mensaje anterior" onPress={previousTrack}>
                    <SkipBack size={24} color={colors.foreground} fill={colors.foreground} strokeWidth={0} />
                  </ControlButton>
                  <ControlButton label="Retroceder 15 segundos" onPress={() => skipBy(-15)} disabled={needsUpdate}>
                    <SkipLabel icon={<RotateCcw size={30} color={colors.foreground} strokeWidth={1.6} />} />
                  </ControlButton>
                  <PressableScale
                    onPress={togglePlay}
                    disabled={needsUpdate}
                    haptic="light"
                    scaleTo={0.92}
                    accessibilityRole="button"
                    accessibilityLabel={status.playing ? 'Pausar' : 'Reproducir'}
                    style={{
                      width: 76,
                      height: 76,
                      borderRadius: 38,
                      backgroundColor: colors.black,
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: needsUpdate ? 0.4 : 1,
                      shadowColor: '#2B2418',
                      shadowOffset: { width: 0, height: 8 },
                      shadowOpacity: 0.22,
                      shadowRadius: 16,
                      elevation: 3,
                    }}>
                    {status.playing ? (
                      <Pause size={30} color={colors.gold} fill={colors.gold} strokeWidth={0} />
                    ) : (
                      <Play size={30} color={colors.gold} fill={colors.gold} strokeWidth={0} style={{ marginLeft: 4 }} />
                    )}
                  </PressableScale>
                  <ControlButton label="Adelantar 15 segundos" onPress={() => skipBy(15)} disabled={needsUpdate}>
                    <SkipLabel icon={<RotateCw size={30} color={colors.foreground} strokeWidth={1.6} />} />
                  </ControlButton>
                  <ControlButton label="Siguiente mensaje" onPress={nextTrack} disabled={!hasNext(queue)}>
                    <SkipForward size={24} color={colors.foreground} fill={colors.foreground} strokeWidth={0} />
                  </ControlButton>
                </View>

                <View style={{ gap: spacing.xs }}>
                  <AppText variant="eyebrow" tone="subtle" align="center">
                    Velocidad
                  </AppText>
                  <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.xs }}>
                    {PLAYBACK_RATES.map((value) => (
                      <SpeedChip key={value} value={value} selected={rate === value} onPress={() => setRate(value)} />
                    ))}
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Volume1 size={18} color={colors.subtle} />
                  <GoldSlider
                    value={volume}
                    onChange={setVolume}
                    onCommit={setVolume}
                    step={0.1}
                    style={{ flex: 1 }}
                    accessibilityLabel="Volumen"
                    accessibilityValueText={`${Math.round(volume * 100)} por ciento`}
                  />
                  <Volume2 size={18} color={colors.subtle} />
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <ToggleButton
                    label={queue.shuffle ? 'Aleatorio activado' : 'Aleatorio desactivado'}
                    active={queue.shuffle}
                    onPress={toggleShuffle}
                    caption="Aleatorio"
                    icon={<Shuffle size={20} color={queue.shuffle ? colors.accent : colors.muted} />}
                  />
                  <ToggleButton
                    label={queue.repeat === 'off' ? 'Repetir desactivado' : queue.repeat === 'all' ? 'Repetir todos' : 'Repetir este mensaje'}
                    active={queue.repeat !== 'off'}
                    onPress={cycleRepeat}
                    caption={queue.repeat === 'one' ? 'Repetir uno' : queue.repeat === 'all' ? 'Repetir todos' : 'Repetir'}
                    icon={queue.repeat === 'one' ? <Repeat1 size={20} color={colors.accent} /> : <Repeat size={20} color={queue.repeat === 'all' ? colors.accent : colors.muted} />}
                  />
                </View>
              </Animated.ScrollView>
            </GestureDetector>
          )}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

function TimeLabel({ children }: { children: ReactNode }) {
  return (
    <AppText variant="caption" tone="subtle" style={{ fontFamily: fontFamily.medium, fontSize: 12.5, fontVariant: ['tabular-nums'] }}>
      {children}
    </AppText>
  );
}

function SkipLabel({ icon }: { icon: ReactNode }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      {icon}
      <AppText style={{ position: 'absolute', fontFamily: fontFamily.bold, fontSize: 9.5, color: colors.foreground, marginTop: 2 }} maxFontSizeMultiplier={1}>
        15
      </AppText>
    </View>
  );
}

function ControlButton({ label, onPress, disabled, children }: { label: string; onPress: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.86}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={6}
      style={{ width: 52, height: 52, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.3 : 1 }}>
      {children}
    </PressableScale>
  );
}

function SpeedChip({ value, selected, onPress }: { value: number; selected: boolean; onPress: () => void }) {
  const label = `${String(value).replace('.', ',')}×`;
  return (
    <PressableScale
      onPress={onPress}
      haptic="selection"
      scaleTo={0.92}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`Velocidad ${label}`}
      hitSlop={{ top: 6, bottom: 6 }}
      style={{
        minWidth: 52,
        height: 32,
        paddingHorizontal: 10,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: selected ? colors.black : colors.card,
        borderWidth: 1,
        borderColor: selected ? colors.black : colors.border,
      }}>
      <AppText maxFontSizeMultiplier={1.2} style={{ fontFamily: fontFamily.semibold, fontSize: 13, color: selected ? colors.gold : colors.foreground, fontVariant: ['tabular-nums'] }}>
        {label}
      </AppText>
    </PressableScale>
  );
}

function ToggleButton({ label, caption, active, onPress, icon }: { label: string; caption: string; active: boolean; onPress: () => void; icon: ReactNode }) {
  return (
    <PressableScale
      onPress={onPress}
      haptic="selection"
      scaleTo={0.94}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        minHeight: 44,
        paddingHorizontal: spacing.md,
        borderRadius: 22,
        backgroundColor: active ? colors.goldWash : 'transparent',
      }}>
      {icon}
      <AppText variant="caption" style={{ fontFamily: fontFamily.semibold, color: active ? colors.accent : colors.muted }}>
        {caption}
      </AppText>
    </PressableScale>
  );
}
