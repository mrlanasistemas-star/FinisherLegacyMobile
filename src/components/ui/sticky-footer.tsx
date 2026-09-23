import { LinearGradient } from 'expo-linear-gradient';
import type { PropsWithChildren } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme/tokens';

/**
 * Bottom-pinned CTA area (Agregar al carrito, Continuar al pago, Publicar,
 * Guardar). Respects the home indicator / gesture bar and fades content
 * scrolling underneath instead of cutting it with a hard edge.
 */
export function StickyFooter({ children, withTabBar = false }: PropsWithChildren<{ withTabBar?: boolean }>) {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ position: 'relative' }}>
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(10,10,12,0)', colors.black]}
        style={{ position: 'absolute', top: -24, left: 0, right: 0, height: 24 }}
      />
      <View
        style={{
          backgroundColor: colors.black,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm,
          paddingBottom: withTabBar ? spacing.sm : Math.max(insets.bottom, spacing.sm) + spacing.xs,
          gap: spacing.xs,
        }}>
        {children}
      </View>
    </View>
  );
}
