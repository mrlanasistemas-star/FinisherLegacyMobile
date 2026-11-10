/**
 * The story's voice message: one round play / pause control, a thin
 * scrubber and the elapsed / total time. The native player is created on
 * the first tap (through the training feature's lazy expo-audio driver, so
 * a binary without the audio module shows a calm note instead of
 * crashing) and released when the card leaves the screen.
 */

import { Mic, Pause, Play } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { PressableScale } from '@/components/motion/pressable-scale';
import { createPlayer, isAudioAvailable, type AudioPlayer } from '@/features/training/audio-driver';
import { GoldSlider } from '@/features/training/components/gold-slider';
import { useI18n } from '@/i18n';
import { colors, fontFamily, radius, shadows, spacing } from '@/theme/tokens';

import { formatDuration } from '../quota';

interface VoicePlayerProps {
  url: string | null;
  /** Length reported by the backend, shown before the file is loaded. */
  durationSeconds?: number | null;
  /** Still being processed server-side. */
  processing?: boolean;
  title?: string;
}

export function VoicePlayer({ url, durationSeconds = null, processing = false, title }: VoicePlayerProps) {
  const { t } = useI18n();
  const playerRef = useRef<AudioPlayer | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(durationSeconds ?? 0);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const available = isAudioAvailable();

  // A new file (or leaving the screen) always releases the native player.
  useEffect(() => {
    return () => {
      try {
        playerRef.current?.remove();
      } catch {
        // Already released.
      }
      playerRef.current = null;
      setReady(false);
    };
  }, [url]);

  function ensurePlayer(): AudioPlayer | null {
    if (playerRef.current) return playerRef.current;
    if (!url) return null;
    const player = createPlayer();
    if (!player) return null;
    player.addListener('playbackStatusUpdate', (status) => {
      setPlaying(status.playing);
      setLoading(!status.isLoaded || (status.isBuffering && !status.playing));
      if (Number.isFinite(status.duration) && status.duration > 0) setDuration(status.duration);
      if (Number.isFinite(status.currentTime)) setPosition(status.currentTime);
      if (status.didJustFinish) {
        setPlaying(false);
        setPosition(0);
        void player.seekTo(0).catch(() => {});
      }
    });
    try {
      player.replace({ uri: url });
    } catch {
      setFailed(true);
      return null;
    }
    playerRef.current = player;
    setReady(true);
    return player;
  }

  function toggle() {
    const player = ensurePlayer();
    if (!player) {
      setFailed(true);
      return;
    }
    try {
      if (playing) {
        player.pause();
      } else {
        setLoading(true);
        player.play();
      }
    } catch {
      setFailed(true);
    }
  }

  function seek(ratio: number) {
    const player = playerRef.current;
    if (!player || duration <= 0) return;
    setPosition(ratio * duration);
    void player.seekTo(ratio * duration).catch(() => {});
  }

  const disabled = processing || !url || !available || failed;
  const note = processing
    ? t('Procesando tu mensaje…')
    : !available
      ? t('Actualiza la app para escuchar este mensaje.')
      : failed
        ? t('No pudimos reproducir este mensaje.')
        : !url
          ? t('El audio no está disponible.')
          : null;
  const ratio = duration > 0 ? Math.min(1, position / duration) : 0;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.md,
        borderRadius: radius.lg,
        borderCurve: 'continuous',
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.hairline,
        ...shadows.soft,
      }}>
      <PressableScale
        onPress={toggle}
        disabled={disabled}
        scaleTo={0.92}
        haptic="selection"
        accessibilityRole="button"
        accessibilityLabel={playing ? t('Pausar mensaje de voz') : t('Reproducir mensaje de voz')}
        accessibilityState={{ disabled, busy: loading }}
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: disabled ? colors.surfaceMuted : colors.black,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {processing || (loading && !playing && !disabled) ? (
          <ActivityIndicator color={disabled ? colors.muted : colors.onDark} size="small" />
        ) : disabled ? (
          <Mic size={20} color={colors.muted} />
        ) : playing ? (
          <Pause size={20} color={colors.onDark} fill={colors.onDark} />
        ) : (
          <Play size={20} color={colors.onDark} fill={colors.onDark} style={{ marginLeft: 2 }} />
        )}
      </PressableScale>

      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm }}>
          <AppText variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
            {title ?? t('Mensaje de voz')}
          </AppText>
          {duration > 0 && !note ? (
            <AppText maxFontSizeMultiplier={1.3} style={{ fontFamily: fontFamily.medium, fontSize: 13, color: colors.subtle, fontVariant: ['tabular-nums'] }}>
              {position > 0 ? `${formatDuration(position)} / ${formatDuration(duration)}` : formatDuration(duration)}
            </AppText>
          ) : null}
        </View>
        {note ? (
          <AppText variant="caption" tone="subtle">
            {note}
          </AppText>
        ) : (
          <GoldSlider
            value={ratio}
            onCommit={seek}
            disabled={!ready || duration <= 0}
            accessibilityLabel={t('Posición del mensaje')}
            accessibilityValueText={t('{position} de {duration}', { position: formatDuration(position), duration: formatDuration(duration) })}
          />
        )}
      </View>
    </View>
  );
}
