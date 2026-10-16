import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Info, Share2, ShoppingCart } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, Share, View, useWindowDimensions } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppError } from '@/api/errors';
import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { ErrorState } from '@/components/error-state';
import { Skeleton } from '@/components/skeleton';
import { IconButton } from '@/components/ui/icon-button';
import { InlineError } from '@/components/ui/inline-error';
import { QuantityStepper } from '@/components/ui/quantity-stepper';
import { StickyFooter } from '@/components/ui/sticky-footer';
import { ProductGallery } from '@/features/commerce/components/product-gallery';
import { GearPromise, NfcBadge, ProductSections } from '@/features/commerce/components/product-story';
import { VariantPicker } from '@/features/commerce/components/variant-picker';
import { productWebUrl } from '@/features/commerce/links';
import { defaultVariant, isConnectedProduct, isVariantAvailable, maxQuantityFor, stockState } from '@/features/commerce/variant-options';
import { useAddCartItem, useCartCount } from '@/hooks/use-cart';
import { useProduct } from '@/hooks/use-store-products';
import { showToast } from '@/stores/toastStore';
import { colors, fontFamily, motion, spacing } from '@/theme/tokens';
import type { ProductGalleryItem, ProductVariant } from '@/types/models';
import { describeCommerceError } from '@/utils/commerce-errors';
import { formatMoney } from '@/utils/money';

const STOCK_DOT = { available: colors.success, low: colors.goldSoft, sold_out: colors.destructive } as const;

export default function ProductDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: product, isPending, isError, error: loadError, refetch } = useProduct(slug);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const addItem = useAddCartItem();
  const cartCount = useCartCount();

  const [selectedVariantUuid, setSelectedVariantUuid] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [intent, setIntent] = useState<'add' | 'buy' | null>(null);

  const gallery = useMemo<ProductGalleryItem[]>(() => {
    if (product?.gallery && product.gallery.length > 0) return [...product.gallery].sort((a, b) => Number(b.is_primary) - Number(a.is_primary));
    if (product?.image_url) return [{ type: 'image', url: product.image_url, poster_url: null, alt_text: product.name, is_primary: true }];
    return [];
  }, [product]);

  const variants = product?.variants ?? [];
  const variant: ProductVariant | null = variants.find((v) => v.uuid === selectedVariantUuid) ?? defaultVariant(variants);
  const soldOut = !variant || !isVariantAvailable(variant);
  const stock = stockState(variant);
  const maxQuantity = Math.max(1, maxQuantityFor(variant));
  const qty = Math.min(quantity, maxQuantity);
  const isLegacyPlate = product?.type === 'legacy_plate';
  const connected = product ? isConnectedProduct(product) : false;
  const heroHeight = Math.min(Math.round(width * 1.05), 520);

  async function add(mode: 'add' | 'buy') {
    if (!variant || soldOut) return;
    setError(null);
    setIntent(mode);
    try {
      await addItem.mutateAsync({ product_variant_uuid: variant.uuid, quantity: qty });
      if (mode === 'buy') {
        router.push('/checkout');
      } else {
        showToast(`Agregado al carrito${qty > 1 ? ` (${qty})` : ''}`, 'success');
      }
    } catch (caught) {
      setError(caught instanceof AppError ? describeCommerceError(caught) : 'No pudimos agregarlo al carrito. Intenta otra vez.');
    } finally {
      setIntent(null);
    }
  }

  if (isPending) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.black }}>
        <Skeleton height={heroHeight} radius={0} />
        <View style={{ padding: spacing.lg, gap: spacing.sm }}>
          <Skeleton height={14} width="30%" />
          <Skeleton height={28} width="80%" />
          <Skeleton height={22} width="35%" />
        </View>
      </View>
    );
  }

  if (isError || !product) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.black, paddingTop: insets.top }}>
        <IconButton icon={ChevronLeft} label="Volver" onPress={() => router.back()} size={26} />
        <ErrorState error={loadError} message="No pudimos cargar este producto." onRetry={refetch} />
      </View>
    );
  }

  const webUrl = productWebUrl(product.slug);
  const price = variant ? formatMoney(variant.base_price_minor, variant.currency) : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.black }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.lg }}>
        <View>
          <ProductGallery items={gallery} productName={product.name} width={width} height={heroHeight} webUrl={webUrl} />
          <View style={{ position: 'absolute', top: insets.top + 4, left: spacing.sm, right: spacing.sm, flexDirection: 'row', justifyContent: 'space-between' }}>
            <IconButton icon={ChevronLeft} label="Volver" onPress={() => router.back()} filled size={24} />
            <View style={{ flexDirection: 'row', gap: spacing.xs }}>
              <IconButton icon={Share2} label="Compartir producto" onPress={() => Share.share({ message: webUrl, url: webUrl }).catch(() => {})} filled size={20} />
              <IconButton icon={ShoppingCart} label="Carrito" badge={cartCount} onPress={() => router.push('/cart')} filled size={20} />
            </View>
          </View>
        </View>

        <Animated.View entering={FadeInDown.duration(motion.base)} style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.lg }}>
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              {product.category || product.brand ? (
                <AppText variant="label" tone="gold" style={{ flexShrink: 1 }} numberOfLines={1}>
                  {(product.category ?? product.brand ?? '').toUpperCase()}
                </AppText>
              ) : null}
              {connected ? <NfcBadge /> : null}
            </View>
            <AppText variant="title" style={{ fontSize: 26 }} accessibilityRole="header">
              {product.name}
            </AppText>
            {product.short_description ? (
              <AppText variant="body" tone="muted">
                {product.short_description}
              </AppText>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 }}>
              {price ? <AppText style={{ fontFamily: fontFamily.bold, fontSize: 22, color: colors.goldSoft }}>{price}</AppText> : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }} accessible accessibilityLabel={stock.label}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: STOCK_DOT[stock.tone] }} />
                <AppText variant="caption" tone="muted">
                  {stock.label}
                </AppText>
              </View>
            </View>
          </View>

          {!isLegacyPlate ? (
            <VariantPicker
              variants={variants}
              selected={variant}
              onSelect={(next) => {
                setSelectedVariantUuid(next.uuid);
                setError(null);
              }}
            />
          ) : null}

          {!soldOut && !isLegacyPlate ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <AppText variant="caption" tone="muted">
                  Cantidad
                </AppText>
                {maxQuantity <= 3 ? (
                  <AppText variant="caption" tone="gold">
                    Máximo {maxQuantity} por ahora
                  </AppText>
                ) : null}
              </View>
              <QuantityStepper value={qty} onChange={setQuantity} max={maxQuantity} />
            </View>
          ) : null}

          {isLegacyPlate ? (
            <View style={{ flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: 14, backgroundColor: colors.graphite }}>
              <Info size={18} color={colors.gold} />
              <AppText variant="caption" tone="muted" style={{ flex: 1 }}>
                Cada Legacy Plate se graba con el resultado de un evento. Pídela desde la página del evento en el que corriste.
              </AppText>
            </View>
          ) : null}

          <GearPromise connected={connected} isLegacyPlate={isLegacyPlate} />

          {product.description ? (
            <View style={{ gap: spacing.xs }}>
              <AppText style={{ fontFamily: fontFamily.semibold, fontSize: 16 }}>Descripción</AppText>
              <AppText variant="body" tone="muted" style={{ lineHeight: 23 }}>
                {product.description}
              </AppText>
            </View>
          ) : null}

          <ProductSections sections={product.content_sections ?? []} />

          {product.requires_shipping ? (
            <AppText variant="caption" style={{ color: colors.subtle }}>
              Producto físico · se entrega o envía después de confirmar tu pago.
            </AppText>
          ) : null}
        </Animated.View>
      </ScrollView>

      <StickyFooter>
        <InlineError message={error} />
        {isLegacyPlate ? (
          <AppButton label="Ver eventos" variant="secondary" onPress={() => router.push('/events')} />
        ) : soldOut ? (
          <AppButton label="Agotado" disabled onPress={() => {}} />
        ) : (
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <AppButton
              label="Comprar ahora"
              variant="secondary"
              fullWidth={false}
              style={{ flex: 1 }}
              loading={intent === 'buy'}
              disabled={addItem.isPending}
              onPress={() => add('buy')}
            />
            <AppButton
              label="Agregar al carrito"
              fullWidth={false}
              style={{ flex: 1.3 }}
              loading={intent === 'add'}
              disabled={addItem.isPending}
              onPress={() => add('add')}
              haptic={false}
            />
          </View>
        )}
      </StickyFooter>
    </View>
  );
}
