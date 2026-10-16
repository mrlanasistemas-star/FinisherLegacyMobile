import { Image } from 'expo-image';
import { ShoppingBag } from 'lucide-react-native';
import { memo } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { PressScale } from '@/components/motion/press-scale';
import { colors, fontFamily, spacing } from '@/theme/tokens';
import type { ProductSummary } from '@/types/models';
import { formatMoney } from '@/utils/money';

import { isConnectedProduct } from '../variant-options';
import { NfcBadge } from './product-story';

interface StoreProductTileProps {
  product: ProductSummary;
  onPress: () => void;
  width?: number;
  /** 'hero' = wide editorial tile; 'rail' = fixed-width horizontal card; 'grid' = flexible. */
  layout?: 'hero' | 'rail' | 'grid';
}

/** Image-first product card with the badges that matter (NFC, Nuevo, Últimas piezas, Agotado). */
export const StoreProductTile = memo(function StoreProductTile({ product, onPress, width, layout = 'grid' }: StoreProductTileProps) {
  const soldOut = product.in_stock === false || product.stock_status === 'sold_out';
  const low = !soldOut && product.stock_status === 'low';
  const connected = isConnectedProduct(product);
  const price = product.from_price_minor !== null ? formatMoney(product.from_price_minor, product.currency) : null;
  const hero = layout === 'hero';

  const label = [product.name, price ? `desde ${price}` : null, connected ? 'producto conectado' : null, soldOut ? 'agotado' : low ? 'últimas piezas' : null]
    .filter(Boolean)
    .join(', ');

  return (
    <PressScale onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={{ width, flex: layout === 'grid' ? 1 : undefined }}>
      <View style={{ gap: spacing.xs }}>
        <View style={{ aspectRatio: hero ? 4 / 3 : 4 / 5, borderRadius: hero ? 20 : 16, overflow: 'hidden', backgroundColor: colors.graphite }}>
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
          <View style={{ position: 'absolute', top: 8, left: 8, right: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {connected ? <NfcBadge floating /> : null}
            {soldOut ? <Pill label="Agotado" /> : low ? <Pill label="Últimas piezas" gold /> : product.is_new ? <Pill label="Nuevo" gold /> : null}
          </View>
        </View>
        <View style={{ gap: 1 }}>
          {product.category || product.brand ? (
            <AppText variant="label" tone="gold" numberOfLines={1} style={{ fontSize: 11 }}>
              {(product.category ?? product.brand ?? '').toUpperCase()}
            </AppText>
          ) : null}
          <AppText style={{ fontFamily: fontFamily.medium, fontSize: hero ? 18 : 14 }} numberOfLines={2}>
            {product.name}
          </AppText>
          {price ? (
            <AppText style={{ fontFamily: fontFamily.semibold, fontSize: hero ? 16 : 14, color: colors.goldSoft }}>
              {product.from_price_minor !== null ? price : ''}
            </AppText>
          ) : null}
        </View>
      </View>
    </PressScale>
  );
});

function Pill({ label, gold = false }: { label: string; gold?: boolean }) {
  return (
    <View style={{ backgroundColor: 'rgba(10,10,12,0.78)', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4, borderWidth: gold ? 1 : 0, borderColor: colors.goldDim }}>
      <AppText style={{ fontFamily: fontFamily.semibold, fontSize: 11, color: gold ? colors.gold : colors.foreground }}>{label}</AppText>
    </View>
  );
}
