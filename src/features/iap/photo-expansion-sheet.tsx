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
import { useI18n, type Translate, type TranslateCount } from '@/i18n';
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

const KIND_ICON: Record<IapKind, LucideIcon> = { photos: ImagePlus, videos: Video, audio: Mic };

interface KindCopy {
  /** Pack name when neither the server nor the store gives one. */
  fallback: string;
  success: string;
  /** "Agrega 10 fotos más…" (null amount: "Agrega más fotos…"). */
  lead: string;
  /** "+10 fotos". */
  amountLabel: string | null;
}

/** Whole sentences per kind (never noun + verb glued together), built with the component's translator. */
function kindCopy(kind: IapKind, amount: number | null, t: Translate, tc: TranslateCount): KindCopy {
  switch (kind) {
    case 'videos':
      return {
        fallback: t('Ampliación de videos'),
        success: t('Ya puedes agregar más videos a este recuerdo.'),
        lead: amount
          ? tc('Agrega {count} video más a este recuerdo. Lo que ya tienes no cambia.|Agrega {count} videos más a este recuerdo. Lo que ya tienes no cambia.', amount)
          : t('Agrega más videos a este recuerdo.'),
        amountLabel: amount ? tc('+{count} video|+{count} videos', amount) : null,
      };
    case 'audio':
      return {
        fallback: t('Mensaje de voz'),
        success: t('Ya puedes agregar tu mensaje de voz a este recuerdo.'),
        lead: amount
          ? tc(
              'Agrega {count} mensaje de voz más a este recuerdo. Lo que ya tienes no cambia.|Agrega {count} mensajes de voz más a este recuerdo. Lo que ya tienes no cambia.',
              amount,
            )
          : t('Agrega más mensajes de voz a este recuerdo.'),
        amountLabel: amount ? tc('+{count} mensaje de voz|+{count} mensajes de voz', amount) : null,
      };
    default:
      return {
        fallback: t('Ampliación de fotos'),
        success: t('Ya puedes agregar más fotos a este recuerdo.'),
        lead: amount
          ? tc('Agrega {count} foto más a este recuerdo. Lo que ya tienes no cambia.|Agrega {count} fotos más a este recuerdo. Lo que ya tienes no cambia.', amount)
          : t('Agrega más fotos a este recuerdo.'),
        amountLabel: amount ? tc('+{count} foto|+{count} fotos', amount) : null,
      };
  }
}

function periodLabel(period: 'one_time' | 'semiannual' | 'annual' | null | undefined, t: Translate): string {
  if (period === 'annual') return t('por 12 meses');
  if (period === 'semiannual') return t('por 6 meses');
  return t('pago único');
}

export function PhotoExpansionSheet({ visible, onClose, state, pack, onBuy, onRestore, kind = 'photos', renew = false }: PhotoExpansionSheetProps) {
  const { t, tc } = useI18n();
  const busy = isBusy(state);
  const KindIcon = KIND_ICON[kind];
  const price = state.product?.displayPrice ?? null;
  const amount = state.photosAdded ?? pack?.amount ?? pack?.photos ?? null;
  const copy = kindCopy(kind, amount, t, tc);
  const period = periodLabel(pack?.billingPeriod, t);
  const term = pack?.billingPeriod === 'annual' || pack?.billingPeriod === 'semiannual';

  function close() {
    if (!busy) onClose();
  }

  const title =
    state.phase === 'success'
      ? renew
        ? t('Plan renovado')
        : t('Espacio ampliado')
      : state.phase === 'pending'
        ? t('Pago pendiente')
        : renew
          ? t('Renovar plan')
          : t('Ampliar espacio');

  const lead =
    state.phase === 'success'
      ? (state.message ?? copy.success)
      : renew
        ? t('Tu plan venció. Renuévalo para seguir agregando; todo lo que ya subiste sigue en tu recuerdo.')
        : copy.lead;

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
              {copy.amountLabel ?? t('Más espacio')}
            </AppText>
          </View>
          {price ? (
            <View style={{ alignItems: 'flex-end' }} accessible accessibilityLabel={t('Precio {price}, {period}', { price, period })}>
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
        <AppButton label={t('Listo')} onPress={onClose} />
      ) : (
        <AppButton
          label={
            state.phase === 'verifying'
              ? t('Confirmando compra…')
              : price
                ? renew
                  ? t('Renovar por {price}', { price })
                  : t('Comprar por {price}', { price })
                : t('Cargando precio…')
          }
          variant="legacy"
          onPress={onBuy}
          loading={state.phase === 'purchasing' || state.phase === 'verifying'}
          disabled={!canBuy(state)}
          accessibilityHint={t('Abre la compra segura de {store}', { store: STORE_NAME })}
        />
      )}

      <View style={{ alignItems: 'center', gap: spacing.xs, paddingTop: spacing.md }}>
        <Pressable
          onPress={onRestore}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={t('Restaurar compras')}
          hitSlop={8}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, opacity: busy ? 0.5 : 1 }}>
          {state.phase === 'restoring' ? <ActivityIndicator size="small" color={colors.accent} /> : <RotateCcw color={colors.accent} size={14} />}
          <AppText variant="label" tone="accent">
            {t('Restaurar compras')}
          </AppText>
        </Pressable>
        <AppText variant="caption" tone="subtle" align="center">
          {term
            ? t('El cobro lo realiza {store} con tu cuenta. El espacio dura {months} meses y no se renueva solo: al vencer decides si lo renuevas.', {
                store: STORE_NAME,
                months: pack?.billingPeriod === 'annual' ? 12 : 6,
              })
            : t('El cobro lo realiza {store} con tu cuenta. El espacio se agrega a este recuerdo en cuanto la tienda confirma el pago.', { store: STORE_NAME })}
        </AppText>
      </View>
    </Sheet>
  );
}
