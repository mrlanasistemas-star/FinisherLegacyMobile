/**
 * iOS-style bottom sheet that sells more space for one Legacy story
 * through the store (StoreKit 2 / Google Play Billing): photos, videos or
 * voice message, depending on `kind`. The price shown is the store's
 * localized `displayPrice` — never a number of ours; next to it goes the
 * pack's term ("por 12 meses" / "por 6 meses" / "pago único"). With
 * `renew` the same flow reads as renewing a plan that expired. Covers
 * every phase of purchase-flow: loading, ready, purchasing, verifying,
 * pending, success, cancelled, error and restoring.
 */

import { CircleCheck, Clock, ImagePlus, Mic, RotateCcw, Video, type LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, Platform, Pressable, View } from 'react-native';

import type { IapKind } from '@/api/iap';
import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { Sheet } from '@/components/ui/sheet';
import { colors, radius, spacing } from '@/theme/tokens';

import { canBuy, isBusy, type PurchaseState } from './purchase-flow';

interface PhotoExpansionSheetProps {
  visible: boolean;
  onClose: () => void;
  state: PurchaseState;
  pack: {
    name: string;
    description: string | null;
    photos?: number | null;
    amount?: number | null;
    billingPeriod?: 'one_time' | 'semiannual' | 'annual' | null;
  } | null;
  onBuy: () => void;
  onRestore: () => void;
  /** What is being expanded. Default: photos. */
  kind?: IapKind;
  /** The plan that gave this space expired: same purchase, "renew" wording. */
  renew?: boolean;
}

const STORE_NAME = Platform.OS === 'ios' ? 'App Store' : 'Google Play';

const KIND_COPY: Record<IapKind, { icon: LucideIcon; one: string; many: string; fallback: string; success: string }> = {
  photos: { icon: ImagePlus, one: 'foto', many: 'fotos', fallback: 'Ampliación de fotos', success: 'Ya puedes agregar más fotos a este recuerdo.' },
  videos: { icon: Video, one: 'video', many: 'videos', fallback: 'Ampliación de videos', success: 'Ya puedes agregar más videos a este recuerdo.' },
  audio: { icon: Mic, one: 'mensaje de voz', many: 'mensajes de voz', fallback: 'Mensaje de voz', success: 'Ya puedes agregar tu mensaje de voz a este recuerdo.' },
};

function periodLabel(period: 'one_time' | 'semiannual' | 'annual' | null | undefined): string {
  if (period === 'annual') return 'por 12 meses';
  if (period === 'semiannual') return 'por 6 meses';
  return 'pago único';
}

export function PhotoExpansionSheet({ visible, onClose, state, pack, onBuy, onRestore, kind = 'photos', renew = false }: PhotoExpansionSheetProps) {
  const busy = isBusy(state);
  const copy = KIND_COPY[kind];
  const KindIcon = copy.icon;
  const price = state.product?.displayPrice ?? null;
  const amount = state.photosAdded ?? pack?.amount ?? pack?.photos ?? null;
  const noun = amount === 1 ? copy.one : copy.many;
  const period = periodLabel(pack?.billingPeriod);
  const term = pack?.billingPeriod === 'annual' || pack?.billingPeriod === 'semiannual';

  function close() {
    if (!busy) onClose();
  }

  const title = state.phase === 'success' ? (renew ? 'Plan renovado' : 'Espacio ampliado') : state.phase === 'pending' ? 'Pago pendiente' : renew ? 'Renovar plan' : 'Ampliar espacio';

  const lead =
    state.phase === 'success'
      ? (state.message ?? copy.success)
      : renew
        ? 'Tu plan venció. Renuévalo para seguir agregando; todo lo que ya subiste sigue en tu recuerdo.'
        : amount
          ? `Agrega ${amount} ${noun} más a este recuerdo. Lo que ya tienes no cambia.`
          : `Agrega más ${copy.many} a este recuerdo.`;

  return (
    <Sheet visible={visible} onClose={close}>
      <View style={{ alignItems: 'center', gap: spacing.sm, paddingTop: spacing.sm, paddingBottom: spacing.md }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: radius.lg,
            borderCurve: 'continuous',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: state.phase === 'success' ? colors.successWash : colors.goldWash,
          }}>
          {state.phase === 'success' ? (
            <CircleCheck color={colors.success} size={32} />
          ) : state.phase === 'pending' ? (
            <Clock color={colors.accent} size={30} />
          ) : (
            <KindIcon color={colors.accent} size={30} />
          )}
        </View>

        <AppText variant="title" align="center" accessibilityRole="header">
          {title}
        </AppText>

        <AppText variant="body" tone="muted" align="center">
          {lead}
        </AppText>
      </View>

      {state.phase !== 'success' && state.phase !== 'pending' ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: spacing.md,
            borderRadius: radius.lg,
            borderCurve: 'continuous',
            backgroundColor: colors.background,
            borderWidth: 1,
            borderColor: colors.hairline,
            marginBottom: spacing.md,
          }}>
          <View style={{ flex: 1, paddingRight: spacing.sm }}>
            <AppText variant="bodyStrong" numberOfLines={1}>
              {pack?.name ?? state.product?.title ?? copy.fallback}
            </AppText>
            <AppText variant="caption" tone="subtle">
              {amount ? `+${amount} ${noun}` : 'Más espacio'}
            </AppText>
          </View>
          {price ? (
            <View style={{ alignItems: 'flex-end' }} accessible accessibilityLabel={`Precio ${price}, ${period}`}>
              <AppText variant="subtitle">{price}</AppText>
              <AppText variant="caption" tone="subtle">
                {period}
              </AppText>
            </View>
          ) : (
            <ActivityIndicator color={colors.accent} />
          )}
        </View>
      ) : null}

      {state.message && state.phase !== 'success' ? (
        <View
          accessibilityLiveRegion="polite"
          style={{
            padding: spacing.sm,
            borderRadius: radius.md,
            backgroundColor: state.phase === 'error' ? colors.destructiveWash : colors.goldWash,
            marginBottom: spacing.md,
          }}>
          <AppText variant="caption" tone={state.phase === 'error' ? 'destructive' : 'default'}>
            {state.message}
          </AppText>
        </View>
      ) : null}

      {state.phase === 'success' || state.phase === 'pending' ? (
        <AppButton label="Listo" onPress={onClose} />
      ) : (
        <AppButton
          label={state.phase === 'verifying' ? 'Confirmando compra…' : price ? `${renew ? 'Renovar' : 'Comprar'} por ${price}` : 'Cargando precio…'}
          variant="legacy"
          onPress={onBuy}
          loading={state.phase === 'purchasing' || state.phase === 'verifying'}
          disabled={!canBuy(state)}
          accessibilityHint={`Abre la compra segura de ${STORE_NAME}`}
        />
      )}

      <View style={{ alignItems: 'center', gap: spacing.xs, paddingTop: spacing.md }}>
        <Pressable
          onPress={onRestore}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Restaurar compras"
          hitSlop={8}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, opacity: busy ? 0.5 : 1 }}>
          {state.phase === 'restoring' ? <ActivityIndicator size="small" color={colors.accent} /> : <RotateCcw color={colors.accent} size={14} />}
          <AppText variant="label" tone="accent">
            Restaurar compras
          </AppText>
        </Pressable>
        <AppText variant="caption" tone="subtle" align="center">
          {term
            ? `El cobro lo realiza ${STORE_NAME} con tu cuenta. El espacio dura ${pack?.billingPeriod === 'annual' ? '12' : '6'} meses y no se renueva solo: al vencer decides si lo renuevas.`
            : `El cobro lo realiza ${STORE_NAME} con tu cuenta. El espacio se agrega a este recuerdo en cuanto la tienda confirma el pago.`}
        </AppText>
      </View>
    </Sheet>
  );
}
