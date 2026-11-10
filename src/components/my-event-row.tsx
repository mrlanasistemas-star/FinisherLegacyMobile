import { Camera, Medal as MedalIcon, Shirt } from 'lucide-react-native';
import { View } from 'react-native';

import { AppText } from './app-text';
import { Badge } from './ui/badge';
import { PressScale } from './motion/press-scale';

import { colors, radius, shadows, spacing } from '@/theme/tokens';
import { formatShortDate } from '@/utils/dates';
import type { AthleteHistoryRow } from '@/types/models';
import { useI18n, type Translate } from '@/i18n';

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
/** Label of a plate status in the active language; null for a value this build does not know. */
export function plateStatusLabel(status: string, t: Translate): string | null {
  switch (status) {
    case 'pending_payment':
      return t('Pago pendiente');
    case 'paid':
      return t('Pagada');
    case 'linked':
      return t('Vinculada a tu Legacy');
    case 'queued':
      return t('En fila de producción');
    case 'processing':
      return t('En producción');
    case 'produced':
      return t('Producida');
    case 'quality_check':
      return t('En control de calidad');
    case 'ready':
      return t('Lista para envío');
    case 'delivered':
      return t('Entregada');
    case 'cancelled':
      return t('Cancelada');
    case 'draft':
      return t('En preparación');
    case 'pending_confirmation':
      return t('Pendiente de confirmación');
    case 'reprint':
      return t('En reimpresión');
    default:
      return null;
  }
}

/** `App\Enums\SupportSessionStatus` — verified, not guessed. */
export function supportStatusLabel(status: string, t: Translate): string {
  switch (status) {
    case 'draft':
      return t('Borrador');
    case 'open':
      return t('Abierta');
    case 'active':
      return t('Activa');
    case 'completed':
      return t('Completada');
    case 'cancelled':
      return t('Cancelada');
    default:
      return status;
  }
}

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
  const { t } = useI18n();
  const subtitle = [row.edition, row.race].filter(Boolean).join(' · ');

  return (
    <PressScale onPress={onPress} haptic>
      <View
        style={{
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.hairline,
          backgroundColor: colors.card,
          padding: spacing.md,
          gap: spacing.xs,
          ...shadows.card,
        }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <AppText variant="subtitle" numberOfLines={2}>
              {row.event ?? t('Evento')}
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
            <Badge label={plateStatusLabel(row.legacy_plate_status, t) ?? row.legacy_plate_status} variant="gold" />
          ) : null}
        </View>
      </View>
    </PressScale>
  );
}
