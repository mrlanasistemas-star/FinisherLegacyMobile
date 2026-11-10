import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { Keyboard, Platform, TextInput, type KeyboardEvent, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollView, type View } from 'react-native';
import { Easing, useSharedValue, withTiming } from 'react-native-reanimated';

/**
 * Height the software keyboard currently covers, as a UI-thread shared value
 * (animated). Built on RN's Keyboard events instead of Reanimated's
 * `useAnimatedKeyboard`: on Android edge-to-edge that hook can keep a stale
 * "open" height after the keyboard was dismissed by another screen (e.g. a
 * deep link while Search had focus), which pushed pinned footers to the middle
 * of the screen and clipped the content above them.
 */
export function useKeyboardInset() {
  const initial = Keyboard.isVisible() ? (Keyboard.metrics()?.height ?? 0) : 0;
  const height = useSharedValue(initial);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const animate = (to: number, duration: number) => {
      height.value = withTiming(to, { duration, easing: Easing.out(Easing.cubic) });
    };
    const show = Keyboard.addListener(showEvent, (event: KeyboardEvent) => animate(event.endCoordinates.height, event.duration || 220));
    const hide = Keyboard.addListener(hideEvent, (event: KeyboardEvent) => animate(0, event?.duration || 200));
    // Re-sync on mount: the keyboard may have closed between render and effect.
    if (!Keyboard.isVisible()) height.value = 0;
    return () => {
      show.remove();
      hide.remove();
    };
  }, [height]);

  return height;
}

/**
 * When the keyboard opens, scrolls `scrollRef` just enough to keep the focused
 * TextInput above whatever now covers the bottom of the ScrollView (keyboard +
 * pinned footer). Needed because edge-to-edge Android no longer resizes the
 * window, so the native "scroll focused child into view" runs before the
 * footer has moved. Wire `onScroll` (and `scrollEventThrottle={16}`) on the
 * same ScrollView.
 */
export function useRevealFocusedInput(scrollRef: RefObject<ScrollView | null>) {
  const offset = useRef(0);

  useEffect(() => {
    const event = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    let timer: ReturnType<typeof setTimeout> | undefined;
    const sub = Keyboard.addListener(event, () => {
      clearTimeout(timer);
      // Wait for the footer to finish riding up so the viewport is final.
      timer = setTimeout(() => {
        const input = TextInput.State.currentlyFocusedInput() as unknown as View | null;
        const scroll = scrollRef.current as unknown as View | null;
        if (!input?.measureInWindow || !scroll?.measureInWindow) return;
        scroll.measureInWindow((_sx, sy, _sw, sh) => {
          input.measureInWindow((_ix, iy, _iw, ih) => {
            const margin = 16;
            const overflowBottom = iy + ih + margin - (sy + sh);
            const overflowTop = sy + margin - iy;
            if (overflowBottom > 0) scrollRef.current?.scrollTo({ y: offset.current + overflowBottom, animated: true });
            else if (overflowTop > 0) scrollRef.current?.scrollTo({ y: Math.max(0, offset.current - overflowTop), animated: true });
          });
        });
      }, 260);
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, [scrollRef]);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    offset.current = e.nativeEvent.contentOffset.y;
  }, []);

  return onScroll;
}
