import { router } from 'expo-router';
import { Lock, Nfc, ShoppingCart, Tag, Trash2, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppError } from '@/api/errors';
import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { FormInput } from '@/components/form-input';
import { StaggerItem } from '@/components/motion/reveal';
import { SkeletonRow } from '@/components/skeleton';
import { InlineError } from '@/components/ui/inline-error';
import { QuantityStepper } from '@/components/ui/quantity-stepper';
import { StickyFooter } from '@/components/ui/sticky-footer';
import { TopBar } from '@/components/ui/top-bar';
import { CartItemThumb } from '@/features/commerce/components/cart-item-thumb';
import { DEFAULT_MAX_QUANTITY, maxQuantityFor } from '@/features/commerce/variant-options';
import { cartItemCount, useApplyCartCoupon, useCart, useRemoveCartCoupon, useRemoveCartItem, useUpdateCartItem } from '@/hooks/use-cart';
import { useI18n } from '@/i18n';
import { showToast } from '@/stores/toastStore';
import { colors, fontFamily, radius, shadows, spacing } from '@/theme/tokens';
import type { CartItem } from '@/types/models';
import { describeCommerceError } from '@/utils/commerce-errors';
import { formatMoney } from '@/utils/money';

/**
 * The cart shows what the server computed — prices, discount, totals are
 * never recalculated here. Quantity at 1 turns the minus into a trash;
 * rows can also be swiped away.
 */
export default function CartScreen() {
  const { t } = useI18n();
  const { data: cart, isPending, isError, error, refetch } = useCart();
  const applyCoupon = useApplyCartCoupon();
  const removeCoupon = useRemoveCartCoupon();
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);

  async function handleApplyCoupon() {
    const code = couponCode.trim();
    if (!code) return;
    setCouponError(null);
    try {
      await applyCoupon.mutateAsync(code);
      setCouponCode('');
      showToast(t('Cupón aplicado.'), 'success');
    } catch (caught) {
      setCouponError(caught instanceof AppError ? describeCommerceError(caught) : t('No pudimos aplicar el cupón.'));
    }
  }

  const blockingItem = cart?.items.some((item) => !item.in_stock || !item.price_available) ?? false;
  const count = cartItemCount(cart);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <TopBar title={count > 0 ? t('Carrito ({count})', { count }) : t('Carrito')} />
      </View>

      {isPending ? (
        <View style={{ gap: spacing.md, padding: spacing.lg }}>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </View>
      ) : isError || !cart ? (
        <ErrorState error={error} message={t('No pudimos cargar tu carrito.')} onRetry={refetch} />
      ) : cart.items.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title={t('Tu carrito está vacío')}
          message={t('Equipo, gear y productos que se suman a tu historia.')}
          actionLabel={t('Ver colecciones')}
          onAction={() => router.replace('/store')}
        />
      ) : (
        <>
          <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View
              style={{
                marginHorizontal: spacing.lg,
                marginTop: spacing.xs,
                backgroundColor: colors.card,
                borderRadius: radius.lg,
                borderCurve: 'continuous',
                borderWidth: 1,
                borderColor: colors.hairline,
                overflow: 'hidden',
                ...shadows.soft,
              }}>
              {cart.items.map((item, index) => (
                <StaggerItem key={item.id} index={index}>
                  <CartRow item={item} last={index === cart.items.length - 1} />
                </StaggerItem>
              ))}
            </View>

            <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg, gap: spacing.xs }}>
              <AppText variant="eyebrow" tone="subtle">{t('Cupón')}</AppText>
              {cart.coupon ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm }}>
                  <Tag size={18} color={colors.accent} />
                  <View style={{ flex: 1 }}>
                    <AppText style={{ fontFamily: fontFamily.semibold, color: colors.accent }}>{cart.coupon.code}</AppText>
                    <AppText variant="caption" tone="muted">
                      {cart.coupon.name}
                    </AppText>
                  </View>
                  <Pressable
                    onPress={() => removeCoupon.mutate()}
                    disabled={removeCoupon.isPending}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={t('Quitar cupón')}
                    style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                    <X color={colors.muted} size={18} />
                  </Pressable>
                </View>
              ) : (
                <FormInput
                  placeholder={t('Código de descuento')}
                  icon={Tag}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  value={couponCode}
                  onChangeText={(value) => {
                    setCouponCode(value);
                    setCouponError(null);
                  }}
                  onSubmitEditing={handleApplyCoupon}
                  returnKeyType="done"
                  error={couponError ?? undefined}
                  trailing={
                    couponCode.trim() ? (
                      <AppButton label={t('Aplicar')} size="sm" variant="ghost" fullWidth={false} loading={applyCoupon.isPending} onPress={handleApplyCoupon} />
                    ) : null
                  }
                />
              )}
            </View>

            <AppText variant="caption" style={{ color: colors.subtle, paddingHorizontal: spacing.lg, marginTop: spacing.md }}>
              {t('Los precios y el total los calcula nuestro sistema y se confirman al crear tu pedido.')}
            </AppText>
          </ScrollView>

          {/* Sticky summary — always visible while the list scrolls. Server-computed values only. */}
          <StickyFooter>
            <View style={{ gap: 4, paddingBottom: spacing.xs }} accessible accessibilityLabel={
                cart.discount_minor > 0
                  ? t('Resumen. Subtotal {subtotal}, descuento {discount}, total {total}', {
                      subtotal: formatMoney(cart.subtotal_minor, cart.currency),
                      discount: formatMoney(cart.discount_minor, cart.currency),
                      total: formatMoney(cart.total_minor, cart.currency),
                    })
                  : t('Resumen. Subtotal {subtotal}, total {total}', {
                      subtotal: formatMoney(cart.subtotal_minor, cart.currency),
                      total: formatMoney(cart.total_minor, cart.currency),
                    })
              }>
              <TotalRow label={t('Subtotal')} value={formatMoney(cart.subtotal_minor, cart.currency)} />
              {cart.discount_minor > 0 ? <TotalRow label={cart.coupon ? t('Descuento · {code}', { code: cart.coupon.code }) : t('Descuento')} value={`−${formatMoney(cart.discount_minor, cart.currency)}`} gold /> : null}
              <TotalRow label={t('Total')} value={formatMoney(cart.total_minor, cart.currency)} strong />
            </View>
            {blockingItem ? <InlineError message={t('Quita o actualiza los productos marcados para continuar.')} /> : null}
            <AppButton label={t('Continuar al pago')} icon={Lock} onPress={() => router.push('/checkout')} disabled={blockingItem} />
          </StickyFooter>
        </>
      )}
    </SafeAreaView>
  );
}

function CartRow({ item, last }: { item: CartItem; last: boolean }) {
  const { t } = useI18n();
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();
  const busy = updateItem.isPending || removeItem.isPending;

  function onError(error: unknown) {
    showToast(error instanceof AppError ? describeCommerceError(error) : t('No pudimos actualizar tu carrito.'), 'destructive');
  }

  // Stock-limited: the server's cap when it sends one; the server
  // revalidates every change anyway (422 → toast).
  const maxQuantity = maxQuantityFor(item);
  const atMax = item.quantity >= maxQuantity;
  const sizeColor = [item.color, item.size ? t('Talla {size}', { size: item.size }) : null].filter(Boolean) as string[];
  const details = [...(sizeColor.length > 0 ? sizeColor : item.variant_name ? [item.variant_name] : []), item.event_edition_name].filter(Boolean) as string[];

  const remove = () => removeItem.mutate(item.id, { onError, onSuccess: () => showToast(t('Quitamos {name}.', { name: item.product_name }), 'default') });

  return (
    <ReanimatedSwipeable
      friction={2}
      rightThreshold={60}
      overshootRight={false}
      renderRightActions={() => (
        <Pressable
          onPress={remove}
          accessibilityRole="button"
          accessibilityLabel={t('Quitar {name}', { name: item.product_name })}
          style={{ width: 88, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.destructive }}>
          <Trash2 size={20} color={colors.white} />
          <AppText variant="caption" style={{ color: colors.white, marginTop: 2 }}>
            {t('Quitar')}
          </AppText>
        </Pressable>
      )}>
      <View style={{ flexDirection: 'row', gap: spacing.md, padding: spacing.md, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.hairline, backgroundColor: colors.card, opacity: busy ? 0.6 : 1 }}>
        <Pressable onPress={() => router.push(`/store/${item.product_slug}`)} accessibilityRole="imagebutton" accessibilityLabel={t('Ver {name}', { name: item.product_name })}>
          <CartItemThumb item={item} width={76} height={92} />
        </Pressable>

        <View style={{ flex: 1, justifyContent: 'space-between' }}>
          <View style={{ gap: 2 }}>
            <AppText style={{ fontFamily: fontFamily.semibold, fontSize: 15 }} numberOfLines={2}>
              {item.product_name}
            </AppText>
            {details.length > 0 ? (
              <AppText variant="caption" tone="muted" numberOfLines={2}>
                {details.join(' · ')}
              </AppText>
            ) : null}
            {item.nfc_enabled ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Nfc size={12} color={colors.accent} />
                <AppText variant="caption" tone="gold">
                  {t('Producto conectado')}
                </AppText>
              </View>
            ) : null}
            {item.in_stock && atMax && maxQuantity < DEFAULT_MAX_QUANTITY ? (
              <AppText variant="caption" tone="gold">
                {t('Máximo disponible: {max}', { max: maxQuantity })}
              </AppText>
            ) : null}
            {!item.in_stock ? (
              <AppText variant="caption" tone="destructive">
                {t('Ya no hay existencias.')}
              </AppText>
            ) : !item.price_available ? (
              <AppText variant="caption" tone="destructive">
                {t('El precio cambió o ya no está disponible.')}
              </AppText>
            ) : null}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xs }}>
            <QuantityStepper
              compact
              value={item.quantity}
              max={Math.max(item.quantity, maxQuantity)}
              disabled={busy}
              onChange={(quantity) => updateItem.mutate({ itemId: item.id, quantity }, { onError })}
              onRemove={remove}
            />
            <AppText style={{ fontFamily: fontFamily.bold, fontSize: 15 }}>{formatMoney(item.line_total_minor, item.currency)}</AppText>
          </View>
        </View>
      </View>
    </ReanimatedSwipeable>
  );
}

function TotalRow({ label, value, strong = false, gold = false }: { label: string; value: string; strong?: boolean; gold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <AppText style={{ fontFamily: strong ? fontFamily.semibold : fontFamily.regular, fontSize: strong ? 18 : 15, color: strong ? colors.foreground : colors.muted }}>{label}</AppText>
      <AppText style={{ fontFamily: strong ? fontFamily.heading : fontFamily.medium, fontSize: strong ? 20 : 15, color: gold ? colors.accent : colors.foreground }}>{value}</AppText>
    </View>
  );
}
