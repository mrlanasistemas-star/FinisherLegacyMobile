import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router';
import { Compass, Gem, Home, ShoppingBag, User } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, View, type AccessibilityState, type ColorValue, type GestureResponderEvent } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { useCartCount } from '@/hooks/use-cart';
import { colors, fontFamily } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';

const TAB_ICON_SIZE = 23;
const BAR_HEIGHT = 58;
const LEGADO_SIZE = 56;

function TabIcon(Icon: typeof Home) {
  return function renderIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    // tabBarActiveTintColor/InactiveTintColor are plain hex strings.
    return <Icon color={color as string} size={TAB_ICON_SIZE} strokeWidth={focused ? 2.3 : 1.8} />;
  };
}

/**
 * Inicio · Explorar · LEGADO · Tienda · Perfil (spec §135). Legado is the
 * heart of the app, so it sits in the center as a raised gold medallion —
 * a real tab (state, back behavior, deep links), not a floating action.
 * No scanner anywhere: physical products open the app by NFC deep link.
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
          backgroundColor: 'rgba(10,10,12,0.97)',
          borderTopColor: colors.hairline,
          borderTopWidth: 1,
          height: BAR_HEIGHT + insets.bottom,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 6),
        },
        tabBarItemStyle: { minHeight: 44 },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarIcon: TabIcon(Home), tabBarAccessibilityLabel: 'Inicio' }} />
      <Tabs.Screen
        name="explore"
        options={{ title: 'Explorar', tabBarIcon: TabIcon(Compass), tabBarAccessibilityLabel: 'Explorar: comunidad, atletas y eventos' }}
      />
      <Tabs.Screen
        name="legacy"
        options={{
          title: 'Legado',
          tabBarAccessibilityLabel: 'Legado: tu historia, carreras y equipo',
          tabBarButton: (props) => <LegadoTabButton {...props} />,
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

interface LegadoTabButtonProps {
  onPress?: (event: GestureResponderEvent) => void;
  onLongPress?: ((event: GestureResponderEvent) => void) | null;
  accessibilityState?: AccessibilityState;
  accessibilityLabel?: string;
  testID?: string;
}

/**
 * Raised medallion for the center tab. Focus is shown three ways (lift,
 * filled gold face, gold label) so it never relies on color alone.
 */
function LegadoTabButton({ onPress, onLongPress, accessibilityState, accessibilityLabel, testID }: LegadoTabButtonProps) {
  const focused = !!accessibilityState?.selected;
  const reduceMotion = useReducedMotion();
  const lift = useSharedValue(focused ? 1 : 0);
  const press = useSharedValue(1);

  useEffect(() => {
    lift.value = reduceMotion ? (focused ? 1 : 0) : withTiming(focused ? 1 : 0, { duration: 220 });
  }, [focused, lift, reduceMotion]);

  const medallionStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -lift.value * 3 }, { scale: press.value }],
    shadowOpacity: 0.22 + lift.value * 0.3,
  }));

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress ?? undefined}
      onPressIn={() => {
        // eslint-disable-next-line react-hooks/immutability
        press.value = withSpring(0.92, { damping: 18, stiffness: 320 });
      }}
      onPressOut={() => {
        // eslint-disable-next-line react-hooks/immutability
        press.value = withSpring(1, { damping: 14, stiffness: 260 });
      }}
      accessibilityRole="tab"
      accessibilityState={accessibilityState}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={{ flex: 1, alignItems: 'center' }}>
      <Animated.View
        style={[
          {
            marginTop: -(LEGADO_SIZE / 2) + 6,
            width: LEGADO_SIZE,
            height: LEGADO_SIZE,
            borderRadius: LEGADO_SIZE / 2,
            borderWidth: 4,
            borderColor: colors.black,
            shadowColor: colors.gold,
            shadowOffset: { width: 0, height: 4 },
            shadowRadius: 12,
            // Android elevation ignores shadowColor and paints a grey halo on black.
            elevation: 0,
          },
          medallionStyle,
        ]}>
        <LinearGradient
          colors={focused ? [colors.goldSoft, colors.gold] : [colors.graphiteLight, colors.graphite]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            flex: 1,
            borderRadius: LEGADO_SIZE / 2,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: focused ? colors.goldSoft : colors.goldDim,
          }}>
          <Gem color={focused ? colors.black : colors.goldSoft} size={24} strokeWidth={2.1} />
        </LinearGradient>
      </Animated.View>
      <View style={{ marginTop: 1 }}>
        <AppText style={{ fontFamily: fontFamily.semibold, fontSize: 11, color: focused ? colors.gold : colors.goldDim }}>Legado</AppText>
      </View>
    </Pressable>
  );
}
