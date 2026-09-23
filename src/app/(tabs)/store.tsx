import { router } from 'expo-router';
import { Receipt, ShoppingBag, ShoppingCart } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { FormInput } from '@/components/form-input';
import { ProductCard } from '@/components/product-card';
import { Skeleton } from '@/components/skeleton';
import { Chip } from '@/components/ui/chip';
import { IconButton } from '@/components/ui/icon-button';
import { SectionHeader } from '@/components/ui/section-header';
import { useCartCount } from '@/hooks/use-cart';
import { useDebouncedValue } from '@/hooks/use-social';
import { useProducts } from '@/hooks/use-store-products';
import { colors, spacing } from '@/theme/tokens';
import type { ProductCategoryOption, ProductSummary } from '@/types/models';

const GRID_GAP = spacing.md;

/**
 * Tienda: search, category chips, the newest drop up top, then the grid.
 * The cart is always one tap away (with its count).
 */
export default function StoreScreen() {
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search.trim(), 400);
  const filtering = !!category || q.length >= 2;
  const cartCount = useCartCount();

  const products = useProducts({ ...(category ? { category } : {}), ...(q.length >= 2 ? { q } : {}), sort: 'newest' });
  const rows = useMemo<ProductSummary[]>(() => products.data?.pages.flatMap((page) => page.rows) ?? [], [products.data]);
  // Global list (independent of the active filter) — `placeholderData`
  // keeps it on screen while a new filter loads.
  const categories: ProductCategoryOption[] = products.data?.pages[0]?.categories ?? [];

  const featured = !filtering ? rows[0] : undefined;
  const grid = featured ? rows.slice(1) : rows;

  const header = (
    <View style={{ gap: spacing.md, paddingBottom: spacing.md }}>
      <FormInput kind="search" placeholder="Buscar en la tienda" value={search} onChangeText={setSearch} accessibilityLabel="Buscar productos" />

      {categories.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -spacing.lg }} contentContainerStyle={{ gap: spacing.xs, paddingHorizontal: spacing.lg }}>
          <Chip label="Todo" selected={category === null} onPress={() => setCategory(null)} />
          {categories.map((item) => (
            <Chip key={item.slug} label={item.name} selected={category === item.slug} onPress={() => setCategory(item.slug)} />
          ))}
        </ScrollView>
      ) : null}

      {featured ? (
        <View style={{ gap: spacing.sm }}>
          <SectionHeader title="Lo más nuevo" style={{ marginBottom: 0 }} />
          <ProductCard product={featured} featured onPress={() => router.push(`/store/${featured.slug}`)} />
        </View>
      ) : null}

      {grid.length > 0 ? <SectionHeader title={filtering ? `${products.data?.pages[0]?.total ?? grid.length} resultados` : 'Catálogo'} style={{ marginBottom: 0 }} /> : null}
    </View>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.black }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.sm }}>
        <AppText variant="hero" style={{ fontSize: 38, lineHeight: 40, flex: 1 }} accessibilityRole="header">
          TIENDA
        </AppText>
        <IconButton icon={Receipt} label="Mis pedidos" onPress={() => router.push('/orders')} />
        <IconButton icon={ShoppingCart} label="Carrito" badge={cartCount} onPress={() => router.push('/cart')} style={{ marginRight: -10 }} />
      </View>

      {products.isPending && !products.data ? (
        <View style={{ gap: spacing.md, paddingHorizontal: spacing.lg }}>
          <Skeleton height={48} />
          <Skeleton height={220} radius={16} />
          <View style={{ flexDirection: 'row', gap: GRID_GAP }}>
            <Skeleton height={200} radius={16} style={{ flex: 1 }} />
            <Skeleton height={200} radius={16} style={{ flex: 1 }} />
          </View>
        </View>
      ) : products.isError && !products.data ? (
        <ErrorState error={products.error} message="No pudimos cargar la tienda." onRetry={products.refetch} />
      ) : (
        <FlatList
          data={grid}
          numColumns={2}
          keyExtractor={(item) => item.uuid}
          columnWrapperStyle={{ gap: GRID_GAP }}
          contentContainerStyle={{ gap: spacing.lg, paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, flexGrow: 1 }}
          ListHeaderComponent={header}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={<RefreshControl refreshing={products.isRefetching && !products.isFetchingNextPage} onRefresh={products.refetch} tintColor={colors.gold} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => products.hasNextPage && !products.isFetchingNextPage && products.fetchNextPage()}
          ListFooterComponent={products.isFetchingNextPage ? <Skeleton height={200} radius={16} /> : null}
          renderItem={({ item }) => (
            <View style={{ flex: 1, maxWidth: '50%' }}>
              <ProductCard product={item} onPress={() => router.push(`/store/${item.slug}`)} />
            </View>
          )}
          ListEmptyComponent={
            featured ? null : filtering ? (
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
