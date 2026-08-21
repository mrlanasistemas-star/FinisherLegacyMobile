import * as Haptics from 'expo-haptics';
import { router, Tabs } from 'expo-router';
import { CalendarDays, Home, Medal, ScanLine, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, type ColorValue } from 'react-native';

import { PressScale } from '@/components/motion/press-scale';
import { colors, radius, shadows, spacing } from '@/theme/tokens';

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
          backgroundColor: colors.gold,
          alignItems: 'center',
          justifyContent: 'center',
          ...shadows.gold,
        }}>
        <ScanLine color={colors.black} size={26} strokeWidth={2.2} />
      </PressScale>
    </View>
  );
}
