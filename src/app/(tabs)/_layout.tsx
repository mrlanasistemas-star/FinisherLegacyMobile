import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Tabs } from 'expo-router';
import { CalendarDays, Home, Medal, ScanLine, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, type ColorValue } from 'react-native';

import { PressScale } from '@/components/motion/press-scale';
import { colors, radius, spacing } from '@/theme/tokens';

const TAB_ICON_SIZE = 22;

function TabIcon(Icon: typeof Home) {
  return function renderIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return (
      <View style={{ alignItems: 'center', gap: 4 }}>
        {/* tabBarActiveTintColor/tabBarInactiveTintColor are always set to
            plain hex strings above, never a dynamic OpaqueColorValue. */}
        <Icon color={color as string} size={TAB_ICON_SIZE} strokeWidth={focused ? 2.4 : 1.8} />
        <View
          style={{
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: focused ? colors.gold : 'transparent',
          }}
        />
      </View>
    );
  };
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenListeners={{
          tabPress: () => {
            Haptics.selectionAsync().catch(() => {});
          },
        }}
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.gold,
          tabBarInactiveTintColor: colors.muted,
          tabBarShowLabel: false,
          tabBarStyle: {
            backgroundColor: 'rgba(10,10,12,0.92)',
            borderTopColor: colors.border,
            borderTopWidth: 1,
            height: 56 + insets.bottom,
            paddingTop: spacing.sm,
          },
        }}>
        <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarIcon: TabIcon(Home) }} />
        <Tabs.Screen name="medals" options={{ title: 'Medallas', tabBarIcon: TabIcon(Medal) }} />
        <Tabs.Screen name="events" options={{ title: 'Eventos', tabBarIcon: TabIcon(CalendarDays) }} />
        <Tabs.Screen name="profile" options={{ title: 'Perfil', tabBarIcon: TabIcon(User) }} />
      </Tabs>

      <PressScale
        haptic
        onPress={() => router.push('/legacy/scan')}
        accessibilityRole="button"
        accessibilityLabel="Escanear Legacy Code"
        style={{
          position: 'absolute',
          bottom: 56 + insets.bottom - 26,
          alignSelf: 'center',
          width: 56,
          height: 56,
          borderRadius: radius.pill,
          shadowColor: colors.gold,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.45,
          shadowRadius: 10,
          // 0, not shadows.gold's default: Android elevation ignores
          // shadowColor and paints a flat grey halo over pure black, which
          // read as a dirty smudge around the gold circle.
          elevation: 0,
        }}>
        {/* Gradient fill, not a flat color, so the gold never renders as a
            flat gray/dark disc against the black tab bar. */}
        <LinearGradient
          colors={[colors.goldSoft, colors.gold]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: 56, height: 56, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' }}>
          <ScanLine color={colors.black} size={26} strokeWidth={2.2} />
        </LinearGradient>
      </PressScale>
    </View>
  );
}
