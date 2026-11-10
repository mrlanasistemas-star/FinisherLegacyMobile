import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { ShoppingBag } from 'lucide-react-native';
import { View } from 'react-native';

import { fetchProduct } from '@/api/storeProducts';
import { TagRender, TagStage } from '@/components/tag';
import { queryKeys } from '@/hooks/query-keys';
import { colors } from '@/theme/tokens';
import type { CartItem } from '@/types/models';

import { isTagProduct, tagFaceFrom } from '../tag-design';

interface CartItemThumbProps {
  item: Pick<CartItem, 'product_slug' | 'product_name' | 'variant_name' | 'image_url' | 'product_type' | 'tag_design'>;
  width: number;
  height: number;
  radius?: number;
}

/**
 * Cart/checkout line thumbnail. Finisher Legacy Tags show their drawn tag
 * (the same art as the store); the design comes from the item when the
 * server sends it, else from the product detail (shared, cached query).
 * Visual only — prices and payment never read from here.
 */
export function CartItemThumb({ item, width, height, radius = 12 }: CartItemThumbProps) {
  const itemIsTag = item.product_type === 'legacy_tag' || item.tag_design != null;
  const { data: product } = useQuery({
    queryKey: queryKeys.product(item.product_slug),
    queryFn: () => fetchProduct(item.product_slug),
    enabled: !itemIsTag && !!item.product_slug,
    staleTime: 5 * 60_000,
  });

  const variant = product?.variants.find((v) => v.name === item.variant_name);
  const design = item.tag_design ?? variant?.tag_design ?? product?.tag_design ?? null;
  const tag = itemIsTag || isTagProduct(product);
  const frame = { width, height, borderRadius: radius, borderCurve: 'continuous' as const, overflow: 'hidden' as const };

  if (tag) {
    const face = tagFaceFrom(design, { name: product?.name ?? item.product_name });
    return (
      <TagStage accent={face.accent} style={[frame, { alignItems: 'center', justifyContent: 'center' }]}>
        <TagRender face={face} width={Math.round(Math.min(width * 0.42, (height * 0.86) / 2.3))} shadow={false} />
      </TagStage>
    );
  }

  return (
    <View style={[frame, { backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' }]}>
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" cachePolicy="memory-disk" />
      ) : (
        <ShoppingBag size={Math.min(24, width * 0.4)} color={colors.accent} strokeWidth={1.5} />
      )}
    </View>
  );
}
