import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Minus, Play, Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { GlassSurface } from '@/components/brand/glass-surface';
import { Badge } from '@/components/ui/badge';
import { ErrorState } from '@/components/error-state';
import { Reveal } from '@/components/motion/reveal';
import { Screen } from '@/components/screen';
import { Skeleton } from '@/components/skeleton';
import { useProduct } from '@/hooks/use-store-products';
import { colors, radius, spacing } from '@/theme/tokens';
import { formatMoney } from '@/utils/money';
import type { ProductGalleryItem, ProductVariant } from '@/types/models';

function GalleryVideo({ item }: { item: ProductGalleryItem }) {
  const [playing, setPlaying] = useState(false);
  const player = useVideoPlayer(playing ? item.url : null, (instance) => {
    instance.loop = true;
    instance.play();
  });

  if (!playing) {
    return (
      <Pressable
        onPress={() => setPlaying(true)}
        style={{ width: '100%', height: '100%' }}
        accessibilityRole="button"
        accessibilityLabel="Reproducir video">
        {item.poster_url ? (
          <Image source={{ uri: item.poster_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        ) : null}
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(10,10,12,0.6)', alignItems: 'center', justifyContent: 'center' }}>
            <Play color={colors.white} size={26} fill={colors.white} />
          </View>
        </View>
      </Pressable>
    );
  }

  return <VideoView player={player} style={{ width: '100%', height: '100%' }} contentFit="cover" nativeControls />;
}

export default function ProductDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: product, isPending, isError, refetch } = useProduct(slug);
  const { width } = useWindowDimensions();

  const [galleryIndex, setGalleryIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);

  const gallery = useMemo<ProductGalleryItem[]>(() => {
    if (product?.gallery && product.gallery.length > 0) return product.gallery;
    if (product?.image_url) return [{ type: 'image', url: product.image_url, poster_url: null, alt_text: null, is_primary: true }];
    return [];
  }, [product]);

  const variant = selectedVariant ?? product?.variants.find((v) => v.active && v.in_stock) ?? product?.variants[0] ?? null;

  if (isPending) {
    return (
      <Screen scroll edges={['top', 'left', 'right']}>
        <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
          <Skeleton height={320} radius={20} />
          <Skeleton height={24} width="70%" />
          <Skeleton height={16} width="40%" />
        </View>
      </Screen>
    );
  }

  if (isError || !product) {
    return (
      <Screen edges={['top', 'left', 'right']}>
        <ErrorState message="No pudimos cargar este producto." onRetry={refetch} />
      </Screen>
    );
  }

  return (
    <Screen scroll padded={false} edges={['left', 'right']}>
      <View style={{ height: 340, backgroundColor: colors.graphite }}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => setGalleryIndex(Math.round(event.nativeEvent.contentOffset.x / width))}>
          {gallery.map((item, index) => (
            <View key={`${item.url}-${index}`} style={{ width, height: 340 }}>
              {item.type === 'video' ? (
                <GalleryVideo item={item} />
              ) : (
                <Image source={{ uri: item.url }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} />
              )}
            </View>
          ))}
        </ScrollView>

        {gallery.length > 1 ? (
          <View style={{ position: 'absolute', bottom: spacing.sm, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
            {gallery.map((_, index) => (
              <View
                key={index}
                style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: index === galleryIndex ? colors.gold : 'rgba(255,255,255,0.35)' }}
              />
            ))}
          </View>
        ) : null}

        <View style={{ position: 'absolute', top: spacing.xs, left: spacing.md }}>
          <GlassSurface style={{ width: 40, height: 40 }}>
            <Pressable onPress={() => router.back()} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} accessibilityRole="button" accessibilityLabel="Volver">
              <ChevronLeft color={colors.foreground} size={22} />
            </Pressable>
          </GlassSurface>
        </View>
      </View>

      <Reveal style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xl }}>
        <View>
          {product.brand ? (
            <AppText variant="label" tone="gold">
              {product.brand.toUpperCase()}
            </AppText>
          ) : null}
          <AppText variant="display">{product.name}</AppText>
          {variant ? (
            <AppText variant="subtitle" tone="gold" style={{ marginTop: spacing.xxs }}>
              {formatMoney(variant.base_price_minor, variant.currency)}
            </AppText>
          ) : null}
        </View>

        {product.description ? (
          <AppText variant="body" tone="muted">
            {product.description}
          </AppText>
        ) : null}

        {product.variants.length > 1 ? (
          <View>
            <AppText variant="label" tone="muted" style={{ marginBottom: spacing.xs }}>
              VARIANTE
            </AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
              {product.variants.map((v) => {
                const disabled = !v.active || !v.in_stock;
                const active = variant?.uuid === v.uuid;
                return (
                  <Pressable
                    key={v.uuid}
                    disabled={disabled}
                    onPress={() => setSelectedVariant(v)}
                    style={{
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.xs,
                      borderRadius: radius.md,
                      borderWidth: 1,
                      borderColor: active ? colors.gold : colors.border,
                      backgroundColor: active ? 'rgba(201,161,89,0.12)' : 'transparent',
                      opacity: disabled ? 0.4 : 1,
                    }}>
                    <AppText variant="bodyStrong" tone={active ? 'gold' : 'default'}>
                      {v.name}
                    </AppText>
                    {disabled ? (
                      <AppText variant="caption" tone="muted">
                        Agotado
                      </AppText>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : variant && !variant.in_stock ? (
          <Badge label="Agotado" variant="destructive" />
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <AppText variant="label" tone="muted">
            CANTIDAD
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Pressable
              onPress={() => setQuantity((q) => Math.max(1, q - 1))}
              style={{ width: 36, height: 36, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
              accessibilityRole="button"
              accessibilityLabel="Disminuir cantidad">
              <Minus color={colors.foreground} size={16} />
            </Pressable>
            <AppText variant="bodyStrong">{quantity}</AppText>
            <Pressable
              onPress={() => setQuantity((q) => Math.min(20, q + 1))}
              style={{ width: 36, height: 36, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
              accessibilityRole="button"
              accessibilityLabel="Aumentar cantidad">
              <Plus color={colors.foreground} size={16} />
            </Pressable>
          </View>
        </View>

        {/*
          "Agregar al carrito" is deliberately disabled everywhere right
          now, not just for legacy_plate products: `POST /cart/items`
          requires an integer `product_variant_id` (Eloquent primary key),
          but `ProductVariantResource` — the ONLY way this screen ever sees
          a variant — exposes `uuid` only, never that numeric id. There is
          no legitimate value to send; any request would 404/422 every
          single time. Sending a fabricated id would look like a working
          feature that can never actually succeed, which is worse than
          being upfront about it. See docs/MOBILE_BACKEND_REQUIREMENTS.md —
          "TIENDA" for the one-field fix needed
          (`'id' => $this->id` in ProductVariantResource, or accept
          `product_variant_uuid` in AddCartItemRequest instead).
        */}
        <AppButton label="Agregar al carrito — muy pronto" onPress={() => {}} disabled />
        <AppText variant="caption" tone="muted" align="center">
          Estamos terminando de conectar el carrito con este catálogo. Vuelve pronto.
        </AppText>
      </Reveal>
    </Screen>
  );
}
