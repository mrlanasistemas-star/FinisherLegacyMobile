import { ArrowUpRight } from 'lucide-react-native';
import { View, useWindowDimensions } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import { PressableScale } from '@/components/motion/pressable-scale';
import { TagRender, TagStage } from '@/components/tag';
import { colors, fontFamily, spacing } from '@/theme/tokens';

import type { TagFace } from '../tag-design';

export interface CarouselItem {
  key: string;
  title: string;
  /** "Triatlón · Veracruz" */
  eyebrow: string | null;
  subtitle: string | null;
  /** "Ver colección" / "$590" */
  cta: string;
  face: TagFace;
  accent: string | null;
  onPress: () => void;
}

const GAP = 14;

/**
 * Apple Wallet / App Store style rail: centered cards that snap, with the
 * side cards scaled down and dimmed from the scroll position (UI thread).
 * Each card shows its drawn tag on the soft stage. Reduce Motion keeps the
 * snap but drops the scale/opacity interpolation.
 */
export function CollectionCarousel({ items }: { items: CarouselItem[] }) {
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const cardW = Math.min(Math.round(width * 0.7), 320);
  const interval = cardW + GAP;
  const side = (width - cardW) / 2;
  const scrollX = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });

  return (
    <View style={{ gap: spacing.sm }}>
      <Animated.ScrollView
        horizontal
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={interval}
        disableIntervalMomentum
        style={{ marginHorizontal: -spacing.lg }}
        contentContainerStyle={{ paddingHorizontal: side, gap: GAP, paddingVertical: spacing.xs }}>
        {items.map((item, index) => (
          <CarouselCard key={item.key} item={item} index={index} interval={interval} width={cardW} scrollX={scrollX} animate={!reduceMotion} />
        ))}
      </Animated.ScrollView>
      {items.length > 1 ? <Dots count={items.length} interval={interval} scrollX={scrollX} /> : null}
    </View>
  );
}

interface CarouselCardProps {
  item: CarouselItem;
  index: number;
  interval: number;
  width: number;
  scrollX: SharedValue<number>;
  animate: boolean;
}

function CarouselCard({ item, index, interval, width, scrollX, animate }: CarouselCardProps) {
  const style = useAnimatedStyle(() => {
    if (!animate) return {};
    const input = [(index - 1) * interval, index * interval, (index + 1) * interval];
    return {
      opacity: interpolate(scrollX.value, input, [0.55, 1, 0.55], Extrapolation.CLAMP),
      transform: [{ scale: interpolate(scrollX.value, input, [0.88, 1, 0.88], Extrapolation.CLAMP) }],
    };
  });
  const stageH = Math.round(width * 0.92);

  return (
    <Animated.View style={[{ width }, style]}>
      <PressableScale onPress={item.onPress} haptic="light" accessibilityRole="button" accessibilityLabel={[item.title, item.eyebrow, item.cta].filter(Boolean).join(', ')}>
        <View style={{ borderRadius: 26, borderCurve: 'continuous', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.hairline, overflow: 'hidden' }}>
          <TagStage accent={item.accent} bordered={false} style={{ height: stageH, alignItems: 'center', justifyContent: 'center' }}>
            <TagRender face={item.face} width={Math.round(width * 0.34)} style={{ transform: [{ rotate: '-5deg' }] }} />
          </TagStage>
          <View style={{ padding: spacing.md, gap: 2 }}>
            {item.eyebrow ? (
              <AppText variant="eyebrow" numberOfLines={1} style={{ fontSize: 10, letterSpacing: 1.6 }}>
                {item.eyebrow.toUpperCase()}
              </AppText>
            ) : null}
            <AppText style={{ fontFamily: fontFamily.heading, fontSize: 19, lineHeight: 24 }} numberOfLines={1}>
              {item.title}
            </AppText>
            {item.subtitle ? (
              <AppText variant="caption" tone="muted" numberOfLines={1}>
                {item.subtitle}
              </AppText>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.xs }}>
              <AppText style={{ fontFamily: fontFamily.semibold, fontSize: 14, color: colors.foreground }}>{item.cta}</AppText>
              <ArrowUpRight size={15} color={colors.accent} strokeWidth={2.2} />
            </View>
          </View>
        </View>
      </PressableScale>
    </Animated.View>
  );
}

function Dots({ count, interval, scrollX }: { count: number; interval: number; scrollX: SharedValue<number> }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: count }, (_, index) => (
        <Dot key={index} index={index} interval={interval} scrollX={scrollX} />
      ))}
    </View>
  );
}

function Dot({ index, interval, scrollX }: { index: number; interval: number; scrollX: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const input = [(index - 1) * interval, index * interval, (index + 1) * interval];
    return {
      width: interpolate(scrollX.value, input, [6, 18, 6], Extrapolation.CLAMP),
      opacity: interpolate(scrollX.value, input, [0.35, 1, 0.35], Extrapolation.CLAMP),
    };
  });
  return <Animated.View style={[{ height: 6, borderRadius: 3, backgroundColor: colors.foreground }, style]} />;
}
