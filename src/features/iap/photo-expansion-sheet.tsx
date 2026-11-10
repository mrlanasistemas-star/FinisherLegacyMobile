/**
 * iOS-style bottom sheet that sells a photo expansion for one Legacy story
 * through the store (StoreKit 2 / Google Play Billing). The price shown is
 * the store's localized `displayPrice` — never a number of ours. Covers
 * every phase of purchase-flow: loading, ready, purchasing, verifying,
 * pending, success, cancelled, error and restoring.
 */

import { CircleCheck, Clock, ImagePlus, RotateCcw } from 'lucide-react-native';
import { ActivityIndicator, Platform, Pressable, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { Sheet } from '@/components/ui/sheet';
import { colors, radius, spacing } from '@/theme/tokens';

import { canBuy, isBusy, type PurchaseState } from './purchase-flow';

interface PhotoExpansionSheetProps {
  visible: boolean;
  onClose: () => void;
  state: PurchaseState;
  pack: { name: string; description: string | null; photos: number } | null;
  onBuy: () => void;
  onRestore: () => void;
}

const STORE_NAME = Platform.OS === 'ios' ? 'App Store' : 'Google Play';

export function PhotoExpansionSheet({ visible, onClose, state, pack, onBuy, onRestore }: PhotoExpansionSheetProps) {
  const busy = isBusy(state);
  const price = state.product?.displayPrice ?? null;
  const photos = state.photosAdded ?? pack?.photos ?? null;

  function close() {
    if (!busy) onClose();
  }

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
            <ImagePlus color={colors.accent} size={30} />
          )}
        </View>

        <AppText variant="title" align="center" accessibilityRole="header">
          {state.phase === 'success' ? 'Espacio ampliado' : state.phase === 'pending' ? 'Pago pendiente' : 'Ampliar espacio'}
        </AppText>

        <AppText variant="body" tone="muted" align="center">
          {state.phase === 'success'
            ? (state.message ?? 'Ya puedes agregar más fotos a este recuerdo.')
            : photos
              ? `Agrega ${photos} fotos más a este recuerdo. Las fotos que ya tienes no cambian.`
              : 'Agrega más fotos a este recuerdo.'}
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
              {pack?.name ?? state.product?.title ?? 'Ampliación de fotos'}
            </AppText>
            <AppText variant="caption" tone="subtle">
              {photos ? `+${photos} fotos · pago único` : 'Pago único'}
            </AppText>
          </View>
          {price ? (
            <AppText variant="subtitle" accessibilityLabel={`Precio ${price}`}>
              {price}
            </AppText>
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
          label={state.phase === 'verifying' ? 'Confirmando compra…' : price ? `Comprar por ${price}` : 'Cargando precio…'}
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
          {`El cobro lo realiza ${STORE_NAME} con tu cuenta. El espacio se agrega a este recuerdo en cuanto la tienda confirma el pago.`}
        </AppText>
      </View>
    </Sheet>
  );
}
