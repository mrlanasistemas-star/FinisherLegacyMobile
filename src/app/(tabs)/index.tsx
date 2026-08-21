import { Image } from 'expo-image';
import { router } from 'expo-router';
import { CalendarDays, Medal, ScanLine } from 'lucide-react-native';
import { View } from 'react-native';

import { Card } from '@/components/card';
import { AppText } from '@/components/app-text';
import { Screen } from '@/components/screen';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing } from '@/theme/tokens';

export default function HomeScreen() {
  const user = useAuthStore((state) => state.user);

  return (
    <Screen scroll>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.lg }}>
        <View style={{ flex: 1 }}>
          <AppText variant="body" tone="muted">
            Bienvenido de vuelta
          </AppText>
          <AppText variant="title">{user?.first_name ?? 'Atleta'}</AppText>
          {user?.legacy_id ? (
            <AppText variant="caption" tone="gold" style={{ marginTop: spacing.xxs }}>
              Legacy ID · {user.legacy_id}
            </AppText>
          ) : null}
        </View>
        <Image
          source={require('@/assets/images/brand/logo-mark-gold.png')}
          style={{ width: 40, height: 40 }}
          contentFit="contain"
        />
      </View>

      <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
        <Card onPress={() => router.push('/medals')}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Medal color={colors.gold} size={28} />
            <View style={{ flex: 1 }}>
              <AppText variant="subtitle">Tu Legacy Vault</AppText>
              <AppText variant="caption" tone="muted">
                Revisa tu colección de medallas
              </AppText>
            </View>
          </View>
        </Card>

        <Card onPress={() => router.push('/legacy/scan')}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <ScanLine color={colors.gold} size={28} />
            <View style={{ flex: 1 }}>
              <AppText variant="subtitle">Escanear Legacy Code</AppText>
              <AppText variant="caption" tone="muted">
                Reclama la medalla de tu última carrera
              </AppText>
            </View>
          </View>
        </Card>

        <Card onPress={() => router.push('/events')}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <CalendarDays color={colors.gold} size={28} />
            <View style={{ flex: 1 }}>
              <AppText variant="subtitle">Próximos eventos</AppText>
              <AppText variant="caption" tone="muted">
                Descubre y prerregístrate a tu siguiente carrera
              </AppText>
            </View>
          </View>
        </Card>
      </View>
    </Screen>
  );
}
