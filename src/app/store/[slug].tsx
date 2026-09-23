import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { ChevronLeft, Info, Play, Share2, ShoppingBag, ShoppingCart } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, Share, View, useWindowDimensions } from 'react-native';
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
import { useAddCartItem, useCartCount } from '@/hooks/use-cart';
import { useProduct } from '@/hooks/use-store-products';
import { showToast } from '@/stores/toastStore';
import { colors, fontFamily, spacing } from '@/theme/tokens';
import type { ProductGalleryItem, ProductVariant } from '@/types/models';
import { describeCommerceError } from '@/utils/commerce-errors';
import { formatMoney } from '@/utils/money';

const MAX_QUANTITY = 20;

export default function ProductDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: product, isPending, isError, error: loadError, refetch } = useProduct(slug);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const addItem = useAddCartItem();
  const cartCount = useCartCount();

  const [galleryIndex, setGalleryIndex] = useState(0);
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
  const variant: ProductVariant | null =
    variants.find((v) => v.uuid === selectedVariantUuid) ?? variants.find((v) => v.active && v.in_stock) ?? variants[0] ?? null;
  const soldOut = !variant || !variant.in_stock || !variant.active;
  const isLegacyPlate = product?.type === 'legacy_plate';
  const heroHeight = Math.min(Math.round(width * 1.05), 520);

  async function add(mode: 'add' | 'buy') {
    if (!variant || soldOut) return;
    setError(null);
    setIntent(mode);
    try {
      await addItem.mutateAsync({ product_variant_uuid: variant.uuid, quantity });
      if (mode === 'buy') {
        router.push('/checkout');
      } else {
        showToast(`Agregado al carrito${quantity > 1 ? ` (${quantity})` : ''}`, 'success');
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

  const shareUrl = `https://finisherlegacy.com/store/${product.slug}`;

  return (
    <View style={{ flex: 1, backgroundColor: colors.black }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.lg }}>
        {/* Hero gallery — full bleed, swipe, dots */}
        <View style={{ height: heroHeight, backgroundColor: colors.graphite }}>
          {gallery.length > 0 ? (
            <FlatList
              data={gallery}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item, index) => `${item.url}-${index}`}
              onMomentumScrollEnd={(event) => setGalleryIndex(Math.round(event.nativeEvent.contentOffset.x / width))}
              renderItem={({ item }) => (
                <View style={{ width, height: heroHeight }}>
                  {item.type === 'video' ? (
                    <GalleryVideo item={item} />
                  ) : (
                    <Image source={{ uri: item.url }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} accessibilityLabel={item.alt_text ?? product.name} />
                  )}
                </View>
              )}
            />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingBag size={48} color={colors.goldDim} />
            </View>
          )}

          {gallery.length > 1 ? (
            <View style={{ position: 'absolute', bottom: 14, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 }} pointerEvents="none">
              {gallery.map((item, index) => (
                <View key={`${item.url}-dot`} style={{ width: index === galleryIndex ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: index === galleryIndex ? colors.gold : 'rgba(255,255,255,0.5)' }} />
              ))}
            </View>
          ) : null}

          <View style={{ position: 'absolute', top: insets.top + 4, left: spacing.sm, right: spacing.sm, flexDirection: 'row', justifyContent: 'space-between' }}>
            <IconButton icon={ChevronLeft} label="Volver" onPress={() => router.back()} filled size={24} />
            <View style={{ flexDirection: 'row', gap: spacing.xs }}>
              <IconButton icon={Share2} label="Compartir producto" onPress={() => Share.share({ message: shareUrl, url: shareUrl })} filled size={20} />
              <IconButton icon={ShoppingCart} label="Carrito" badge={cartCount} onPress={() => router.push('/cart')} filled size={20} />
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.lg }}>
          <View style={{ gap: 4 }}>
            {product.brand ? (
              <AppText variant="label" tone="gold">
                {product.brand.toUpperCase()}
              </AppText>
            ) : null}
            <AppText variant="title" style={{ fontSize: 26 }} accessibilityRole="header">
              {product.name}
            </AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 }}>
              {variant ? (
                <AppText style={{ fontFamily: fontFamily.bold, fontSize: 22, color: colors.goldSoft }}>{formatMoney(variant.base_price_minor, variant.currency)}</AppText>
              ) : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: soldOut ? colors.destructive : colors.success }} />
                <AppText variant="caption" tone="muted">
                  {soldOut ? 'Agotado' : 'Disponible'}
                </AppText>
              </View>
            </View>
          </View>

          {variants.length > 1 ? (
            <View style={{ gap: spacing.xs }}>
              <AppText variant="caption" tone="muted">
                {variant ? `Opción: ${variant.name}` : 'Elige una opción'}
              </AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                {variants.map((v) => {
                  const unavailable = !v.active || !v.in_stock;
                  const active = variant?.uuid === v.uuid;
                  return (
                    <Pressable
                      key={v.uuid}
                      disabled={unavailable}
                      onPress={() => {
                        setSelectedVariantUuid(v.uuid);
                        setQuantity(1);
                      }}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active, disabled: unavailable }}
                      accessibilityLabel={`${v.name}${unavailable ? ', agotado' : ''}`}
                      style={{
                        minWidth: 52,
                        minHeight: 44,
                        paddingHorizontal: spacing.md,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: active ? colors.gold : colors.inputBorder,
                        backgroundColor: active ? colors.goldWash : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: unavailable ? 0.35 : 1,
                      }}>
                      <AppText style={{ fontFamily: fontFamily.medium, fontSize: 15, color: active ? colors.gold : colors.foreground, textDecorationLine: unavailable ? 'line-through' : 'none' }}>
                        {v.name}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          {!soldOut && !isLegacyPlate ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <AppText variant="caption" tone="muted">
                Cantidad
              </AppText>
              <QuantityStepper value={quantity} onChange={setQuantity} max={MAX_QUANTITY} />
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

          {product.description ? (
            <View style={{ gap: spacing.xs }}>
              <AppText style={{ fontFamily: fontFamily.semibold, fontSize: 16 }}>Descripción</AppText>
              <AppText variant="body" tone="muted" style={{ lineHeight: 23 }}>
                {product.description}
              </AppText>
            </View>
          ) : null}

          {product.requires_shipping ? (
            <AppText variant="caption" style={{ color: colors.subtle }}>
              Producto físico · se entrega o envía después de confirmar tu pago.
            </AppText>
          ) : null}
        </View>
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

function GalleryVideo({ item }: { item: ProductGalleryItem }) {
  const [playing, setPlaying] = useState(false);
  const player = useVideoPlayer(playing ? item.url : null, (instance) => {
    instance.loop = true;
    instance.play();
  });

  if (!playing) {
    return (
      <Pressable onPress={() => setPlaying(true)} style={{ width: '100%', height: '100%' }} accessibilityRole="button" accessibilityLabel="Reproducir video">
        {item.poster_url ? <Image source={{ uri: item.poster_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(10,10,12,0.6)', alignItems: 'center', justifyContent: 'center' }}>
            <Play color={colors.white} size={26} fill={colors.white} />
          </View>
        </View>
      </Pressable>
    );
  }

  return <VideoView player={player} style={{ width: '100%', height: '100%' }} contentFit="cover" nativeControls />;
}
