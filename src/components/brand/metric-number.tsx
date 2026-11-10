import { Text, View, type ViewStyle } from 'react-native';

import { AnimatedCounter } from '@/components/motion/animated-counter';

import { colors, fontFamily, fontSize, spacing } from '@/theme/tokens';

interface MetricNumberProps {
  value: string | number;
  label?: string;
  /** Purely decorative art (e.g. "42.195" in a hero) vs a real number from the API — never visually confused (AGENTS.md §15/§72). */
  decorative?: boolean;
  size?: number;
  tone?: 'gold' | 'foreground';
  style?: ViewStyle;
  /** Count up to a real numeric value on mount (UI thread; instant with Reduce Motion). */
  animate?: boolean;
}

export function MetricNumber({ value, label, decorative = false, size = fontSize.metric, tone = 'foreground', style, animate = false }: MetricNumberProps) {
  const color = decorative ? 'rgba(11,11,12,0.05)' : tone === 'gold' ? colors.accent : colors.foreground;
  const counting = animate && !decorative && typeof value === 'number';

  return (
    <View style={style}>
      {counting ? (
        <AnimatedCounter
          value={value as number}
          accessibilityLabel={label ? `${value} ${label}` : String(value)}
          style={{ fontFamily: fontFamily.heading, fontSize: size, lineHeight: size * 1.1, color, letterSpacing: -0.5 }}
        />
      ) : (
      <Text
        maxFontSizeMultiplier={1.3}
        style={{
          fontFamily: fontFamily.heading,
          letterSpacing: -0.5,
          fontSize: size,
          lineHeight: size * 1.02,
          color,
        }}
        numberOfLines={1}
        accessibilityElementsHidden={decorative}
        importantForAccessibility={decorative ? 'no-hide-descendants' : 'auto'}>
        {value}
      </Text>
      )}
      {label && !decorative ? (
        <Text
          style={{
            fontFamily: fontFamily.semibold,
            fontSize: fontSize.xs,
            letterSpacing: 1.5,
            color: colors.muted,
            textTransform: 'uppercase',
            marginTop: spacing.xxs,
          }}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}
