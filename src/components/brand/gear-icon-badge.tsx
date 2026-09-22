import { CreditCard, Footprints, Package, Shirt, Watch } from 'lucide-react-native';
import { View, type ViewStyle } from 'react-native';

import { colors, radius } from '@/theme/tokens';

/**
 * `AthleteOwnedProductResource` has no `image_url` field (confirmed reading
 * the backend Resource) — gear cards can never show a real product photo.
 * This maps the free-text product name to a representative icon instead of
 * faking a photo. `product_name` is not a strict enum on the backend, so
 * this is a best-effort heuristic, not a catalog. Returns the icon element
 * directly (rather than a component reference rendered as `<Icon/>`) so the
 * react-compiler lint rule never sees a component "created during render".
 */
function renderProductIcon(productName: string, size: number) {
  const name = productName.toLowerCase();
  const props = { color: colors.gold, size, strokeWidth: 1.6 };

  if (name.includes('placa') || name.includes('plate')) return <CreditCard {...props} />;
  if (name.includes('trisuit') || name.includes('traje')) return <Shirt {...props} />;
  if (name.includes('calcet') || name.includes('sock')) return <Footprints {...props} />;
  if (name.includes('band') || name.includes('banda') || name.includes('chill')) return <Watch {...props} />;
  if (name.includes('pack') || name.includes('racepack')) return <Package {...props} />;
  return <Shirt {...props} />;
}

interface GearIconBadgeProps {
  productName: string;
  size?: number;
  style?: ViewStyle;
}

export function GearIconBadge({ productName, size = 56, style }: GearIconBadgeProps) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius.lg,
          backgroundColor: colors.graphiteLight,
          borderWidth: 1,
          borderColor: colors.goldDim,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}>
      {renderProductIcon(productName, size * 0.45)}
    </View>
  );
}
