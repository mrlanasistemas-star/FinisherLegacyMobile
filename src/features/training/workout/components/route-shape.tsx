import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { colors, radius } from '@/theme/tokens';

import { decodePolyline } from '../workout-math';

/**
 * The workout's route drawn as a line (no map tiles, no third-party map
 * SDK): an equirectangular projection of the encoded polyline, fitted to the
 * box. Start = black dot, finish = gold dot.
 */
export function RouteShape({ polyline, height = 180, label }: { polyline: string; height?: number; label: string }) {
  const shape = useMemo(() => {
    const points = decodePolyline(polyline);
    if (points.length < 2) return null;
    const midLat = (points.reduce((sum, p) => sum + p.lat, 0) / points.length) * (Math.PI / 180);
    const xs = points.map((p) => p.lng * Math.cos(midLat));
    const ys = points.map((p) => -p.lat);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const span = Math.max(Math.max(...xs) - minX, Math.max(...ys) - minY) || 1;
    const scale = 90 / span;
    const offsetX = (100 - (Math.max(...xs) - minX) * scale) / 2;
    const offsetY = (100 - (Math.max(...ys) - minY) * scale) / 2;
    const projected = xs.map((x, i) => ({ x: offsetX + (x - minX) * scale, y: offsetY + (ys[i] - minY) * scale }));
    return { projected, path: projected.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ') };
  }, [polyline]);

  if (!shape) return null;
  const start = shape.projected[0];
  const end = shape.projected[shape.projected.length - 1];

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      style={{ height, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.surfaceMuted, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        <Polyline points={shape.path} fill="none" stroke={colors.foreground} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
        <Circle cx={start.x} cy={start.y} r={2.4} fill={colors.foreground} />
        <Circle cx={end.x} cy={end.y} r={2.6} fill={colors.gold} stroke={colors.foreground} strokeWidth={0.6} />
      </Svg>
    </View>
  );
}
