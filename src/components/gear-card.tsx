import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { GearIconBadge } from '@/components/brand/gear-icon-badge';
import { PressScale } from '@/components/motion/press-scale';
import { Badge } from '@/components/ui/badge';
import { useI18n, type Translate } from '@/i18n';
import { colors, radius, shadows, spacing } from '@/theme/tokens';
import type { AthleteOwnedProduct, GearStatus } from '@/types/models';

/** A function, not a table: resolved in the language of the translator it is given (the `t` of `useI18n()`). */
export function gearStatusLabel(status: GearStatus, t: Translate): string {
  switch (status) {
    case 'unclaimed':
      return t('Sin reclamar');
    case 'assigned':
      return t('Asignado');
    case 'active':
      return t('Activo');
    case 'revoked':
      return t('Revocado');
    default:
      return status;
  }
}

export const GEAR_STATUS_VARIANT: Record<GearStatus, 'neutral' | 'gold' | 'success' | 'destructive'> = {
  unclaimed: 'neutral',
  assigned: 'gold',
  active: 'success',
  revoked: 'destructive',
};

interface GearCardProps {
  gear: AthleteOwnedProduct;
  onPress: () => void;
}

export function GearCard({ gear, onPress }: GearCardProps) {
  const { t, tc } = useI18n();
  const usageCount = gear.usage_history?.length ?? 0;

  return (
    <PressScale onPress={onPress} haptic>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.hairline,
          backgroundColor: colors.card,
          padding: spacing.md,
          ...shadows.card,
        }}>
        <GearIconBadge productName={gear.product_name} />

        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {gear.product_name}
          </AppText>
          {gear.variant_name ? (
            <AppText variant="caption" tone="muted" numberOfLines={1}>
              {gear.variant_name}
            </AppText>
          ) : null}
          <AppText variant="caption" tone="muted" style={{ letterSpacing: 1 }}>
            {gear.asset_code}
          </AppText>
          {usageCount > 0 ? (
            <AppText variant="caption" tone="gold" style={{ marginTop: 2 }}>
              {tc('Usado en {count} evento|Usado en {count} eventos', usageCount)}
            </AppText>
          ) : null}
        </View>

        <Badge label={gearStatusLabel(gear.status, t)} variant={GEAR_STATUS_VARIANT[gear.status]} />
      </View>
    </PressScale>
  );
}
