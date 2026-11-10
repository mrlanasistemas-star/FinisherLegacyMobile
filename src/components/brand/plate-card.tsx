import type { PropsWithChildren } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';

import { colors, fontFamily, radius, shadows, spacing } from '@/theme/tokens';

interface PlateCardProps extends PropsWithChildren {
  code: string;
}

/**
 * The physical Finisher Legacy plate — steel, engraved, never a bank card
 * (AGENTS.md §53). No horizontal card-number grouping, no chip icon; just
 * a dark engraved block with the code tracked wide like laser etching.
 */
export function PlateCard({ code, children }: PlateCardProps) {
  return (
    <View
      style={{
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: colors.goldDim,
        backgroundColor: colors.card,
        padding: spacing.lg,
        borderCurve: 'continuous',
        ...shadows.card,
      }}>
      <AppText variant="eyebrow">
        LEGACY CODE
      </AppText>
      <AppText
        style={{
          fontFamily: fontFamily.heading,
          fontSize: 34,
          letterSpacing: 4,
          color: colors.foreground,
          marginTop: spacing.xxs,
        }}>
        {code}
      </AppText>
      {children ? <View style={{ marginTop: spacing.md, gap: spacing.xxs }}>{children}</View> : null}
    </View>
  );
}
