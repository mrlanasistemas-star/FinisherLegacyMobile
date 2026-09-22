import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Minus, Plus, ShoppingCart, Trash2, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { FormInput } from '@/components/form-input';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { AppError } from '@/api/errors';
import { useApplyCartCoupon, useCart, useRemoveCartCoupon, useRemoveCartItem, useUpdateCartItem } from '@/hooks/use-cart';
import { colors, radius, spacing } from '@/theme/tokens';
import { describeCommerceError } from '@/utils/commerce-errors';
import { formatMoney } from '@/utils/money';
import type { CartItem } from '@/types/models';

function CartItemRow({ item }: { item: CartItem }) {
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();

  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.sm }}>
      <View style={{ width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.graphiteLight, overflow: 'hidden' }}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        ) : null}
      </View>

      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="bodyStrong" numberOfLines={2}>
          {item.product_name}
        </AppText>
        {item.variant_name ? (
          <AppText variant="caption" tone="muted">
            {item.variant_name}
          </AppText>
        ) : null}
        {!item.in_stock ? (
          <AppText variant="caption" tone="destructive">
            Ya no hay existencias de este producto.
          </AppText>
        ) : !item.price_available ? (
          <AppText variant="caption" tone="destructive">
            El precio de este producto cambió.
          </AppText>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Pressable
              onPress={() => updateItem.mutate({ itemId: item.id, quantity: item.quantity - 1 })}
              disabled={updateItem.isPending || item.quantity <= 1}
              style={{
                width: 28,
                height: 28,
                borderRadius: radius.sm,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: item.quantity <= 1 ? 0.35 : 1,
              }}
              accessibilityRole="button"
              accessibilityLabel="Disminuir cantidad">
              <Minus color={colors.foreground} size={14} />
            </Pressable>
            <AppText variant="bodyStrong">{item.quantity}</AppText>
            <Pressable
              onPress={() => updateItem.mutate({ itemId: item.id, quantity: Math.min(20, item.quantity + 1) })}
              disabled={updateItem.isPending}
              style={{ width: 28, height: 28, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
              accessibilityRole="button"
              accessibilityLabel="Aumentar cantidad">
              <Plus color={colors.foreground} size={14} />
            </Pressable>
          </View>

          <AppText variant="bodyStrong" tone="gold">
            {formatMoney(item.line_total_minor, item.currency)}
          </AppText>
        </View>
      </View>

      <Pressable
        onPress={() => removeItem.mutate(item.id)}
        disabled={removeItem.isPending}
        hitSlop={8}
        style={{ padding: spacing.xxs }}
        accessibilityRole="button"
        accessibilityLabel="Eliminar del carrito">
        <Trash2 color={colors.muted} size={18} />
      </Pressable>
    </View>
  );
}

export default function CartScreen() {
  const { data: cart, isPending, isError, refetch } = useCart();
  const applyCoupon = useApplyCartCoupon();
  const removeCoupon = useRemoveCartCoupon();
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);

  async function handleApplyCoupon() {
    if (!couponCode.trim()) return;
    setCouponError(null);
    try {
      await applyCoupon.mutateAsync(couponCode.trim());
      setCouponCode('');
    } catch (error) {
      setCouponError(error instanceof AppError ? describeCommerceError(error) : 'No pudimos aplicar el cupón.');
    }
  }

  const hasBlockingItem = cart?.items.some((item) => !item.in_stock || !item.price_available) ?? false;
  const canCheckout = !!cart && cart.items.length > 0 && !hasBlockingItem;

  if (isPending) {
    return (
      <Screen edges={['top', 'left', 'right']}>
        <ScreenHeader title="Carrito" />
        <View style={{ gap: spacing.md, marginTop: spacing.md }}>
          <Skeleton height={72} />
          <Skeleton height={72} />
        </View>
      </Screen>
    );
  }

  if (isError || !cart) {
    return (
      <Screen edges={['top', 'left', 'right']}>
        <ScreenHeader title="Carrito" />
        <ErrorState message="No pudimos cargar tu carrito." onRetry={refetch} />
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'left', 'right']}>
      <ScreenHeader title="Carrito" />

      {cart.items.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="Tu carrito está vacío"
          message="Agrega productos desde la tienda para verlos aquí."
          actionLabel="Ir a la tienda"
          onAction={() => router.push('/store')}
        />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View>
            {cart.items.map((item) => (
              <CartItemRow key={item.id} item={item} />
            ))}
          </View>

          <View style={{ marginTop: spacing.lg, gap: spacing.xs }}>
            {cart.coupon ? (
              <AppText variant="label" tone="muted">
                CUPÓN
              </AppText>
            ) : null}
            {cart.coupon ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: spacing.sm,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: colors.goldDim,
                  backgroundColor: 'rgba(201,161,89,0.08)',
                }}>
                <View>
                  <AppText variant="bodyStrong" tone="gold">
                    {cart.coupon.code}
                  </AppText>
                  <AppText variant="caption" tone="muted">
                    {cart.coupon.name}
                  </AppText>
                </View>
                <Pressable onPress={() => removeCoupon.mutate()} disabled={removeCoupon.isPending} hitSlop={8} accessibilityRole="button" accessibilityLabel="Quitar cupón">
                  <X color={colors.muted} size={18} />
                </Pressable>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' }}>
                <View style={{ flex: 1 }}>
                  <FormInput
                    label="Cupón"
                    placeholder="Código de cupón"
                    autoCapitalize="characters"
                    value={couponCode}
                    onChangeText={setCouponCode}
                    onSubmitEditing={handleApplyCoupon}
                    returnKeyType="done"
                  />
                </View>
                <AppButton label="Aplicar" variant="secondary" fullWidth={false} loading={applyCoupon.isPending} onPress={handleApplyCoupon} style={{ paddingHorizontal: spacing.lg, minHeight: 50 }} />
              </View>
            )}
            {couponError ? (
              <AppText variant="caption" tone="destructive">
                {couponError}
              </AppText>
            ) : null}
          </View>

          <View style={{ marginTop: spacing.lg, gap: spacing.xs, paddingBottom: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <AppText variant="body" tone="muted">
                Subtotal
              </AppText>
              <AppText variant="body">{formatMoney(cart.subtotal_minor, cart.currency)}</AppText>
            </View>
            {cart.discount_minor > 0 ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <AppText variant="body" tone="muted">
                  Descuento
                </AppText>
                <AppText variant="body" tone="gold">
                  -{formatMoney(cart.discount_minor, cart.currency)}
                </AppText>
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xxs }}>
              <AppText variant="subtitle">Total</AppText>
              <AppText variant="subtitle" tone="gold">
                {formatMoney(cart.total_minor, cart.currency)}
              </AppText>
            </View>
          </View>
        </ScrollView>
      )}

      {cart.items.length > 0 ? (
        <View style={{ paddingVertical: spacing.md }}>
          {hasBlockingItem ? (
            <AppText variant="caption" tone="destructive" align="center" style={{ marginBottom: spacing.xs }}>
              Quita o actualiza los productos marcados antes de continuar.
            </AppText>
          ) : null}
          <AppButton label="Ir a pagar" onPress={() => router.push('/checkout')} disabled={!canCheckout} />
        </View>
      ) : null}
    </Screen>
  );
}
