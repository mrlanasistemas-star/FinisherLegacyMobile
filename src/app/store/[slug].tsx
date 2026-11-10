import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Info, Share2, ShoppingCart } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Share, View, useWindowDimensions } from 'react-native';
import Animated, { FadeInDown, useAnimatedReaction, useReducedMotion } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppError } from '@/api/errors';
import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { ErrorState } from '@/components/error-state';
import { ScrollHeader, useParallax, useScrollY } from '@/components/motion/scroll-header';
import { Skeleton } from '@/components/skeleton';
import { IconButton } from '@/components/ui/icon-button';
import { InlineError } from '@/components/ui/inline-error';
import { QuantityStepper } from '@/components/ui/quantity-stepper';
import { StickyFooter } from '@/components/ui/sticky-footer';
import { ProductGallery } from '@/features/commerce/components/product-gallery';
import { GearPromise, NfcBadge, ProductSections } from '@/features/commerce/components/product-story';
import { DesignChips, Grouped, HowItWorksStrip, TagHero } from '@/features/commerce/components/tag-detail-parts';
import { VariantPicker } from '@/features/commerce/components/variant-picker';
import { productWebUrl } from '@/features/commerce/links';
import { isTagProduct, tagFaceFrom } from '@/features/commerce/tag-design';
import { defaultVariant, isConnectedProduct, isVariantAvailable, maxQuantityFor, stockState } from '@/features/commerce/variant-options';
import { useAddCartItem, useCartCount } from '@/hooks/use-cart';
import { useProduct } from '@/hooks/use-store-products';
import { useI18n } from '@/i18n';
import { showToast } from '@/stores/toastStore';
import { colors, fontFamily, motion, radius, spacing } from '@/theme/tokens';
import type { ProductGalleryItem, ProductVariant } from '@/types/models';
import { describeCommerceError } from '@/utils/commerce-errors';
import { formatMoney } from '@/utils/money';

const STOCK_DOT = { available: colors.success, low: colors.gold, sold_out: colors.destructive } as const;
const NAV_HEIGHT = 52;

/**
 * Product detail. Finisher Legacy Tags get the drawn, flippable tag on a
 * soft stage (design chips crossfade its art); Racepack, Trisuit, Chill
 * Band and the rest keep their photo gallery — same grouped layout and
 * sticky add-to-cart bar above the safe area for both.
 */
export default function ProductDetailScreen() {
  const { t } = useI18n();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: product, isPending, isError, error: loadError, refetch } = useProduct(slug);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const addItem = useAddCartItem();
  const cartCount = useCartCount();
  const reduceMotion = useReducedMotion();
  const { scrollY, onScroll } = useScrollY();

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
  const isTag = isTagProduct(product);
  const connected = product ? isConnectedProduct(product) : false;
  const topInset = insets.top + NAV_HEIGHT;
  const heroHeight = isTag ? Math.min(Math.round(width * 1.2), 560) + insets.top : Math.min(Math.round(width * 1.05), 520);
  const parallax = useParallax(scrollY, heroHeight);
  // Frosted circles only while the buttons float over the hero; plain glyphs once the bar is solid.
  const [overHero, setOverHero] = useState(true);
  const heroThreshold = heroHeight - 100;
  useAnimatedReaction(
    () => scrollY.value < heroThreshold,
    (now, before) => {
      if (now !== before) scheduleOnRN(setOverHero, now);
    },
  );
  const design = variant?.tag_design ?? product?.tag_design ?? null;
  const face = tagFaceFrom(design, { name: product?.name });

  async function add(mode: 'add' | 'buy') {
    if (!variant || soldOut) return;
    setError(null);
    setIntent(mode);
    try {
      await addItem.mutateAsync({ product_variant_uuid: variant.uuid, quantity: qty });
      if (mode === 'buy') {
        router.push('/checkout');
      } else {
        showToast(qty > 1 ? t('Agregado al carrito ({count})', { count: qty }) : t('Agregado al carrito'), 'success');
      }
    } catch (caught) {
      setError(caught instanceof AppError ? describeCommerceError(caught) : t('No pudimos agregarlo al carrito. Intenta otra vez.'));
    } finally {
      setIntent(null);
    }
  }

  if (isPending) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Skeleton height={Math.min(Math.round(width * 1.05), 520)} radius={0} />
        <View style={{ padding: spacing.lg, gap: spacing.sm }}>
          <Skeleton height={14} width="30%" />
          <Skeleton height={28} width="80%" />
          <Skeleton height={52} radius={radius.lg} />
          <Skeleton height={96} radius={radius.lg} />
        </View>
      </View>
    );
  }

  if (isError || !product) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        <IconButton icon={ChevronLeft} label={t('Volver')} onPress={() => router.back()} size={26} />
        <ErrorState error={loadError} message={t('No pudimos cargar este producto.')} onRetry={refetch} />
      </View>
    );
  }

  const webUrl = productWebUrl(product.slug);
  const price = variant ? formatMoney(variant.base_price_minor, variant.currency) : null;
  const showQuantity = !soldOut && !isLegacyPlate;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <Animated.View style={[{ overflow: 'hidden' }, reduceMotion ? null : parallax]}>
          {isTag ? (
            <TagHero face={face} accent={design?.accent ?? null} topInset={topInset} height={heroHeight} />
          ) : (
            <ProductGallery items={gallery} productName={product.name} width={width} height={heroHeight} webUrl={webUrl} />
          )}
        </Animated.View>

        <Animated.View
          entering={reduceMotion ? undefined : FadeInDown.delay(80).duration(motion.base)}
          style={{
            marginTop: -spacing.lg,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            borderCurve: 'continuous',
            backgroundColor: colors.background,
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.lg,
            gap: spacing.lg,
          }}>
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              {product.category || product.brand ? (
                <AppText variant="eyebrow" style={{ flexShrink: 1 }} numberOfLines={1}>
                  {product.category ?? product.brand ?? ''}
                </AppText>
              ) : null}
              {connected || isTag ? <NfcBadge /> : null}
            </View>
            <AppText variant="title" style={{ fontSize: 26 }} accessibilityRole="header">
              {product.name}
            </AppText>
            {product.short_description ? (
              <AppText variant="body" tone="muted">
                {product.short_description}
              </AppText>
            ) : null}
          </View>

          {isTag ? (
            <DesignChips
              label={variant ? t('Diseño: {name}', { name: variant.name }) : t('Elige un diseño')}
              options={variants.map((v) => ({ value: v.uuid, label: v.name, disabled: false }))}
              value={variant?.uuid ?? ''}
              onChange={(uuid) => {
                setSelectedVariantUuid(uuid);
                setError(null);
              }}
            />
          ) : !isLegacyPlate ? (
            <VariantPicker
              variants={variants}
              selected={variant}
              onSelect={(next) => {
                setSelectedVariantUuid(next.uuid);
                setError(null);
              }}
            />
          ) : null}

          <Grouped>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
              <AppText variant="body">{t('Precio')}</AppText>
              <View style={{ alignItems: 'flex-end', gap: 2 }}>
                {price ? <AppText style={{ fontFamily: fontFamily.heading, fontSize: 20, color: colors.foreground }}>{price}</AppText> : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }} accessible accessibilityLabel={stock.label}>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: STOCK_DOT[stock.tone] }} />
                  <AppText variant="caption" tone="muted">
                    {stock.label}
                  </AppText>
                </View>
              </View>
            </View>
            {showQuantity ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View>
                  <AppText variant="body">{t('Cantidad')}</AppText>
                  {maxQuantity <= 3 ? (
                    <AppText variant="caption" tone="accent">
                      {t('Máximo {max} por ahora', { max: maxQuantity })}
                    </AppText>
                  ) : null}
                </View>
                <QuantityStepper value={qty} onChange={setQuantity} max={maxQuantity} />
              </View>
            ) : null}
            {product.requires_shipping ? (
              <AppText variant="caption" tone="muted">
                {t('Producto físico · se entrega o envía después de confirmar tu pago.')}
              </AppText>
            ) : null}
          </Grouped>

          {isLegacyPlate ? (
            <View style={{ flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: 14, borderCurve: 'continuous', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.hairline }}>
              <Info size={18} color={colors.accent} />
              <AppText variant="caption" tone="muted" style={{ flex: 1 }}>
                {t('Cada Legacy Plate se graba con el resultado de un evento. Pídela desde la página del evento en el que corriste.')}
              </AppText>
            </View>
          ) : null}

          {isTag ? <HowItWorksStrip /> : <GearPromise connected={connected} isLegacyPlate={isLegacyPlate} />}

          {product.description ? (
            <Grouped title={t('Descripción')}>
              <AppText variant="body" tone="muted" style={{ lineHeight: 23 }}>
                {product.description}
              </AppText>
            </Grouped>
          ) : null}

          <ProductSections sections={product.content_sections ?? []} />
        </Animated.View>
      </Animated.ScrollView>

      <ScrollHeader
        scrollY={scrollY}
        title={product.name}
        threshold={heroHeight - 100}
        left={<IconButton icon={ChevronLeft} label={t('Volver')} onPress={() => router.back()} filled={overHero} size={24} />}
        right={
          <View style={{ flexDirection: 'row', gap: spacing.xs }}>
            <IconButton icon={Share2} label={t('Compartir producto')} onPress={() => Share.share({ message: webUrl, url: webUrl }).catch(() => {})} filled={overHero} size={20} />
            <IconButton icon={ShoppingCart} label={t('Carrito')} badge={cartCount} onPress={() => router.push('/cart')} filled={overHero} size={20} />
          </View>
        }
      />

      <StickyFooter>
        <InlineError message={error} />
        {isLegacyPlate ? (
          <AppButton label={t('Ver eventos')} variant="secondary" onPress={() => router.push('/events')} />
        ) : soldOut ? (
          <AppButton label={t('Agotado')} variant="secondary" disabled onPress={() => {}} />
        ) : (
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <AppButton
              label={t('Comprar ahora')}
              variant="secondary"
              fullWidth={false}
              style={{ flex: 1 }}
              loading={intent === 'buy'}
              disabled={addItem.isPending}
              onPress={() => add('buy')}
            />
            <AppButton
              label={t('Agregar al carrito')}
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
