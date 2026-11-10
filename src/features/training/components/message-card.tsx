import { CloudCheck, EyeOff, Pause, Play, Star } from 'lucide-react-native';
import { memo, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import Swipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { Extrapolation, interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import { PressableScale } from '@/components/motion/pressable-scale';
import { isProcessing, type TrainingMessage } from '@/schemas/training';
import { colors, fontFamily, radius, shadows, spacing } from '@/theme/tokens';
import { relativeTime } from '@/utils/relative-time';

import { formatPlayerTime } from '../session-clock';
import { MiniWaveform, SenderAvatar } from './message-visuals';

/**
 * One message in the Entrenamientos inbox: initials avatar with the icon
 * badge, sender and relationship, text preview, a play pill with mini
 * waveform and duration, and its state (new / favorite / offline). Swipe
 * left for Favorito / Ocultar; long-press for the full menu.
 */

interface MessageCardProps {
  message: TrainingMessage;
  /** Loaded in the player. */
  current: boolean;
  playing: boolean;
  /** 0..1 progress when current. */
  progress: number;
  offline: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onToggleFavorite: () => void;
  onHide: () => void;
}

const ACTION_WIDTH = 78;

function MessageCardBase({ message, current, playing, progress, offline, onPress, onLongPress, onToggleFavorite, onHide }: MessageCardProps) {
  const unheard = !message.listened_at;
  const processing = isProcessing(message) && !offline;
  const hasAudio = !!message.audio_url || offline;
  const duration = message.duration_seconds;
  const label = [
    `Mensaje de ${message.sender_name}`,
    message.relationship,
    unheard ? 'sin escuchar' : null,
    message.favorite ? 'favorito' : null,
    processing ? 'audio procesándose' : hasAudio && duration ? `audio de ${Math.round(duration)} segundos` : 'mensaje de texto',
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Swipeable
      friction={1.6}
      rightThreshold={ACTION_WIDTH / 2}
      overshootRight={false}
      containerStyle={{ borderRadius: radius.lg, overflow: 'visible' }}
      renderRightActions={(progressValue, _translation, methods) => (
        <SwipeActions
          progress={progressValue}
          methods={methods}
          favorite={message.favorite}
          onToggleFavorite={onToggleFavorite}
          onHide={onHide}
        />
      )}>
      <PressableScale
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={350}
        scaleTo={0.985}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint="Toca para escuchar. Mantén presionado para más opciones."
        accessibilityActions={[{ name: 'longpress', label: 'Más opciones' }]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'longpress') onLongPress();
        }}
        style={{
          backgroundColor: colors.card,
          borderRadius: radius.lg,
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: current ? colors.gold : colors.hairline,
          padding: spacing.md,
          flexDirection: 'row',
          gap: spacing.sm,
          ...shadows.soft,
        }}>
        <SenderAvatar name={message.sender_name} icon={message.icon} size={48} highlight={unheard} />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong" numberOfLines={1}>
                {message.sender_name}
              </AppText>
              <AppText variant="caption" tone="subtle" numberOfLines={1}>
                {[message.relationship, relativeTime(message.created_at)].filter(Boolean).join(' · ')}
              </AppText>
            </View>
            {message.favorite ? <Star size={16} color={colors.gold} fill={colors.gold} /> : null}
            {unheard ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold }} /> : null}
          </View>

          {message.body ? (
            <AppText variant="caption" tone="muted" numberOfLines={2} style={{ fontSize: 14.5, lineHeight: 21 }}>
              {message.body}
            </AppText>
          ) : null}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 }}>
            {processing ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <ActivityIndicator size="small" color={colors.accent} />
                <AppText variant="caption" tone="accent" style={{ fontFamily: fontFamily.semibold }}>
                  Procesando audio…
                </AppText>
              </View>
            ) : hasAudio ? (
              <>
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: current ? colors.black : colors.goldWash,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  {current && playing ? (
                    <Pause size={13} color={colors.gold} fill={colors.gold} strokeWidth={0} />
                  ) : (
                    <Play size={13} color={current ? colors.gold : colors.accent} fill={current ? colors.gold : colors.accent} strokeWidth={0} style={{ marginLeft: 2 }} />
                  )}
                </View>
                <MiniWaveform seed={message.uuid} progress={current ? progress : 0} />
                <AppText variant="caption" tone="subtle" style={{ fontFamily: fontFamily.medium, fontVariant: ['tabular-nums'] }}>
                  {formatPlayerTime(duration)}
                </AppText>
              </>
            ) : (
              <AppText variant="label" tone="subtle">
                MENSAJE DE TEXTO
              </AppText>
            )}
            <View style={{ flex: 1 }} />
            {offline ? <CloudCheck size={16} color={colors.success} accessibilityLabel="Disponible sin conexión" /> : null}
          </View>
        </View>
      </PressableScale>
    </Swipeable>
  );
}

export const MessageCard = memo(MessageCardBase);

interface SwipeActionsProps {
  progress: SharedValue<number>;
  methods: SwipeableMethods;
  favorite: boolean;
  onToggleFavorite: () => void;
  onHide: () => void;
}

function SwipeActions({ progress, methods, favorite, onToggleFavorite, onHide }: SwipeActionsProps) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.6, 1], [0, 0.8, 1], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.85, 1], Extrapolation.CLAMP) }],
  }));
  return (
    <Animated.View style={[{ flexDirection: 'row', gap: spacing.xs, paddingLeft: spacing.xs }, style]}>
      <ActionButton
        label={favorite ? 'Quitar' : 'Favorito'}
        icon={<Star size={20} color={colors.onGold} fill={favorite ? 'transparent' : colors.onGold} />}
        background={colors.gold}
        color={colors.onGold}
        onPress={() => {
          methods.close();
          onToggleFavorite();
        }}
      />
      <ActionButton
        label="Ocultar"
        icon={<EyeOff size={20} color={colors.white} />}
        background={colors.destructive}
        color={colors.white}
        onPress={() => {
          methods.close();
          onHide();
        }}
      />
    </Animated.View>
  );
}

function ActionButton({ label, icon, background, color, onPress }: { label: string; icon: ReactNode; background: string; color: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: ACTION_WIDTH,
        borderRadius: radius.lg,
        borderCurve: 'continuous',
        backgroundColor: background,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        opacity: pressed ? 0.85 : 1,
      })}>
      {icon}
      <AppText style={{ fontFamily: fontFamily.semibold, fontSize: 12, color }}>{label}</AppText>
    </Pressable>
  );
}
