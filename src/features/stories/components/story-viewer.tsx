/**
 * Full-screen viewer of a story's photos and videos. Swipe sideways to
 * move between them; pinch (or double-tap) a photo to zoom up to 4× and
 * drag it around while zoomed; drag a photo down to close. Everything
 * runs on the UI thread (Gesture Handler + Reanimated). Paging is locked
 * while a photo is zoomed so panning it never flips the page. Videos play
 * with the native controls and pause when they leave the screen.
 *
 * Mount it only while open (the parent remounts it with a new `key` per
 * opening, so it always starts on the tapped item).
 */

import { useEvent } from 'expo';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Trash2, X } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Modal, Pressable, useWindowDimensions, View, type ViewToken } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { interpolate, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import type { StoryMedia } from '@/schemas/story';
import { colors, fontFamily, spacing, springs } from '@/theme/tokens';

const MAX_SCALE = 4;
const DISMISS_DISTANCE = 120;

interface SlideProps {
  item: StoryMedia;
  active: boolean;
  width: number;
  height: number;
}

interface PhotoSlideProps extends SlideProps {
  /** 0 → 1 while the photo is dragged down to close. */
  dismiss: SharedValue<number>;
  onZoomChange: (zoomed: boolean) => void;
  onClose: () => void;
  onToggleChrome: () => void;
}

function PhotoSlide({ item, active, width, height, dismiss, onZoomChange, onClose, onToggleChrome }: PhotoSlideProps) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);
  const zoomed = useSharedValue(false);

  // Leaving the page resets it, so coming back never finds a half-zoomed photo.
  useEffect(() => {
    if (active) return;
    scale.set(withTiming(1));
    savedScale.set(1);
    tx.set(withTiming(0));
    ty.set(withTiming(0));
    savedTx.set(0);
    savedTy.set(0);
    zoomed.set(false);
  }, [active, scale, savedScale, tx, ty, savedTx, savedTy, zoomed]);

  function setZoomed(next: boolean) {
    'worklet';
    if (zoomed.get() === next) return;
    zoomed.set(next);
    runOnJS(onZoomChange)(next);
  }

  function clampOffsets(nextScale: number) {
    'worklet';
    const maxX = (width * (nextScale - 1)) / 2;
    const maxY = (height * (nextScale - 1)) / 2;
    return {
      x: Math.min(maxX, Math.max(-maxX, tx.get())),
      y: Math.min(maxY, Math.max(-maxY, ty.get())),
    };
  }

  function settle() {
    'worklet';
    const next = Math.min(MAX_SCALE, Math.max(1, scale.get()));
    if (next <= 1.02) {
      scale.set(withSpring(1, springs.gentle));
      tx.set(withSpring(0, springs.gentle));
      ty.set(withSpring(0, springs.gentle));
      savedScale.set(1);
      savedTx.set(0);
      savedTy.set(0);
      setZoomed(false);
      return;
    }
    const bounded = clampOffsets(next);
    scale.set(withSpring(next, springs.gentle));
    tx.set(withSpring(bounded.x, springs.gentle));
    ty.set(withSpring(bounded.y, springs.gentle));
    savedScale.set(next);
    savedTx.set(bounded.x);
    savedTy.set(bounded.y);
    setZoomed(true);
  }

  const pinch = Gesture.Pinch()
    .onStart(() => {
      setZoomed(true);
    })
    .onUpdate((event) => {
      // Rubber-band a little past the limits; `settle` brings it back.
      scale.set(Math.min(MAX_SCALE * 1.25, Math.max(0.8, savedScale.get() * event.scale)));
    })
    .onEnd(settle);

  // Move the photo around — only while zoomed, so horizontal swipes page otherwise.
  const panZoomed = Gesture.Pan()
    .manualActivation(true)
    .onTouchesMove((_event, state) => {
      if (zoomed.get()) state.activate();
      else state.fail();
    })
    .onUpdate((event) => {
      tx.set(savedTx.get() + event.translationX);
      ty.set(savedTy.get() + event.translationY);
    })
    .onEnd(settle);

  // Drag down to close — only at rest, and only for a clearly vertical drag.
  const panDismiss = Gesture.Pan()
    .activeOffsetY(14)
    .failOffsetX([-14, 14])
    .failOffsetY(-14)
    .onUpdate((event) => {
      if (zoomed.get()) return;
      ty.set(Math.max(0, event.translationY));
      dismiss.set(Math.min(1, Math.max(0, event.translationY) / (DISMISS_DISTANCE * 2.5)));
    })
    .onEnd((event) => {
      if (zoomed.get()) return;
      if (event.translationY > DISMISS_DISTANCE || event.velocityY > 900) {
        runOnJS(onClose)();
        return;
      }
      ty.set(withSpring(0, springs.snappy));
      dismiss.set(withTiming(0, { duration: 160 }));
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDelay(220)
    .onEnd((event, success) => {
      if (!success) return;
      if (scale.get() > 1.02) {
        scale.set(withSpring(1, springs.gentle));
        tx.set(withSpring(0, springs.gentle));
        ty.set(withSpring(0, springs.gentle));
        savedScale.set(1);
        savedTx.set(0);
        savedTy.set(0);
        setZoomed(false);
        return;
      }
      const next = 2.5;
      // Zoom towards the tapped point.
      const offsetX = (width / 2 - event.x) * (next - 1);
      const offsetY = (height / 2 - event.y) * (next - 1);
      const maxX = (width * (next - 1)) / 2;
      const maxY = (height * (next - 1)) / 2;
      const x = Math.min(maxX, Math.max(-maxX, offsetX));
      const y = Math.min(maxY, Math.max(-maxY, offsetY));
      scale.set(withSpring(next, springs.gentle));
      tx.set(withSpring(x, springs.gentle));
      ty.set(withSpring(y, springs.gentle));
      savedScale.set(next);
      savedTx.set(x);
      savedTy.set(y);
      setZoomed(true);
    });

  const singleTap = Gesture.Tap()
    .maxDuration(220)
    .onEnd((_event, success) => {
      if (success) runOnJS(onToggleChrome)();
    });

  const gesture = Gesture.Simultaneous(pinch, Gesture.Race(panZoomed, panDismiss), Gesture.Exclusive(doubleTap, singleTap));

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.get() }, { translateY: ty.get() }, { scale: scale.get() * (1 - dismiss.get() * 0.12) }],
  }));

  const uri = item.url ?? item.thumb_url;

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[{ width, height }, style]}>
        {uri ? (
          <Image
            source={{ uri }}
            placeholder={item.thumb_url ? { uri: item.thumb_url } : undefined}
            placeholderContentFit="contain"
            style={{ width, height }}
            contentFit="contain"
            transition={160}
            accessibilityIgnoresInvertColors
          />
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
}

function VideoSlide({ item, active, width, height }: SlideProps) {
  const player = useVideoPlayer(item.url, (instance) => {
    instance.loop = false;
  });
  const { status } = useEvent(player, 'statusChange', { status: player.status, error: undefined });

  useEffect(() => {
    if (active && status === 'readyToPlay') player.play();
    else if (!active) player.pause();
  }, [active, status, player]);

  return (
    <View style={{ width, height, backgroundColor: colors.black }}>
      {item.url ? (
        <VideoView player={player} style={{ width, height }} contentFit="contain" nativeControls />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }}>
          <AppText tone="onDarkMuted" align="center">
            Este video todavía se está procesando.
          </AppText>
        </View>
      )}
    </View>
  );
}

interface StoryViewerProps {
  items: StoryMedia[];
  initialIndex: number;
  onClose: () => void;
  /** Owner only: shows a delete action for the item on screen. */
  onDelete?: (item: StoryMedia) => void;
}

function ChromeButton({ icon: Icon, label, onPress }: { icon: typeof X; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(30,30,33,0.72)', alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
      <Icon color={colors.onDark} size={20} strokeWidth={2} />
    </Pressable>
  );
}

export function StoryViewer({ items, initialIndex, onClose, onDelete }: StoryViewerProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const start = Math.min(Math.max(0, initialIndex), Math.max(0, items.length - 1));
  const [activeIndex, setActiveIndex] = useState(start);
  const [zoomed, setZoomed] = useState(false);
  const [chrome, setChrome] = useState(true);
  const dismiss = useSharedValue(0);

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems[0];
    if (first?.index !== null && first?.index !== undefined) setActiveIndex(first.index);
  }, []);

  const toggleChrome = useCallback(() => setChrome((shown) => !shown), []);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: interpolate(dismiss.get(), [0, 1], [1, 0.25]) }));
  const chromeStyle = useAnimatedStyle(() => ({ opacity: withTiming(chrome ? 1 - dismiss.get() : 0, { duration: 140 }) }), [chrome]);

  const active = items[Math.min(activeIndex, items.length - 1)];

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      {/* Gestures inside a Modal need their own root on Android. */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.black }, backdropStyle]} />

        <FlatList
          data={items}
          horizontal
          pagingEnabled
          scrollEnabled={!zoomed}
          initialScrollIndex={start}
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
          keyExtractor={(item) => item.uuid}
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          windowSize={3}
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          extraData={`${activeIndex}-${width}-${height}`}
          renderItem={({ item, index }) =>
            item.role === 'video' ? (
              <VideoSlide item={item} active={index === activeIndex} width={width} height={height} />
            ) : (
              <PhotoSlide
                item={item}
                active={index === activeIndex}
                width={width}
                height={height}
                dismiss={dismiss}
                onZoomChange={setZoomed}
                onClose={onClose}
                onToggleChrome={toggleChrome}
              />
            )
          }
        />

        <Animated.View
          pointerEvents={chrome ? 'box-none' : 'none'}
          style={[
            {
              position: 'absolute',
              top: insets.top + spacing.xs,
              left: Math.max(insets.left, spacing.md),
              right: Math.max(insets.right, spacing.md),
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            },
            chromeStyle,
          ]}>
          <ChromeButton icon={X} label="Cerrar" onPress={onClose} />
          {items.length > 1 ? (
            <View style={{ paddingHorizontal: 12, height: 30, borderRadius: 15, backgroundColor: 'rgba(30,30,33,0.72)', justifyContent: 'center' }}>
              <AppText maxFontSizeMultiplier={1.3} style={{ fontFamily: fontFamily.semibold, fontSize: 13, color: colors.onDark, fontVariant: ['tabular-nums'] }}>
                {activeIndex + 1} de {items.length}
              </AppText>
            </View>
          ) : (
            <View />
          )}
          {onDelete && active ? <ChromeButton icon={Trash2} label="Eliminar" onPress={() => onDelete(active)} /> : <View style={{ width: 40 }} />}
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}
