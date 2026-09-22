import { router } from 'expo-router';
import { ShoppingBag, ShoppingCart } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { MascotTip } from '@/components/brand/mascot-tip';
import { SectionTitle } from '@/components/brand/section-title';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { ProductCard } from '@/components/product-card';
import { Screen } from '@/components/screen';
import { Skeleton } from '@/components/skeleton';
import { useCart } from '@/hooks/use-cart';
import { useProducts } from '@/hooks/use-store-products';
import { colors, spacing } from '@/theme/tokens';
import type { ProductSummary } from '@/types/models';

const GRID_GAP = spacing.sm;

export default function StoreScreen() {
  const [category, setCategory] = useState<string | null>(null);
  const { data, isPending, isError, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useProducts(category ? { category } : {});
  const cart = useCart();

  const products = useMemo<ProductSummary[]>(() => data?.pages.flatMap((page) => page.rows) ?? [], [data]);
  const categories = useMemo(() => {
    const seen = new Set<string>();
    for (const product of products) {
      if (product.category) seen.add(product.category);
    }
    return Array.from(seen);
  }, [products]);

  const [featured, ...rest] = products;
  const cartCount = cart.data?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  const header = (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
        }}>
        <View style={{ flex: 1 }}>
          <AppText variant="hero" style={{ fontSize: 40, lineHeight: 40 }}>
            TIENDA
          </AppText>
          <AppText variant="body" tone="muted" style={{ marginTop: spacing.xxs }}>
            Equipo Finisher Legacy
          </AppText>
        </View>

        <Pressable
          onPress={() => router.push('/cart')}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Ver carrito"
          style={{ padding: spacing.xs }}>
          <View>
            <ShoppingCart color={colors.foreground} size={26} />
            {cartCount > 0 ? (
              <View
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  minWidth: 18,
                  height: 18,
                  borderRadius: 9,
                  paddingHorizontal: 4,
                  backgroundColor: colors.gold,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <AppText variant="label" style={{ color: colors.black, fontSize: 10 }}>
                  {cartCount}
                </AppText>
              </View>
            ) : null}
          </View>
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.md }}>
        <MascotTip
          id="store-intro"
          message="Todo lo que conectes con Finisher Legacy seguirá siendo parte de tu historia."
        />
      </View>

      {categories.length > 0 ? (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[null, ...categories]}
          keyExtractor={(item) => item ?? 'all'}
          contentContainerStyle={{ gap: spacing.xs, paddingHorizontal: spacing.lg, marginTop: spacing.md }}
          renderItem={({ item }) => {
            const active = item === category;
            return (
              <Pressable
                onPress={() => setCategory(item)}
                style={{
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.xs,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: active ? colors.gold : colors.border,
                  backgroundColor: active ? 'rgba(201,161,89,0.12)' : 'transparent',
                }}>
                <AppText variant="bodyStrong" tone={active ? 'gold' : 'muted'}>
                  {item ?? 'Todo'}
                </AppText>
              </Pressable>
            );
          }}
        />
      ) : null}

      {featured ? (
        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.lg }}>
          <ProductCard product={featured} featured onPress={() => router.push(`/store/${featured.slug}`)} />
        </View>
      ) : null}

      {rest.length > 0 ? (
        <SectionTitle title="Catálogo" style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.md }} />
      ) : null}
    </View>
  );

  return (
    <Screen edges={['top', 'left', 'right']} padded={false}>
      {isPending ? (
        <View style={{ gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
          <Skeleton height={40} width={200} />
          <Skeleton height={220} radius={16} />
        </View>
      ) : isError ? (
        <ErrorState message="No pudimos cargar la tienda." onRetry={refetch} />
      ) : products.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="Tienda vacía" message="Vuelve pronto para ver el equipo Finisher Legacy." />
      ) : (
        <FlatList
          data={rest}
          numColumns={2}
          keyExtractor={(item) => item.uuid}
          columnWrapperStyle={{ gap: GRID_GAP, paddingHorizontal: spacing.lg }}
          contentContainerStyle={{ gap: GRID_GAP, paddingBottom: spacing.xl }}
          ListHeaderComponent={header}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => hasNextPage && fetchNextPage()}
          ListFooterComponent={isFetchingNextPage ? <Skeleton height={60} style={{ marginHorizontal: spacing.lg }} /> : null}
          renderItem={({ item }) => <ProductCard product={item} onPress={() => router.push(`/store/${item.slug}`)} />}
        />
      )}
    </Screen>
  );
}
