import type { PropsWithChildren } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';

import { colors, radius, shadows, spacing } from '@/theme/tokens';

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
        backgroundColor: colors.graphite,
        padding: spacing.lg,
        ...shadows.card,
      }}>
      <AppText variant="label" tone="muted" style={{ letterSpacing: 3 }}>
        LEGACY CODE
      </AppText>
      <AppText
        style={{
          fontFamily: 'InstrumentSans_700Bold',
          fontSize: 34,
          letterSpacing: 4,
          color: colors.gold,
          marginTop: spacing.xxs,
        }}>
        {code}
      </AppText>
      {children ? <View style={{ marginTop: spacing.md, gap: spacing.xxs }}>{children}</View> : null}
    </View>
  );
}
