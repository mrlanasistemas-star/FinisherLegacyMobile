import { router } from 'expo-router';
import { ChevronRight, FileText, LogOut, Shield, User } from 'lucide-react-native';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { useLogout } from '@/hooks/use-logout';
import { colors, spacing } from '@/theme/tokens';

export default function SettingsIndexScreen() {
  const { logout, loading } = useLogout();

  return (
    <Screen scroll>
      <ScreenHeader title="Configuración" />

      <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
        <Row icon={User} label="Cuenta" onPress={() => router.push('/settings/account')} />
        <Row icon={Shield} label="Privacidad" onPress={() => router.push('/settings/privacy')} />
        <Row icon={FileText} label="Acerca de" onPress={() => router.push('/settings/about')} />
        <Row icon={LogOut} label="Cerrar sesión" tone="destructive" onPress={logout} loading={loading} />
      </View>
    </Screen>
  );
}

function Row({
  icon: Icon,
  label,
  onPress,
  tone = 'default',
  loading = false,
}: {
  icon: typeof User;
  label: string;
  onPress: () => void;
  tone?: 'default' | 'destructive';
  loading?: boolean;
}) {
  return (
    <Card onPress={loading ? undefined : onPress}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Icon color={tone === 'destructive' ? colors.destructive : colors.foreground} size={20} />
        <AppText variant="bodyStrong" tone={tone} style={{ flex: 1 }}>
          {label}
        </AppText>
        {!loading && <ChevronRight color={colors.muted} size={18} />}
      </View>
    </Card>
  );
}
