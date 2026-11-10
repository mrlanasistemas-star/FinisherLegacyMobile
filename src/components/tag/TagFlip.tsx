import { useEffect, useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useDeviceTilt, useHeroActive } from '@/components/brand/hero/hero-motion';
import type { TagFace } from '@/features/commerce/tag-design';
import { haptics } from '@/utils/haptics';

import { TagRender, tagGeometry, TAG_WIDTHS, type TagSide, type TagSize } from './TagRender';
import { useI18n } from '@/i18n';

const FLIP_SPRING = { damping: 17, stiffness: 120, mass: 1 } as const;

interface TagFlipProps {
  face: TagFace;
  size?: TagSize;
  width?: number;
  /** Gentle idle float (only while focused and Reduce Motion is off). */
  float?: boolean;
  /** Device-tilt parallax — detail screen only (starts the rotation sensor). */
  tilt?: boolean;
  /** Notified after each flip (e.g. to update a "Frente / Reverso" caption). */
  onSideChange?: (side: TagSide) => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * The tag as a physical object: tap or swipe sideways to flip it (3D
 * rotateY with perspective on a spring; faces swap at 90° so Android never
 * shows a mirrored back), a soft idle float and device-tilt parallax. Every
 * loop pauses when the screen is unfocused; under Reduce Motion the tag is
 * static and a flip is an instant swap.
 */
export function TagFlip({ face, size = 'lg', width, float = true, tilt = false, onSideChange, style }: TagFlipProps) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();
  const active = useHeroActive();
  const g = tagGeometry(width ?? TAG_WIDTHS[size]);
  const rotation = useSharedValue(0);
  const start = useSharedValue(0);
  const bob = useSharedValue(0);
  const [side, setSide] = useState<TagSide>('front');

  useEffect(() => {
    if (!float || !active) {
      cancelAnimation(bob);
      bob.value = withTiming(0, { duration: 300 });
      return;
    }
    bob.value = withRepeat(withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(bob);
  }, [float, active, bob]);

  function settle(next: number) {
    const facing: TagSide = Math.round(next / 180) % 2 === 0 ? 'front' : 'back';
    haptics.light();
    setSide(facing);
    onSideChange?.(facing);
  }

  function flip() {
    const next = Math.round(rotation.value / 180) * 180 + 180;
    rotation.value = reduceMotion ? next : withSpring(next, FLIP_SPRING);
    settle(next);
  }

  const tap = Gesture.Tap()
    .maxDuration(300)
    .onEnd((_event, success) => {
      if (success) scheduleOnRN(flip);
    });

  const pan = Gesture.Pan()
    .activeOffsetX([-14, 14])
    .failOffsetY([-12, 12])
    .onStart(() => {
      start.value = rotation.value;
    })
    .onUpdate((event) => {
      if (reduceMotion) return;
      rotation.value = start.value + event.translationX * 0.7;
    })
    .onEnd((event) => {
      const projected = rotation.value + event.velocityX * 0.12;
      let target = Math.round(projected / 180) * 180;
      // A deliberate swipe always turns at least one face.
      if (target === start.value && Math.abs(event.translationX) > 24) target = start.value + (event.translationX > 0 ? 180 : -180);
      rotation.value = reduceMotion ? target : withSpring(target, { ...FLIP_SPRING, velocity: event.velocityX * 0.7 });
      if (target !== start.value) scheduleOnRN(settle, target);
    });

  const gesture = Gesture.Race(pan, tap);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(bob.value, [0, 1], [-g.u * 3, g.u * 3]) }, { rotateZ: `${interpolate(bob.value, [0, 1], [-0.8, 0.8])}deg` }],
  }));
  const shadowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(bob.value, [0, 1], [0.32, 0.2]),
    transform: [{ scaleX: interpolate(bob.value, [0, 1], [1, 0.86]) }],
  }));

  return (
    <View style={[{ alignItems: 'center' }, style]}>
      <GestureDetector gesture={gesture}>
        <Animated.View
          accessible
          accessibilityRole="button"
          accessibilityLabel={side === 'front' ? t('Frente del tag {name}', { name: face.nameLine }) : t('Reverso del tag: {line}', { line: face.backLine })}
          accessibilityHint={t('Toca para girar el tag')}
          accessibilityActions={[{ name: 'activate', label: t('Girar el tag') }]}
          onAccessibilityAction={flip}
          style={[{ width: g.width, height: g.height }, floatStyle]}>
          {tilt ? (
            <TiltLayer active={active} rotation={rotation} face={face} width={g.width} />
          ) : (
            <Faces rotation={rotation} face={face} width={g.width} />
          )}
        </Animated.View>
      </GestureDetector>
      <Animated.View
        pointerEvents="none"
        style={[{ width: g.width * 0.8, height: g.u * 7, marginTop: g.u * 7, borderRadius: g.width, backgroundColor: '#2B2418' }, shadowStyle]}
      />
    </View>
  );
}

/** Wraps the faces in a sensor-driven lean; mounted only when `tilt` is on. */
function TiltLayer({ active, rotation, face, width }: { active: boolean; rotation: SharedValue<number>; face: TagFace; width: number }) {
  const { rx, ry } = useDeviceTilt(active, 9);
  const style = useAnimatedStyle(() => ({
    transform: [{ perspective: 1000 }, { rotateX: `${rx.value}deg` }, { rotateY: `${ry.value}deg` }],
  }));
  return (
    <Animated.View style={[{ flex: 1 }, style]}>
      <Faces rotation={rotation} face={face} width={width} />
    </Animated.View>
  );
}

function Faces({ rotation, face, width }: { rotation: SharedValue<number>; face: TagFace; width: number }) {
  const frontStyle = useAnimatedStyle(() => {
    const angle = ((rotation.value % 360) + 360) % 360;
    const showing = angle < 90 || angle > 270;
    return {
      opacity: showing ? 1 : 0,
      transform: [{ perspective: 1000 }, { rotateY: `${rotation.value}deg` }],
    };
  });
  const backStyle = useAnimatedStyle(() => {
    const angle = ((rotation.value % 360) + 360) % 360;
    const showing = angle >= 90 && angle <= 270;
    return {
      opacity: showing ? 1 : 0,
      transform: [{ perspective: 1000 }, { rotateY: `${rotation.value + 180}deg` }],
    };
  });
  return (
    <>
      <Animated.View style={[{ position: 'absolute', top: 0, left: 0, backfaceVisibility: 'hidden' }, frontStyle]}>
        <TagRender face={face} side="front" width={width} />
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', top: 0, left: 0, backfaceVisibility: 'hidden' }, backStyle]}>
        <TagRender face={face} side="back" width={width} />
      </Animated.View>
    </>
  );
}
