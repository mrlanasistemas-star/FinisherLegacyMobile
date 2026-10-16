import { router, type Href } from 'expo-router';
import { Lock, Package, Shirt, Unlock, type LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { colors, fontFamily, radius, spacing } from '@/theme/tokens';

interface Shortcut {
  icon: LucideIcon;
  label: string;
  hint: string;
  href: Href;
}

/**
 * "Mi espacio" on your own profile: the three personal places people
 * actually come back to. Everything else (cuenta, avisos, seguridad, cerrar
 * sesión) lives behind the settings gear.
 */
export function OwnProfileShortcuts({ isPrivate }: { isPrivate: boolean }) {
  const items: Shortcut[] = [
    { icon: Package, label: 'Mis pedidos', hint: 'Estado y entregas', href: '/orders' },
    { icon: Shirt, label: 'Mi equipo', hint: 'Productos conectados', href: '/gear' },
    { icon: isPrivate ? Lock : Unlock, label: 'Privacidad', hint: isPrivate ? 'Perfil privado' : 'Perfil público', href: '/settings/privacy' },
  ];

  return (
    <View style={{ flexDirection: 'row', gap: spacing.xs }}>
      {items.map((item) => (
        <Pressable
          key={item.label}
          onPress={() => router.push(item.href)}
          accessibilityRole="button"
          accessibilityLabel={`${item.label}: ${item.hint}`}
          style={({ pressed }) => ({
            flex: 1,
            minHeight: 76,
            padding: spacing.sm,
            gap: 4,
            borderRadius: radius.lg,
            backgroundColor: pressed ? colors.graphiteLight : colors.graphite,
            borderWidth: 1,
            borderColor: colors.border,
          })}>
          <item.icon size={18} color={colors.gold} />
          <AppText style={{ fontFamily: fontFamily.semibold, fontSize: 13 }} numberOfLines={1}>
            {item.label}
          </AppText>
          <AppText style={{ fontSize: 11, color: colors.subtle }} numberOfLines={1}>
            {item.hint}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}
