import type { PropsWithChildren } from 'react';
import { useEffect } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '@/theme/tokens';

interface SheetProps extends PropsWithChildren {
  visible: boolean;
  onClose: () => void;
}

const DISMISS_THRESHOLD = 100;

/**
 * A lightweight bottom sheet built on Modal + Gesture Handler + Reanimated
 * (all already dependencies) rather than pulling in a dedicated sheet
 * library for a handful of usages (AGENTS.md §165 dependency discipline).
 * Handles Android hardware back via Modal's onRequestClose, drag-to-dismiss,
 * backdrop tap, and safe-area bottom padding.
 */
export function Sheet({ visible, onClose, children }: SheetProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(400);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 22, stiffness: 220 });
      backdropOpacity.value = withTiming(1, { duration: 200 });
    }
  }, [visible, translateY, backdropOpacity]);

  // Reanimated shared values are mutated via `.value` by design — this
  // bypasses React's render cycle intentionally and is safe, unlike
  // mutating a normal render-scope variable the compiler tracks.
  function close() {
    // eslint-disable-next-line react-hooks/immutability
    translateY.value = withTiming(400, { duration: 180 });
    // eslint-disable-next-line react-hooks/immutability
    backdropOpacity.value = withTiming(0, { duration: 180 }, (finished) => {
      if (finished) runOnJS(onClose)();
    });
  }

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      // eslint-disable-next-line react-hooks/immutability
      if (event.translationY > 0) translateY.value = event.translationY;
    })
    .onEnd((event) => {
      if (event.translationY > DISMISS_THRESHOLD) {
        runOnJS(close)();
      } else {
        // eslint-disable-next-line react-hooks/immutability
        translateY.value = withSpring(0, { damping: 22, stiffness: 220 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,10,12,0.7)' }, backdropStyle]}>
          <Pressable style={{ flex: 1 }} onPress={close} accessibilityRole="button" accessibilityLabel="Cerrar" />
        </Animated.View>

        <GestureDetector gesture={pan}>
          <Animated.View
            style={[
              {
                backgroundColor: colors.graphite,
                borderTopLeftRadius: radius.xl,
                borderTopRightRadius: radius.xl,
                borderWidth: 1,
                borderColor: colors.border,
                paddingBottom: insets.bottom + spacing.md,
                paddingTop: spacing.sm,
              },
              sheetStyle,
            ]}>
            <View style={{ alignItems: 'center', paddingVertical: spacing.xs }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.graphiteLight }} />
            </View>
            <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xs }}>{children}</View>
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}
