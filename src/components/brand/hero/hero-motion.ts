import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { SensorType, useAnimatedSensor, useDerivedValue, useReducedMotion, withSpring, type SharedValue } from 'react-native-reanimated';

/**
 * True while the screen is focused and Reduce Motion is off — every hero
 * loop (sheen, float, ripples, particles) runs only then, so nothing keeps
 * animating behind another screen.
 */
export function useHeroActive(): boolean {
  const reduceMotion = useReducedMotion();
  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  return focused && !reduceMotion;
}

export interface Tilt {
  /** Degrees around X (forward/back lean). */
  rx: SharedValue<number>;
  /** Degrees around Y (left/right lean). */
  ry: SharedValue<number>;
}

/**
 * Device-tilt parallax from Reanimated's built-in rotation sensor (no extra
 * native dependency). Clamped to ±`max` degrees and spring-smoothed on the UI
 * thread. Returns zeros when inactive (unfocused / Reduce Motion).
 */
export function useDeviceTilt(active: boolean, max = 8): Tilt {
  const sensor = useAnimatedSensor(SensorType.ROTATION, { interval: 'auto' });
  const rx = useDerivedValue(() => {
    if (!active) return withSpring(0);
    const pitch = sensor.sensor.value.pitch ?? 0;
    // Phones are usually held ~0.6rad pitched back; tilt around that rest pose.
    const deg = ((pitch - 0.6) * 180) / Math.PI;
    return withSpring(Math.max(-max, Math.min(max, -deg * 0.5)), { damping: 20, stiffness: 90 });
  });
  const ry = useDerivedValue(() => {
    if (!active) return withSpring(0);
    const roll = sensor.sensor.value.roll ?? 0;
    const deg = (roll * 180) / Math.PI;
    return withSpring(Math.max(-max, Math.min(max, deg * 0.5)), { damping: 20, stiffness: 90 });
  });
  return { rx, ry };
}
