import { Image, type ImageSource } from 'expo-image';
import { useIsFocused } from 'expo-router';
import { useEvent, useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import type { PropsWithChildren, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { AppState, View, type DimensionValue } from 'react-native';

import { GradientOverlay } from './gradient-overlay';

import { useCanAutoplayVideo } from '@/hooks/use-can-autoplay-video';
import { colors } from '@/theme/tokens';

const ABSOLUTE_FILL = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;

interface CinematicHeroProps extends PropsWithChildren {
  videoUri?: string;
  /** A real photo to use when there's no video (or it can't play). */
  poster?: ImageSource | number;
  /** A composed decorative fallback (gradient/glow/logo) for when there's no photo asset yet either — never an empty rectangle (AGENTS.md §8). */
  fallback?: ReactNode;
  height?: DimensionValue;
  gradient?: 'bottom' | 'full';
  style?: object;
}

/**
 * Full-bleed hero media: video when it's safe to autoplay (Wi-Fi, reduced
 * motion off, screen focused), otherwise a static poster — never an empty
 * rectangle (AGENTS.md §8). Video pauses whenever the screen loses focus or
 * the app backgrounds, and never plays with sound.
 */
export function CinematicHero({ videoUri, poster, fallback, height = '52%', gradient = 'bottom', style, children }: CinematicHeroProps) {
  const canAutoplay = useCanAutoplayVideo();
  const isFocused = useIsFocused();
  const [appActive, setAppActive] = useState(true);
  const [videoFailed, setVideoFailed] = useState(false);

  const shouldLoadVideo = Boolean(videoUri) && canAutoplay && !videoFailed;

  const player = useVideoPlayer(shouldLoadVideo ? videoUri! : null, (instance) => {
    instance.loop = true;
    instance.muted = true;
  });

  const { status } = useEvent(player, 'statusChange', { status: player.status, error: undefined });

  useEventListener(player, 'statusChange', ({ status: nextStatus, error: nextError }) => {
    if (nextStatus === 'error' && nextError) setVideoFailed(true);
  });

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => setAppActive(state === 'active'));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!shouldLoadVideo) return;
    if (isFocused && appActive) {
      player.play();
    } else {
      player.pause();
    }
  }, [shouldLoadVideo, isFocused, appActive, player]);

  const showVideo = shouldLoadVideo && status === 'readyToPlay';

  return (
    <View style={[{ height, width: '100%', backgroundColor: colors.black, overflow: 'hidden' }, style]}>
      {showVideo ? (
        <VideoView
          player={player}
          style={ABSOLUTE_FILL}
          contentFit="cover"
          nativeControls={false}
          pointerEvents="none"
        />
      ) : poster ? (
        <Image source={poster} style={ABSOLUTE_FILL} contentFit="cover" transition={250} />
      ) : (
        <View style={ABSOLUTE_FILL}>{fallback}</View>
      )}
      <GradientOverlay variant={gradient} />
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}
