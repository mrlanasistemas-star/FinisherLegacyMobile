import { router, type Href } from 'expo-router';
import { Receipt, ShoppingBag, ShoppingCart } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle, useReducedMotion, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { FormInput } from '@/components/form-input';
import { BrandRefreshControl } from '@/components/motion/brand-refresh-control';
import { Reveal, StaggerItem } from '@/components/motion/reveal';
import { ScrollHeader, useScrollY } from '@/components/motion/scroll-header';
import { Skeleton } from '@/components/skeleton';
import { Chip } from '@/components/ui/chip';
import { IconButton } from '@/components/ui/icon-button';
import { SectionHeader } from '@/components/ui/section-header';
import { useCartCount } from '@/hooks/use-cart';
import { useDebouncedValue } from '@/hooks/use-social';
import { useCollections, useProducts } from '@/hooks/use-store-products';
import type { StoreCollection } from '@/schemas/store';
import { colors, spacing } from '@/theme/tokens';
import type { ProductCategoryOption, ProductSummary } from '@/types/models';
import { formatMoney } from '@/utils/money';

import { CollectionCarousel, type CarouselItem } from './components/collection-carousel';
import { StoreProductTile } from './components/store-product-tile';
import { isTagProduct, tagFaceFrom } from './tag-design';

const GRID_GAP = spacing.md;
const NAV_HEIGHT = 52;

const openProduct = (product: ProductSummary) => router.push(`/store/${product.slug}`);
const openCollection = (collection: StoreCollection) => router.push(`/store/collection/${collection.slug}` as Href);

function collectionItem(collection: StoreCollection): CarouselItem {
  const eyebrow = [collection.discipline, collection.destination].filter(Boolean).join(' · ') || null;
  return {
    key: `c-${collection.slug}`,
    title: collection.name,
    eyebrow,
    subtitle: collection.tagline,
    cta: collection.products_count ? `Ver ${collection.products_count} ${collection.products_count === 1 ? 'pieza' : 'piezas'}` : 'Ver colección',
    face: tagFaceFrom(collection.tag_design, { name: collection.destination ?? collection.name, discipline: collection.discipline }),
    accent: collection.tag_design?.accent ?? null,
    onPress: () => openCollection(collection),
  };
}

function tagProductItem(product: ProductSummary): CarouselItem {
  return {
    key: `p-${product.uuid}`,
    title: product.name,
    eyebrow: product.category,
    subtitle: null,
    cta: product.from_price_minor !== null ? `Desde ${formatMoney(product.from_price_minor, product.currency)}` : 'Ver pieza',
    face: tagFaceFrom(product.tag_design, { name: product.name }),
    accent: product.tag_design?.accent ?? null,
    onPress: () => openProduct(product),
  };
}

/**
 * Colecciones (store tab): large title that collapses into the frosted bar,
 * a Wallet-style carousel of Finisher Legacy Tag collections drawn from
 * their `tag_design`, then the catalog grid. Everything comes from the API:
 * an empty response is an empty state, never a placeholder product.
 */
export function StoreHomeScreen() {
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search.trim(), 400);
  const filtering = !!category || q.length >= 2;
  const cartCount = useCartCount();
  const insets = useSafeAreaInsets();
  const { scrollY, onScroll } = useScrollY();

  const products = useProducts({ ...(category ? { category } : {}), ...(q.length >= 2 ? { q } : {}), sort: 'newest' });
  const tags = useProducts({ type: 'legacy_tag', sort: 'newest' });
  const collections = useCollections();
  const rows = useMemo<ProductSummary[]>(() => products.data?.pages.flatMap((page) => page.rows) ?? [], [products.data]);
  const categories: ProductCategoryOption[] = products.data?.pages[0]?.categories ?? [];

  // Collections first; on a backend without them, the tag products themselves.
  const carousel = useMemo<CarouselItem[]>(() => {
    if (filtering) return [];
    const published = collections.data ?? [];
    if (published.length > 0) return published.map(collectionItem);
    return (tags.data?.pages[0]?.rows ?? []).filter(isTagProduct).slice(0, 10).map(tagProductItem);
  }, [filtering, collections.data, tags.data]);

  const refreshing = (products.isRefetching && !products.isFetchingNextPage) || collections.isRefetching;

  const header = (
    <View style={{ gap: spacing.lg, paddingBottom: spacing.md }}>
      <LargeTitle scrollY={scrollY} />
      <FormInput kind="search" placeholder="Buscar en la tienda" value={search} onChangeText={setSearch} accessibilityLabel="Buscar productos" />

      {carousel.length > 0 ? (
        <Reveal delay={60} style={{ gap: spacing.sm }}>
          <SectionHeader title={collections.data?.length ? 'Colecciones Finisher Legacy Tag' : 'Finisher Legacy Tag'} style={{ marginBottom: 0 }} />
          <CollectionCarousel items={carousel} />
        </Reveal>
      ) : collections.isPending && !filtering ? (
        <CarouselSkeleton />
      ) : null}

      {categories.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -spacing.lg }}
          contentContainerStyle={{ gap: spacing.xs, paddingHorizontal: spacing.lg }}
          accessibilityRole="tablist">
          <Chip label="Todo" selected={category === null} onPress={() => setCategory(null)} />
          {categories.map((item) => (
            <Chip key={item.slug} label={item.name} selected={category === item.slug} onPress={() => setCategory(item.slug)} />
          ))}
        </ScrollView>
      ) : null}

      {rows.length > 0 ? (
        <SectionHeader title={filtering ? `${products.data?.pages[0]?.total ?? rows.length} resultados` : 'Todo el catálogo'} style={{ marginBottom: 0 }} />
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {products.isPending && !products.data ? (
        <StoreSkeleton top={insets.top + NAV_HEIGHT} />
      ) : products.isError && !products.data ? (
        <View style={{ flex: 1, paddingTop: insets.top + NAV_HEIGHT }}>
          <ErrorState error={products.error} message="No pudimos cargar la tienda." onRetry={products.refetch} />
        </View>
      ) : (
        <Animated.FlatList
          data={rows}
          onScroll={onScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          numColumns={2}
          keyExtractor={(item) => item.uuid}
          columnWrapperStyle={{ gap: GRID_GAP }}
          contentContainerStyle={{ gap: spacing.lg, paddingHorizontal: spacing.lg, paddingTop: insets.top + NAV_HEIGHT, paddingBottom: spacing.xxl, flexGrow: 1 }}
          ListHeaderComponent={header}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={
            <BrandRefreshControl
              refreshing={refreshing}
              progressViewOffset={insets.top + NAV_HEIGHT}
              onRefresh={() => {
                products.refetch();
                tags.refetch();
                collections.refetch();
              }}
            />
          }
          onEndReachedThreshold={0.4}
          onEndReached={() => products.hasNextPage && !products.isFetchingNextPage && products.fetchNextPage()}
          ListFooterComponent={products.isFetchingNextPage ? <Skeleton height={200} radius={16} /> : null}
          renderItem={({ item, index }) => (
            <StaggerItem index={index} style={{ flex: 1, maxWidth: '50%' }}>
              <StoreProductTile product={item} onPress={() => openProduct(item)} />
            </StaggerItem>
          )}
          ListEmptyComponent={
            filtering ? (
              <EmptyState
                compact
                icon={ShoppingBag}
                title="Sin resultados"
                message="Prueba con otra búsqueda o categoría."
                secondaryLabel="Ver todo"
                onSecondary={() => {
                  setCategory(null);
                  setSearch('');
                }}
              />
            ) : (
              <EmptyState icon={ShoppingBag} title="Aún no hay productos" message="Cuando la tienda publique piezas aparecerán aquí." />
            )
          }
        />
      )}

      <ScrollHeader
        scrollY={scrollY}
        title="Colecciones"
        threshold={56}
        right={
          <>
            <IconButton icon={Receipt} label="Mis pedidos" onPress={() => router.push('/orders')} />
            <IconButton icon={ShoppingCart} label={cartCount > 0 ? `Carrito, ${cartCount} productos` : 'Carrito'} badge={cartCount} onPress={() => router.push('/cart')} />
          </>
        }
      />
    </View>
  );
}

/**
 * iOS large title: fades and lifts as the list scrolls under the frosted
 * bar (which takes over with the compact title), and stretches a little
 * from its leading edge on pull-down.
 */
function LargeTitle({ scrollY }: { scrollY: SharedValue<number> }) {
  const reduceMotion = useReducedMotion();
  const style = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [0, 48], [1, 0], Extrapolation.CLAMP);
    if (reduceMotion) return { opacity };
    return {
      opacity,
      transform: [
        { translateY: interpolate(scrollY.value, [0, 48], [0, -6], Extrapolation.CLAMP) },
        { scale: interpolate(scrollY.value, [-140, 0], [1.1, 1], Extrapolation.CLAMP) },
      ],
    };
  });
  return (
    <Animated.View style={[{ gap: 2, transformOrigin: 'left' }, style]}>
      <AppText variant="display" accessibilityRole="header">
        Colecciones
      </AppText>
      <AppText variant="body" tone="muted">
        Finisher Legacy Tag y equipo que guarda tu historia.
      </AppText>
    </Animated.View>
  );
}

function CarouselSkeleton() {
  const { width } = useWindowDimensions();
  const cardW = Math.min(Math.round(width * 0.7), 320);
  const cardH = Math.round(cardW * 0.92) + 96;
  return (
    <View style={{ gap: spacing.sm }}>
      <Skeleton width="55%" height={20} />
      <View style={{ flexDirection: 'row', gap: 14, marginHorizontal: -spacing.lg, paddingLeft: (width - cardW) / 2, overflow: 'hidden' }}>
        <Skeleton width={cardW} height={cardH} radius={26} />
        <Skeleton width={cardW} height={cardH} radius={26} style={{ opacity: 0.6, transform: [{ scale: 0.88 }] }} />
      </View>
    </View>
  );
}

function StoreSkeleton({ top }: { top: number }) {
  return (
    <View style={{ gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: top }}>
      <Skeleton width="60%" height={34} />
      <Skeleton width="80%" height={16} />
      <Skeleton height={48} radius={14} />
      <CarouselSkeleton />
      <View style={{ flexDirection: 'row', gap: GRID_GAP }}>
        <Skeleton height={200} radius={16} style={{ flex: 1 }} />
        <Skeleton height={200} radius={16} style={{ flex: 1 }} />
      </View>
    </View>
  );
}
