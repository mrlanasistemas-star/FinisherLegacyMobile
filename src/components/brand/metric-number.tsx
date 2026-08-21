import { Text, View, type ViewStyle } from 'react-native';

import { colors, fontFamily, fontSize, spacing } from '@/theme/tokens';

interface MetricNumberProps {
  value: string | number;
  label?: string;
  /** Purely decorative art (e.g. "42.195" in a hero) vs a real number from the API — never visually confused (AGENTS.md §15/§72). */
  decorative?: boolean;
  size?: number;
  tone?: 'gold' | 'foreground';
  style?: ViewStyle;
}

export function MetricNumber({ value, label, decorative = false, size = fontSize.metric, tone = 'foreground', style }: MetricNumberProps) {
  const color = decorative ? 'rgba(245,245,245,0.08)' : tone === 'gold' ? colors.gold : colors.foreground;

  return (
    <View style={style}>
      <Text
        style={{
          fontFamily: fontFamily.bold,
          fontSize: size,
          lineHeight: size * 1.02,
          color,
        }}
        numberOfLines={1}
        accessibilityElementsHidden={decorative}
        importantForAccessibility={decorative ? 'no-hide-descendants' : 'auto'}>
        {value}
      </Text>
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
