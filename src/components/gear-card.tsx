import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { GearIconBadge } from '@/components/brand/gear-icon-badge';
import { PressScale } from '@/components/motion/press-scale';
import { Badge } from '@/components/ui/badge';
import { colors, radius, shadows, spacing } from '@/theme/tokens';
import type { AthleteOwnedProduct, GearStatus } from '@/types/models';

export const GEAR_STATUS_LABEL: Record<GearStatus, string> = {
  unclaimed: 'Sin reclamar',
  assigned: 'Asignado',
  active: 'Activo',
  revoked: 'Revocado',
};

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
          borderColor: colors.border,
          backgroundColor: colors.graphite,
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
              {usageCount === 1 ? 'Usado en 1 evento' : `Usado en ${usageCount} eventos`}
            </AppText>
          ) : null}
        </View>

        <Badge label={GEAR_STATUS_LABEL[gear.status]} variant={GEAR_STATUS_VARIANT[gear.status]} />
      </View>
    </PressScale>
  );
}
