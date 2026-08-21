import { View } from 'react-native';

import { AppText } from '@/components/app-text';

import { colors, radius, spacing } from '@/theme/tokens';

interface LegacyIdTagProps {
  legacyId: string;
}

/**
 * Small engraved-tag treatment for the Legacy ID — deliberately NOT a bank
 * card shape (no horizontal card, no "•••• ••••" number grouping):
 * AGENTS.md §17/§53 is explicit that a Finisher Legacy plate must never
 * read as a credit card.
 */
export function LegacyIdTag({ legacyId }: LegacyIdTagProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: spacing.xs,
        borderWidth: 1,
        borderColor: colors.goldDim,
        borderRadius: radius.pill,
        paddingVertical: spacing.xxs,
        paddingHorizontal: spacing.sm,
        backgroundColor: 'rgba(201,161,89,0.08)',
      }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.gold }} />
      <AppText variant="label" tone="gold" style={{ letterSpacing: 1.5 }}>
        LEGACY ID · {legacyId}
      </AppText>
    </View>
  );
}
