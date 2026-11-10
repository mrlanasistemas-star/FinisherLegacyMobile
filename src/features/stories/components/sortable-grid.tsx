/**
 * A grid whose tiles are reordered by holding one and dragging it — the
 * iOS home-screen gesture, on the UI thread (Gesture Handler + Reanimated,
 * no extra dependency). Holding ~¼ s lifts the tile (haptic, slight
 * scale), the others slide out of its way as it moves, and dropping it
 * reports the new order once. A plain tap is a separate gesture, so the
 * page still scrolls normally with a finger resting on a tile.
 *
 * `locked` keys (files still uploading) render in the grid but cannot be
 * dragged or displaced.
 */

import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedReaction, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';

import { springs } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';

type OrderMap = Record<string, number>;

interface SortableGridProps<T> {
  data: T[];
  keyOf: (item: T) => string;
  renderItem: (item: T, size: number) => ReactNode;
  /** Full width available to the grid. */
  width: number;
  columns?: number;
  gap?: number;
  /** How many leading items take part in the reorder (the rest are fixed, e.g. pending uploads). */
  sortableCount?: number;
  onReorder: (keys: string[]) => void;
  onPressItem?: (item: T) => void;
  disabled?: boolean;
}

function toOrder(keys: string[]): OrderMap {
  const order: OrderMap = {};
  keys.forEach((key, index) => {
    order[key] = index;
  });
  return order;
}

function slot(index: number, columns: number, cell: number) {
  'worklet';
  return { x: (index % columns) * cell, y: Math.floor(index / columns) * cell };
}

/** Moves `key` to `to`, shifting everything in between by one. */
function moved(order: OrderMap, key: string, to: number): OrderMap {
  'worklet';
  const from = order[key];
  if (from === undefined || from === to) return order;
  const next: OrderMap = {};
  for (const other in order) {
    const index = order[other];
    if (other === key) next[other] = to;
    else if (from < to && index > from && index <= to) next[other] = index - 1;
    else if (from > to && index >= to && index < from) next[other] = index + 1;
    else next[other] = index;
  }
  return next;
}

interface TileProps {
  itemKey: string;
  index: number;
  size: number;
  cell: number;
  columns: number;
  sortable: boolean;
  sortableCount: number;
  order: SharedValue<OrderMap>;
  activeKey: SharedValue<string | null>;
  reduceMotion: boolean;
  enabled: boolean;
  onDrop: (order: OrderMap) => void;
  onPress?: () => void;
  children: ReactNode;
}

function Tile({ itemKey, index, size, cell, columns, sortable, sortableCount, order, activeKey, reduceMotion, enabled, onDrop, onPress, children }: TileProps) {
  const start = slot(index, columns, cell);
  const x = useSharedValue(start.x);
  const y = useSharedValue(start.y);
  const originX = useSharedValue(0);
  const originY = useSharedValue(0);
  const lifted = useSharedValue(0);

  // Follow the slot this key currently owns (while another tile is dragged, or after data changes).
  useAnimatedReaction(
    () => (sortable ? (order.get()[itemKey] ?? index) : index),
    (position) => {
      if (activeKey.get() === itemKey) return;
      const target = slot(position, columns, cell);
      if (reduceMotion) {
        x.set(target.x);
        y.set(target.y);
      } else {
        x.set(withSpring(target.x, springs.snappy));
        y.set(withSpring(target.y, springs.snappy));
      }
    },
    [index, columns, cell, sortable, reduceMotion],
  );

  const buzz = () => void haptics.selection();

  const drag = Gesture.Pan()
    .enabled(enabled && sortable)
    .activateAfterLongPress(260)
    .onStart(() => {
      activeKey.set(itemKey);
      originX.set(x.get());
      originY.set(y.get());
      lifted.set(reduceMotion ? 1 : withSpring(1, springs.press));
      runOnJS(buzz)();
    })
    .onUpdate((event) => {
      if (activeKey.get() !== itemKey) return;
      const nextX = originX.get() + event.translationX;
      const nextY = originY.get() + event.translationY;
      x.set(nextX);
      y.set(nextY);
      const column = Math.min(columns - 1, Math.max(0, Math.round(nextX / cell)));
      const row = Math.max(0, Math.round(nextY / cell));
      const target = Math.min(sortableCount - 1, row * columns + column);
      const current = order.get()[itemKey];
      if (current !== undefined && target !== current) {
        order.set(moved(order.get(), itemKey, target));
        runOnJS(buzz)();
      }
    })
    .onFinalize(() => {
      if (activeKey.get() !== itemKey) return;
      const target = slot(order.get()[itemKey] ?? index, columns, cell);
      x.set(reduceMotion ? target.x : withSpring(target.x, springs.snappy));
      y.set(reduceMotion ? target.y : withSpring(target.y, springs.snappy));
      lifted.set(withTiming(0, { duration: 160 }));
      activeKey.set(null);
      runOnJS(onDrop)(order.get());
    });

  const press = () => onPress?.();
  const tap = Gesture.Tap()
    .enabled(enabled && !!onPress)
    .maxDuration(240)
    .onEnd((_event, success) => {
      if (success) runOnJS(press)();
    });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }, { translateY: y.get() }, { scale: 1 + lifted.get() * 0.06 }],
    zIndex: lifted.get() > 0 ? 10 : 0,
    opacity: 1 - lifted.get() * 0.08,
  }));

  return (
    <GestureDetector gesture={Gesture.Exclusive(drag, tap)}>
      <Animated.View style={[{ position: 'absolute', top: 0, left: 0, width: size, height: size }, style]}>{children}</Animated.View>
    </GestureDetector>
  );
}

export function SortableGrid<T>({ data, keyOf, renderItem, width, columns = 3, gap = 8, sortableCount, onReorder, onPressItem, disabled = false }: SortableGridProps<T>) {
  const reduceMotion = useReducedMotion();
  const size = Math.max(1, Math.floor((width - gap * (columns - 1)) / columns));
  const cell = size + gap;
  const rows = Math.ceil(data.length / columns);
  const movable = Math.min(sortableCount ?? data.length, data.length);
  const keys = data.map(keyOf);
  const sortableKeys = keys.slice(0, movable);
  const signature = sortableKeys.join('|');

  const order = useSharedValue<OrderMap>(toOrder(sortableKeys));
  const activeKey = useSharedValue<string | null>(null);

  // Data changed (upload landed, item deleted, server order arrived): adopt it.
  useEffect(() => {
    order.set(toOrder(signature === '' ? [] : signature.split('|')));
  }, [signature, order]);

  function drop(current: OrderMap) {
    const next = [...sortableKeys].sort((a, b) => (current[a] ?? 0) - (current[b] ?? 0));
    if (next.join('|') !== signature) onReorder(next);
  }

  return (
    <View style={{ width, height: rows > 0 ? rows * cell - gap : 0 }}>
      {data.map((item, index) => {
        const key = keys[index];
        return (
          <Tile
            key={key}
            itemKey={key}
            index={index}
            size={size}
            cell={cell}
            columns={columns}
            sortable={index < movable && movable > 1}
            sortableCount={movable}
            order={order}
            activeKey={activeKey}
            reduceMotion={reduceMotion}
            enabled={!disabled}
            onDrop={drop}
            onPress={onPressItem ? () => onPressItem(item) : undefined}>
            {renderItem(item, size)}
          </Tile>
        );
      })}
    </View>
  );
}
