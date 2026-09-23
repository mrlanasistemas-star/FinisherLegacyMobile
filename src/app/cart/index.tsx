import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ShoppingBag, ShoppingCart, Tag, Trash2, X } from 'lucide-react-native';
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
import { Skeleton } from '@/components/skeleton';
import { InlineError } from '@/components/ui/inline-error';
import { QuantityStepper } from '@/components/ui/quantity-stepper';
import { StickyFooter } from '@/components/ui/sticky-footer';
import { TopBar } from '@/components/ui/top-bar';
import { cartItemCount, useApplyCartCoupon, useCart, useRemoveCartCoupon, useRemoveCartItem, useUpdateCartItem } from '@/hooks/use-cart';
import { showToast } from '@/stores/toastStore';
import { colors, fontFamily, spacing } from '@/theme/tokens';
import type { CartItem } from '@/types/models';
import { describeCommerceError } from '@/utils/commerce-errors';
import { formatMoney } from '@/utils/money';

/**
 * The cart shows what the server computed — prices, discount, totals are
 * never recalculated here. Quantity at 1 turns the minus into a trash;
 * rows can also be swiped away.
 */
export default function CartScreen() {
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
      showToast('Cupón aplicado.', 'success');
    } catch (caught) {
      setCouponError(caught instanceof AppError ? describeCommerceError(caught) : 'No pudimos aplicar el cupón.');
    }
  }

  const blockingItem = cart?.items.some((item) => !item.in_stock || !item.price_available) ?? false;
  const count = cartItemCount(cart);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.black }}>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <TopBar title={count > 0 ? `Carrito (${count})` : 'Carrito'} />
      </View>

      {isPending ? (
        <View style={{ gap: spacing.md, padding: spacing.lg }}>
          <Skeleton height={80} />
          <Skeleton height={80} />
        </View>
      ) : isError || !cart ? (
        <ErrorState error={error} message="No pudimos cargar tu carrito." onRetry={refetch} />
      ) : cart.items.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="Tu carrito está vacío"
          message="Equipo, gear y productos que se suman a tu historia."
          actionLabel="Ir a la tienda"
          onAction={() => router.replace('/store')}
        />
      ) : (
        <>
          <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={{ paddingHorizontal: spacing.lg }}>
              {cart.items.map((item) => (
                <CartRow key={item.id} item={item} />
              ))}
            </View>

            <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg, gap: spacing.xs }}>
              {cart.coupon ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm }}>
                  <Tag size={18} color={colors.gold} />
                  <View style={{ flex: 1 }}>
                    <AppText style={{ fontFamily: fontFamily.semibold, color: colors.gold }}>{cart.coupon.code}</AppText>
                    <AppText variant="caption" tone="muted">
                      {cart.coupon.name}
                    </AppText>
                  </View>
                  <Pressable
                    onPress={() => removeCoupon.mutate()}
                    disabled={removeCoupon.isPending}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel="Quitar cupón"
                    style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                    <X color={colors.muted} size={18} />
                  </Pressable>
                </View>
              ) : (
                <FormInput
                  placeholder="Código de descuento"
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
                      <AppButton label="Aplicar" size="sm" variant="ghost" fullWidth={false} loading={applyCoupon.isPending} onPress={handleApplyCoupon} />
                    ) : null
                  }
                />
              )}
            </View>

            <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg, gap: spacing.xs }}>
              <TotalRow label="Subtotal" value={formatMoney(cart.subtotal_minor, cart.currency)} />
              {cart.discount_minor > 0 ? <TotalRow label="Descuento" value={`−${formatMoney(cart.discount_minor, cart.currency)}`} gold /> : null}
              <View style={{ height: 1, backgroundColor: colors.hairline, marginVertical: spacing.xs }} />
              <TotalRow label="Total" value={formatMoney(cart.total_minor, cart.currency)} strong />
              <AppText variant="caption" style={{ color: colors.subtle }}>
                El total final se confirma al crear tu pedido.
              </AppText>
            </View>
          </ScrollView>

          <StickyFooter>
            {blockingItem ? <InlineError message="Quita o actualiza los productos marcados para continuar." /> : null}
            <AppButton label={`Continuar al pago · ${formatMoney(cart.total_minor, cart.currency)}`} onPress={() => router.push('/checkout')} disabled={blockingItem} />
          </StickyFooter>
        </>
      )}
    </SafeAreaView>
  );
}

function CartRow({ item }: { item: CartItem }) {
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();
  const busy = updateItem.isPending || removeItem.isPending;

  function onError(error: unknown) {
    showToast(error instanceof AppError ? describeCommerceError(error) : 'No pudimos actualizar tu carrito.', 'destructive');
  }

  const remove = () => removeItem.mutate(item.id, { onError, onSuccess: () => showToast(`Quitamos ${item.product_name}.`, 'default') });

  return (
    <ReanimatedSwipeable
      friction={2}
      rightThreshold={60}
      overshootRight={false}
      renderRightActions={() => (
        <Pressable
          onPress={remove}
          accessibilityRole="button"
          accessibilityLabel={`Quitar ${item.product_name}`}
          style={{ width: 88, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.destructive }}>
          <Trash2 size={20} color={colors.white} />
          <AppText variant="caption" style={{ color: colors.white, marginTop: 2 }}>
            Quitar
          </AppText>
        </Pressable>
      )}>
      <View style={{ flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.hairline, backgroundColor: colors.black, opacity: busy ? 0.6 : 1 }}>
        <Pressable onPress={() => router.push(`/store/${item.product_slug}`)} accessibilityRole="imagebutton" accessibilityLabel={`Ver ${item.product_name}`}>
          <View style={{ width: 76, height: 92, borderRadius: 12, backgroundColor: colors.graphite, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
            {item.image_url ? <Image source={{ uri: item.image_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : <ShoppingBag size={24} color={colors.goldDim} />}
          </View>
        </Pressable>

        <View style={{ flex: 1, justifyContent: 'space-between' }}>
          <View style={{ gap: 2 }}>
            <AppText style={{ fontFamily: fontFamily.medium, fontSize: 15 }} numberOfLines={2}>
              {item.product_name}
            </AppText>
            {item.variant_name || item.event_edition_name ? (
              <AppText variant="caption" tone="muted" numberOfLines={1}>
                {[item.variant_name, item.event_edition_name].filter(Boolean).join(' · ')}
              </AppText>
            ) : null}
            {!item.in_stock ? (
              <AppText variant="caption" tone="destructive">
                Ya no hay existencias.
              </AppText>
            ) : !item.price_available ? (
              <AppText variant="caption" tone="destructive">
                El precio cambió o ya no está disponible.
              </AppText>
            ) : null}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xs }}>
            <QuantityStepper
              compact
              value={item.quantity}
              disabled={busy}
              onChange={(quantity) => updateItem.mutate({ itemId: item.id, quantity }, { onError })}
              onRemove={remove}
            />
            <AppText style={{ fontFamily: fontFamily.semibold, fontSize: 15 }}>{formatMoney(item.line_total_minor, item.currency)}</AppText>
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
      <AppText style={{ fontFamily: strong ? fontFamily.bold : fontFamily.medium, fontSize: strong ? 20 : 15, color: gold ? colors.gold : colors.foreground }}>{value}</AppText>
    </View>
  );
}
