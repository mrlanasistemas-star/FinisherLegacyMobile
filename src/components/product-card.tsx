import { Image } from 'expo-image';
import { ShoppingBag } from 'lucide-react-native';
import { memo } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { PressScale } from '@/components/motion/press-scale';
import { colors, fontFamily, spacing } from '@/theme/tokens';
import type { ProductSummary } from '@/types/models';
import { formatMoney } from '@/utils/money';

interface ProductCardProps {
  product: ProductSummary;
  onPress: () => void;
  /** Wide hero tile for the featured product. */
  featured?: boolean;
}

/** Image-first product tile — no box, the product is the design. */
export const ProductCard = memo(function ProductCard({ product, onPress, featured = false }: ProductCardProps) {
  const soldOut = product.in_stock === false;
  const price = product.from_price_minor !== null ? formatMoney(product.from_price_minor, product.currency) : null;

  return (
    <PressScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${product.name}${price ? `, desde ${price}` : ''}${soldOut ? ', agotado' : ''}`}
      style={{ flex: featured ? undefined : 1 }}>
      <View style={{ gap: spacing.xs }}>
        <View style={{ aspectRatio: featured ? 16 / 10 : 4 / 5, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.graphite }}>
          {product.image_url ? (
            <Image
              source={{ uri: product.image_url }}
              style={{ width: '100%', height: '100%', opacity: soldOut ? 0.55 : 1 }}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
              recyclingKey={product.uuid}
            />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingBag size={32} color={colors.goldDim} />
            </View>
          )}
          {soldOut ? (
            <View style={{ position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(10,10,12,0.8)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
              <AppText style={{ fontFamily: fontFamily.semibold, fontSize: 11, color: colors.foreground }}>Agotado</AppText>
            </View>
          ) : null}
        </View>
        <View style={{ gap: 1 }}>
          {product.brand ? (
            <AppText variant="label" tone="gold" numberOfLines={1} style={{ fontSize: 11 }}>
              {product.brand.toUpperCase()}
            </AppText>
          ) : null}
          <AppText style={{ fontFamily: fontFamily.medium, fontSize: featured ? 17 : 14 }} numberOfLines={2}>
            {product.name}
          </AppText>
          {price ? (
            <AppText style={{ fontFamily: fontFamily.semibold, fontSize: featured ? 16 : 14, color: colors.goldSoft }}>
              {product.from_price_minor !== null ? price : ''}
            </AppText>
          ) : null}
        </View>
      </View>
    </PressScale>
  );
});
