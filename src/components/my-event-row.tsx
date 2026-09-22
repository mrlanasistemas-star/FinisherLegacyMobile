import { Camera, Medal as MedalIcon, Shirt } from 'lucide-react-native';
import { View } from 'react-native';

import { AppText } from './app-text';
import { Badge } from './ui/badge';
import { PressScale } from './motion/press-scale';

import { colors, radius, shadows, spacing } from '@/theme/tokens';
import { formatShortDate } from '@/utils/dates';
import type { AthleteHistoryRow } from '@/types/models';

/**
 * `legacy_plate_status`/`legacyPlate.status`/`plates[].status` can come from
 * either of two distinct backend enums depending on whether a physical
 * plate exists yet (verified reading `App\Enums\LegacyPlateEntitlementStatus`
 * and `App\Enums\PlateStatus` — NOT guessed): the commercial entitlement
 * (`pending_payment/paid/linked/queued/produced/delivered/cancelled`) or the
 * physical production job (`draft/pending_confirmation/queued/processing/
 * produced/quality_check/ready/delivered/cancelled/reprint`). Both are
 * covered here so neither ever falls back to a raw English enum value.
 */
export const PLATE_STATUS_LABEL: Record<string, string> = {
  pending_payment: 'Pago pendiente',
  paid: 'Pagada',
  linked: 'Vinculada a tu Legacy',
  queued: 'En fila de producción',
  processing: 'En producción',
  produced: 'Producida',
  quality_check: 'En control de calidad',
  ready: 'Lista para envío',
  delivered: 'Entregada',
  cancelled: 'Cancelada',
  draft: 'En preparación',
  pending_confirmation: 'Pendiente de confirmación',
  reprint: 'En reimpresión',
};

/** `App\Enums\SupportSessionStatus` — verified, not guessed. */
export const SUPPORT_STATUS_LABEL: Record<string, string> = {
  draft: 'Borrador',
  open: 'Abierta',
  active: 'Activa',
  completed: 'Completada',
  cancelled: 'Cancelada',
};

function CountBadge({ icon: Icon, count }: { icon: typeof MedalIcon; count: number }) {
  if (count <= 0) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Icon color={colors.muted} size={14} />
      <AppText variant="caption" tone="muted">
        {count}
      </AppText>
    </View>
  );
}

export function MyEventRow({ row, onPress }: { row: AthleteHistoryRow; onPress: () => void }) {
  const subtitle = [row.edition, row.race].filter(Boolean).join(' · ');

  return (
    <PressScale onPress={onPress} haptic>
      <View
        style={{
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.graphite,
          padding: spacing.md,
          gap: spacing.xs,
          ...shadows.card,
        }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <AppText variant="subtitle" numberOfLines={2}>
              {row.event ?? 'Evento'}
            </AppText>
            {subtitle ? (
              <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
                {subtitle}
              </AppText>
            ) : null}
          </View>
          {row.event_date ? (
            <AppText variant="caption" tone="gold" style={{ letterSpacing: 1 }}>
              {formatShortDate(row.event_date).toUpperCase()}
            </AppText>
          ) : null}
        </View>

        {row.result?.official_time ? (
          <AppText variant="bodyStrong" tone="gold">
            {row.result.official_time}
          </AppText>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xxs }}>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <CountBadge icon={MedalIcon} count={row.medal_count} />
            <CountBadge icon={Camera} count={row.media_count} />
            <CountBadge icon={Shirt} count={row.gear_count} />
          </View>
          {row.legacy_plate_status ? (
            <Badge label={PLATE_STATUS_LABEL[row.legacy_plate_status] ?? row.legacy_plate_status} variant="gold" />
          ) : null}
        </View>
      </View>
    </PressScale>
  );
}
