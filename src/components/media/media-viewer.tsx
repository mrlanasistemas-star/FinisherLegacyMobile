import { useEvent } from 'expo';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Lock, MoreVertical, X } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, FlatList, Modal, Pressable, View, type ViewToken } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { GlassSurface } from '@/components/brand/glass-surface';
import { colors, spacing } from '@/theme/tokens';
import type { AthleteEventMedia } from '@/types/models';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function ZoomableImage({ url, active }: { url: string; active: boolean }) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  const pinch = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = Math.min(Math.max(savedScale.value * event.scale, 1), 3);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      const next = scale.value > 1 ? 1 : 2;
      scale.value = withSpring(next, { damping: 18 });
      savedScale.value = next;
    });

  useEffect(() => {
    if (!active) {
      scale.value = withSpring(1);
      savedScale.value = 1;
    }
  }, [active, scale, savedScale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <GestureDetector gesture={Gesture.Simultaneous(pinch, doubleTap)}>
      <Animated.View style={[{ width: SCREEN_WIDTH, height: '100%' }, style]}>
        <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} contentFit="contain" />
      </Animated.View>
    </GestureDetector>
  );
}

function VideoSlide({ url, active }: { url: string; active: boolean }) {
  const player = useVideoPlayer(url, (instance) => {
    instance.loop = true;
  });
  const { status } = useEvent(player, 'statusChange', { status: player.status, error: undefined });

  useEffect(() => {
    if (active && status === 'readyToPlay') {
      player.play();
    } else {
      player.pause();
    }
  }, [active, status, player]);

  return (
    <View style={{ width: SCREEN_WIDTH, height: '100%' }}>
      <VideoView player={player} style={{ width: '100%', height: '100%' }} contentFit="contain" nativeControls />
    </View>
  );
}

interface MediaViewerProps {
  visible: boolean;
  items: AthleteEventMedia[];
  initialIndex: number;
  onClose: () => void;
  onOpenActions: (item: AthleteEventMedia) => void;
}

/**
 * The parent mounts this with `key={viewerIndex}` so opening a different
 * thumbnail always remounts with fresh state — simpler and lint-clean
 * compared to resetting `activeIndex` from a `visible`/`initialIndex`
 * effect (React's documented "resetting state with a key" pattern).
 */
export function MediaViewer({ visible, items, initialIndex, onClose, onOpenActions }: MediaViewerProps) {
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const listRef = useRef<FlatList<AthleteEventMedia>>(null);

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems[0];
    if (first?.index !== null && first?.index !== undefined) setActiveIndex(first.index);
  }, []);

  const activeItem = items[activeIndex];

  const renderItem = useCallback(
    ({ item, index }: { item: AthleteEventMedia; index: number }) =>
      item.type === 'video' ? (
        <VideoSlide url={item.url} active={visible && index === activeIndex} />
      ) : (
        <ZoomableImage url={item.url} active={visible && index === activeIndex} />
      ),
    [visible, activeIndex],
  );

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: colors.black }}>
        <FlatList
          ref={listRef}
          data={items}
          horizontal
          pagingEnabled
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
          keyExtractor={(item) => item.uuid}
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          renderItem={renderItem}
        />

        <View
          style={{
            position: 'absolute',
            top: insets.top + spacing.xs,
            left: spacing.md,
            right: spacing.md,
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}>
          <GlassSurface style={{ width: 40, height: 40 }}>
            <Pressable onPress={onClose} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} accessibilityRole="button" accessibilityLabel="Cerrar">
              <X color={colors.foreground} size={20} />
            </Pressable>
          </GlassSurface>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            {activeItem && !activeItem.is_public ? (
              <GlassSurface style={{ paddingHorizontal: spacing.sm, height: 32, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Lock color={colors.muted} size={13} />
                <AppText variant="caption" tone="muted">
                  Sólo yo
                </AppText>
              </GlassSurface>
            ) : null}

            {activeItem ? (
              <GlassSurface style={{ width: 40, height: 40 }}>
                <Pressable
                  onPress={() => onOpenActions(activeItem)}
                  style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
                  accessibilityRole="button"
                  accessibilityLabel="Más acciones">
                  <MoreVertical color={colors.foreground} size={18} />
                </Pressable>
              </GlassSurface>
            ) : null}
          </View>
        </View>

        {items.length > 1 ? (
          <View style={{ position: 'absolute', bottom: insets.bottom + spacing.md, alignSelf: 'center' }}>
            <AppText variant="caption" tone="muted">
              {activeIndex + 1} / {items.length}
            </AppText>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}
