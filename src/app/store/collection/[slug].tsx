import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, ShoppingBag, ShoppingCart } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Animated, { FadeInDown, useAnimatedReaction, useReducedMotion } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { BrandRefreshControl } from '@/components/motion/brand-refresh-control';
import { StaggerItem } from '@/components/motion/reveal';
import { ScrollHeader, useParallax, useScrollY } from '@/components/motion/scroll-header';
import { Skeleton } from '@/components/skeleton';
import { IconButton } from '@/components/ui/icon-button';
import { SectionHeader } from '@/components/ui/section-header';
import { StoreProductTile } from '@/features/commerce/components/store-product-tile';
import { DesignChips, Grouped, HowItWorksStrip, TagHero } from '@/features/commerce/components/tag-detail-parts';
import { tagFaceFrom } from '@/features/commerce/tag-design';
import { useCartCount } from '@/hooks/use-cart';
import { useCollection } from '@/hooks/use-store-products';
import { useI18n } from '@/i18n';
import { colors, motion, radius, spacing } from '@/theme/tokens';

const NAV_HEIGHT = 52;
const GRID_GAP = spacing.md;

/**
 * One Finisher Legacy Tag collection (`GET /store/collections/{slug}`):
 * the drawn tag (chips switch between its designs, the art crossfades),
 * its story and the pieces you can buy. Only what the API returns.
 */
export default function CollectionScreen() {
  const { t } = useI18n();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: collection, isPending, isError, error, refetch, isRefetching } = useCollection(slug);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const cartCount = useCartCount();
  const { scrollY, onScroll } = useScrollY();
  const [designSlug, setDesignSlug] = useState<string | null>(null);

  const heroHeight = Math.min(Math.round(width * 1.2), 560) + insets.top;
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
  const designs = collection?.tag_designs ?? [];
  const selected = designs.find((d) => d.slug === designSlug) ?? designs[0] ?? null;
  const design = selected?.design ?? collection?.tag_design ?? null;
  const face = useMemo(
    () => tagFaceFrom(design, { name: collection?.destination ?? collection?.name, discipline: collection?.discipline }),
    [design, collection?.destination, collection?.name, collection?.discipline],
  );

  if (isPending) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Skeleton height={heroHeight} radius={0} />
        <View style={{ padding: spacing.lg, gap: spacing.sm }}>
          <Skeleton height={14} width="30%" />
          <Skeleton height={28} width="70%" />
          <View style={{ flexDirection: 'row', gap: GRID_GAP, marginTop: spacing.md }}>
            <Skeleton height={200} radius={16} style={{ flex: 1 }} />
            <Skeleton height={200} radius={16} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    );
  }

  if (isError || !collection) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        <IconButton icon={ChevronLeft} label={t('Volver')} onPress={() => router.back()} size={26} />
        <ErrorState error={error} message={t('No pudimos cargar esta colección.')} onRetry={refetch} />
      </View>
    );
  }

  const eyebrow = [collection.discipline, collection.destination, collection.year].filter(Boolean).join(' · ');
  const rows = collection.products;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.xl }}
        refreshControl={<BrandRefreshControl refreshing={isRefetching} onRefresh={refetch} progressViewOffset={insets.top + NAV_HEIGHT} />}>
        <Animated.View style={[{ overflow: 'hidden' }, reduceMotion ? null : parallax]}>
          <TagHero face={face} accent={design?.accent ?? null} topInset={insets.top + NAV_HEIGHT} height={heroHeight} />
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
            {eyebrow ? <AppText variant="eyebrow">{eyebrow}</AppText> : null}
            <AppText variant="title" style={{ fontSize: 26 }} accessibilityRole="header">
              {collection.name}
            </AppText>
            {collection.tagline ? (
              <AppText variant="body" tone="muted">
                {collection.tagline}
              </AppText>
            ) : null}
          </View>

          <DesignChips
            label={selected ? t('Diseño: {name}', { name: selected.name }) : t('Diseños')}
            options={designs.map((d) => ({ value: d.slug, label: d.name }))}
            value={selected?.slug ?? ''}
            onChange={setDesignSlug}
          />

          {collection.description ? (
            <Grouped title={t('La colección')}>
              <AppText variant="body" tone="muted" style={{ lineHeight: 23 }}>
                {collection.description}
              </AppText>
            </Grouped>
          ) : null}

          <HowItWorksStrip />

          <View style={{ gap: spacing.md }}>
            <SectionHeader title={rows.length > 0 ? t('Piezas ({count})', { count: rows.length }) : t('Piezas')} style={{ marginBottom: 0 }} />
            {rows.length === 0 ? (
              <EmptyState compact icon={ShoppingBag} title={t('Aún no hay piezas a la venta')} message={t('Cuando esta colección publique piezas aparecerán aquí.')} />
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP }}>
                {rows.map((product, index) => (
                  <StaggerItem key={product.uuid} index={index} style={{ width: (width - spacing.lg * 2 - GRID_GAP) / 2 }}>
                    <StoreProductTile product={product} onPress={() => router.push(`/store/${product.slug}`)} />
                  </StaggerItem>
                ))}
              </View>
            )}
          </View>
        </Animated.View>
      </Animated.ScrollView>

      <ScrollHeader
        scrollY={scrollY}
        title={collection.name}
        threshold={heroHeight - 100}
        left={<IconButton icon={ChevronLeft} label={t('Volver')} onPress={() => router.back()} filled={overHero} size={24} />}
        right={<IconButton icon={ShoppingCart} label={t('Carrito')} badge={cartCount} onPress={() => router.push('/cart')} filled={overHero} size={20} />}
      />
    </View>
  );
}
