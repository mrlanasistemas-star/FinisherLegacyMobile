import { Image } from 'expo-image';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { PressScale } from '@/components/motion/press-scale';
import { colors, radius, shadows, spacing } from '@/theme/tokens';
import { formatMoney } from '@/utils/money';
import type { ProductSummary } from '@/types/models';

interface ProductCardProps {
  product: ProductSummary;
  onPress: () => void;
  featured?: boolean;
}

export function ProductCard({ product, onPress, featured = false }: ProductCardProps) {
  return (
    <PressScale onPress={onPress} haptic style={{ flex: featured ? undefined : 1 }}>
      <View
        style={{
          borderRadius: radius.lg,
          overflow: 'hidden',
          backgroundColor: colors.graphite,
          borderWidth: 1,
          borderColor: colors.border,
          ...shadows.card,
        }}>
        <View style={{ aspectRatio: featured ? 16 / 10 : 1, backgroundColor: colors.graphiteLight }}>
          {product.image_url ? (
            <Image source={{ uri: product.image_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} />
          ) : null}
        </View>

        <View style={{ padding: spacing.sm, gap: 2 }}>
          {product.brand ? (
            <AppText variant="label" tone="gold" numberOfLines={1}>
              {product.brand.toUpperCase()}
            </AppText>
          ) : null}
          <AppText variant="bodyStrong" numberOfLines={2}>
            {product.name}
          </AppText>
          {product.from_price_minor !== null ? (
            <AppText variant="body" tone="muted">
              Desde {formatMoney(product.from_price_minor, product.currency)}
            </AppText>
          ) : null}
        </View>
      </View>
    </PressScale>
  );
}
