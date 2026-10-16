import { router } from 'expo-router';
import { Nfc, Receipt, ShoppingBag, ShoppingCart } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { FormInput } from '@/components/form-input';
import { Reveal } from '@/components/motion/reveal';
import { Skeleton } from '@/components/skeleton';
import { Chip } from '@/components/ui/chip';
import { IconButton } from '@/components/ui/icon-button';
import { SectionHeader } from '@/components/ui/section-header';
import { useCartCount } from '@/hooks/use-cart';
import { useDebouncedValue } from '@/hooks/use-social';
import { useProducts } from '@/hooks/use-store-products';
import { colors, fontFamily, radius, spacing } from '@/theme/tokens';
import type { ProductCategoryOption, ProductSummary } from '@/types/models';

import { StoreProductTile } from './components/store-product-tile';
import { isConnectedProduct } from './variant-options';

const GRID_GAP = spacing.md;
const RAIL_WIDTH = 156;

const openProduct = (product: ProductSummary) => router.push(`/store/${product.slug}`);

/**
 * Tienda — editorial when browsing (hero, Lo más nuevo, Productos
 * conectados, Colección Legacy, catálogo), focused when searching or
 * filtering (just the results grid). Rails hide themselves when empty.
 */
export function StoreHomeScreen() {
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search.trim(), 400);
  const filtering = !!category || q.length >= 2;
  const cartCount = useCartCount();

  const products = useProducts({ ...(category ? { category } : {}), ...(q.length >= 2 ? { q } : {}), sort: 'newest' });
  const legacy = useProducts({ type: 'legacy_plate', sort: 'newest' });
  const rows = useMemo<ProductSummary[]>(() => products.data?.pages.flatMap((page) => page.rows) ?? [], [products.data]);
  const categories: ProductCategoryOption[] = products.data?.pages[0]?.categories ?? [];

  const editorial = useMemo(() => {
    if (filtering) return null;
    const first = products.data?.pages[0]?.rows ?? [];
    const hero = first.find((p) => p.is_featured && p.in_stock) ?? first.find((p) => p.in_stock) ?? first[0];
    const fresh = first.filter((p) => p.uuid !== hero?.uuid && p.type !== 'legacy_plate').slice(0, 8);
    const connected = first.filter((p) => p.uuid !== hero?.uuid && isConnectedProduct(p) && p.type !== 'legacy_plate').slice(0, 8);
    const plates = (legacy.data?.pages[0]?.rows ?? []).slice(0, 8);
    return { hero, fresh, connected, plates };
  }, [filtering, products.data, legacy.data]);

  const header = (
    <View style={{ gap: spacing.lg, paddingBottom: spacing.md }}>
      <FormInput kind="search" placeholder="Buscar en la tienda" value={search} onChangeText={setSearch} accessibilityLabel="Buscar productos" />

      {categories.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -spacing.lg, marginTop: -spacing.sm }}
          contentContainerStyle={{ gap: spacing.xs, paddingHorizontal: spacing.lg }}
          accessibilityRole="tablist">
          <Chip label="Todo" selected={category === null} onPress={() => setCategory(null)} />
          {categories.map((item) => (
            <Chip key={item.slug} label={item.name} selected={category === item.slug} onPress={() => setCategory(item.slug)} />
          ))}
        </ScrollView>
      ) : null}

      {editorial?.hero ? (
        <Reveal>
          <View style={{ gap: spacing.sm }}>
            <AppText variant="label" tone="gold">
              EQUIPO QUE SE VUELVE HISTORIA
            </AppText>
            <StoreProductTile product={editorial.hero} layout="hero" onPress={() => openProduct(editorial.hero as ProductSummary)} />
          </View>
        </Reveal>
      ) : null}

      {editorial && editorial.fresh.length > 0 ? <Rail title="Lo más nuevo" products={editorial.fresh} delay={80} /> : null}

      {editorial && editorial.connected.length > 0 ? (
        <Reveal delay={140}>
          <View style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center', padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.graphite, borderWidth: 1, borderColor: colors.hairline }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.goldWash }}>
                <Nfc size={20} color={colors.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={{ fontFamily: fontFamily.semibold, fontSize: 16 }}>Productos conectados</AppText>
                <AppText variant="caption" tone="muted">
                  Acerca tu teléfono y quedan en Mi Equipo, unidos a tus carreras.
                </AppText>
              </View>
            </View>
            <RailList products={editorial.connected} />
          </View>
        </Reveal>
      ) : null}

      {editorial && editorial.plates.length > 0 ? <Rail title="Colección Legacy" products={editorial.plates} delay={200} /> : null}

      {rows.length > 0 ? (
        <SectionHeader title={filtering ? `${products.data?.pages[0]?.total ?? rows.length} resultados` : 'Todo el catálogo'} style={{ marginBottom: 0 }} />
      ) : null}
    </View>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.black }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.sm }}>
        <AppText variant="hero" style={{ fontSize: 38, lineHeight: 40, flex: 1 }} accessibilityRole="header">
          TIENDA
        </AppText>
        <IconButton icon={Receipt} label="Mis pedidos" onPress={() => router.push('/orders')} />
        <IconButton icon={ShoppingCart} label={cartCount > 0 ? `Carrito, ${cartCount} productos` : 'Carrito'} badge={cartCount} onPress={() => router.push('/cart')} style={{ marginRight: -10 }} />
      </View>

      {products.isPending && !products.data ? (
        <View style={{ gap: spacing.md, paddingHorizontal: spacing.lg }}>
          <Skeleton height={48} />
          <Skeleton height={260} radius={20} />
          <View style={{ flexDirection: 'row', gap: GRID_GAP }}>
            <Skeleton height={200} radius={16} style={{ flex: 1 }} />
            <Skeleton height={200} radius={16} style={{ flex: 1 }} />
          </View>
        </View>
      ) : products.isError && !products.data ? (
        <ErrorState error={products.error} message="No pudimos cargar la tienda." onRetry={products.refetch} />
      ) : (
        <FlatList
          data={rows}
          numColumns={2}
          keyExtractor={(item) => item.uuid}
          columnWrapperStyle={{ gap: GRID_GAP }}
          contentContainerStyle={{ gap: spacing.lg, paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, flexGrow: 1 }}
          ListHeaderComponent={header}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={
            <RefreshControl
              refreshing={products.isRefetching && !products.isFetchingNextPage}
              onRefresh={() => {
                products.refetch();
                legacy.refetch();
              }}
              tintColor={colors.gold}
            />
          }
          onEndReachedThreshold={0.4}
          onEndReached={() => products.hasNextPage && !products.isFetchingNextPage && products.fetchNextPage()}
          ListFooterComponent={products.isFetchingNextPage ? <Skeleton height={200} radius={16} /> : null}
          renderItem={({ item }) => (
            <View style={{ flex: 1, maxWidth: '50%' }}>
              <StoreProductTile product={item} onPress={() => openProduct(item)} />
            </View>
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
              <EmptyState icon={ShoppingBag} title="La tienda está por abrir" message="Muy pronto encontrarás aquí el equipo Finisher Legacy." />
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

function Rail({ title, products, delay }: { title: string; products: ProductSummary[]; delay: number }) {
  return (
    <Reveal delay={delay}>
      <View style={{ gap: spacing.sm }}>
        <SectionHeader title={title} style={{ marginBottom: 0 }} />
        <RailList products={products} />
      </View>
    </Reveal>
  );
}

function RailList({ products }: { products: ProductSummary[] }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      snapToInterval={RAIL_WIDTH + spacing.md}
      style={{ marginHorizontal: -spacing.lg }}
      contentContainerStyle={{ gap: spacing.md, paddingHorizontal: spacing.lg }}>
      {products.map((product) => (
        <StoreProductTile key={product.uuid} product={product} layout="rail" width={RAIL_WIDTH} onPress={() => openProduct(product)} />
      ))}
    </ScrollView>
  );
}
