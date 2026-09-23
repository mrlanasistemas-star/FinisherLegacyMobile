import { LinearGradient } from 'expo-linear-gradient';
import { router, Tabs } from 'expo-router';
import { Gem, Home, ScanLine, ShoppingBag, User } from 'lucide-react-native';
import { View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressScale } from '@/components/motion/press-scale';
import { useCartCount } from '@/hooks/use-cart';
import { colors, fontFamily } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';

const TAB_ICON_SIZE = 23;
const BAR_HEIGHT = 58;
const FAB_SIZE = 58;

function TabIcon(Icon: typeof Home) {
  return function renderIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    // tabBarActiveTintColor/InactiveTintColor are plain hex strings.
    return <Icon color={color as string} size={TAB_ICON_SIZE} strokeWidth={focused ? 2.3 : 1.8} />;
  };
}

/**
 * Inicio · Legacy · [SCAN] · Tienda · Perfil. The scanner is the centered
 * gold action — it occupies a real tab slot (so spacing stays even on every
 * width) but never navigates to a tab; it opens the full-screen scanner.
 */
export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const cartCount = useCartCount();

  return (
    <Tabs
      screenListeners={{ tabPress: () => haptics.selection() }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.subtle,
        tabBarLabelStyle: { fontFamily: fontFamily.medium, fontSize: 11, marginTop: 1 },
        tabBarStyle: {
          backgroundColor: 'rgba(10,10,12,0.96)',
          borderTopColor: colors.hairline,
          borderTopWidth: 1,
          height: BAR_HEIGHT + insets.bottom,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 6),
        },
        tabBarItemStyle: { minHeight: 44 },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarIcon: TabIcon(Home), tabBarAccessibilityLabel: 'Inicio' }} />
      <Tabs.Screen name="legacy" options={{ title: 'Legacy', tabBarIcon: TabIcon(Gem), tabBarAccessibilityLabel: 'Tu Legacy: medallas, carreras y recuerdos' }} />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Escanear',
          tabBarButton: () => <ScanButton />,
        }}
      />
      <Tabs.Screen
        name="store"
        options={{
          title: 'Tienda',
          tabBarIcon: TabIcon(ShoppingBag),
          tabBarBadge: cartCount > 0 ? (cartCount > 99 ? '99+' : cartCount) : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.gold, color: colors.black, fontFamily: fontFamily.bold, fontSize: 10 },
          tabBarAccessibilityLabel: cartCount > 0 ? `Tienda, ${cartCount} en el carrito` : 'Tienda',
        }}
      />
      <Tabs.Screen name="profile" options={{ title: 'Perfil', tabBarIcon: TabIcon(User), tabBarAccessibilityLabel: 'Perfil' }} />
    </Tabs>
  );
}

function ScanButton() {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <PressScale
        haptic
        onPress={() => router.push('/legacy/scan')}
        accessibilityRole="button"
        accessibilityLabel="Escanear Legacy Code"
        style={{
          marginTop: -(FAB_SIZE / 2) + 4,
          width: FAB_SIZE,
          height: FAB_SIZE,
          borderRadius: FAB_SIZE / 2,
          borderWidth: 4,
          borderColor: colors.black,
          shadowColor: colors.gold,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 10,
          // Android elevation ignores shadowColor and paints a grey halo on
          // pure black — keep it at 0 there.
          elevation: 0,
        }}>
        <LinearGradient
          colors={[colors.goldSoft, colors.gold]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1, borderRadius: FAB_SIZE / 2, alignItems: 'center', justifyContent: 'center' }}>
          <ScanLine color={colors.black} size={24} strokeWidth={2.2} />
        </LinearGradient>
      </PressScale>
    </View>
  );
}
