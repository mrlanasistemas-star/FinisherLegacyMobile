import { router, type Href } from 'expo-router';
import { Pause, Play, SkipForward, X } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeInDown, FadeOutDown, useReducedMotion } from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import { PressableScale } from '@/components/motion/pressable-scale';
import { useI18n } from '@/i18n';
import { colors, radius, shadows, spacing } from '@/theme/tokens';

import { nextTrack, stop, togglePlay } from '../player-controller';
import { useCurrentMessage, usePlayerStore } from '../player-store';
import { hasNext } from '../queue';
import { SenderAvatar } from './message-visuals';

export const PLAYER_HREF = '/training/player' as Href;

/**
 * The persistent "now playing" bar: sits right above the tab bar (and at the
 * bottom of Entrenamientos) whenever a message is loaded and the full player
 * is closed. Tap opens the player; play/pause and next act in place; the X
 * appears while paused to dismiss it.
 */
export function MiniPlayer({ style }: { style?: StyleProp<ViewStyle> }) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();
  const message = useCurrentMessage();
  const sheetOpen = usePlayerStore((s) => s.sheetOpen);
  const status = usePlayerStore((s) => s.status);
  const canNext = usePlayerStore((s) => hasNext(s.queue));
  const sessionActive = usePlayerStore((s) => s.session.active);

  if (!message || sheetOpen) return null;
  const progress = status.duration > 0 ? Math.min(1, status.position / status.duration) : 0;
  const subtitle = sessionActive ? t('Modo entrenamiento') : (message.relationship ?? t('Envíame ánimo'));

  return (
    <Animated.View entering={reduceMotion ? undefined : FadeInDown.springify().damping(20)} exiting={reduceMotion ? undefined : FadeOutDown.duration(160)} style={style}>
      <PressableScale
        onPress={() => router.push(PLAYER_HREF)}
        scaleTo={0.98}
        accessibilityRole="button"
        accessibilityLabel={t('Reproduciendo mensaje de {name}', { name: message.sender_name })}
        accessibilityHint={t('Abre el reproductor')}
        style={{
          marginHorizontal: spacing.sm,
          marginBottom: spacing.xs,
          backgroundColor: colors.card,
          borderRadius: radius.lg,
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: colors.hairline,
          overflow: 'hidden',
          ...shadows.card,
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingLeft: spacing.sm, paddingRight: spacing.xxs, height: 60 }}>
          <SenderAvatar name={message.sender_name} icon={message.icon} size={38} highlight={status.playing} />
          <View style={{ flex: 1 }}>
            <AppText variant="bodyStrong" numberOfLines={1} style={{ fontSize: 15 }}>
              {message.sender_name}
            </AppText>
            <AppText variant="caption" tone="subtle" numberOfLines={1} style={{ fontSize: 12.5 }}>
              {status.error === 'unavailable' ? t('Actualiza la app para escuchar') : subtitle}
            </AppText>
          </View>
          <MiniButton label={status.playing ? t('Pausar') : t('Reproducir')} onPress={togglePlay}>
            {status.playing ? (
              <Pause size={22} color={colors.foreground} fill={colors.foreground} strokeWidth={0} />
            ) : (
              <Play size={22} color={colors.foreground} fill={colors.foreground} strokeWidth={0} style={{ marginLeft: 2 }} />
            )}
          </MiniButton>
          {status.playing || sessionActive ? (
            <MiniButton label={t('Siguiente mensaje')} onPress={nextTrack} disabled={!canNext}>
              <SkipForward size={20} color={colors.foreground} fill={colors.foreground} strokeWidth={0} />
            </MiniButton>
          ) : (
            <MiniButton label={t('Cerrar reproductor')} onPress={stop}>
              <X size={20} color={colors.muted} />
            </MiniButton>
          )}
        </View>
        <View style={{ height: 2, backgroundColor: colors.surfaceMuted }}>
          <View style={{ height: 2, width: `${progress * 100}%`, backgroundColor: colors.gold }} />
        </View>
      </PressableScale>
    </Animated.View>
  );
}

function MiniButton({ label, onPress, disabled, children }: { label: string; onPress: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.86}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.35 : 1 }}>
      {children}
    </PressableScale>
  );
}
