import { router } from 'expo-router';
import { ChevronRight, FileText, LogOut, Shield, User } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { useLogout } from '@/hooks/use-logout';
import { colors, radius, spacing } from '@/theme/tokens';

export default function SettingsIndexScreen() {
  const { logout, loading } = useLogout();

  return (
    <Screen scroll>
      <ScreenHeader title="Configuración" />

      <View style={{ marginTop: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
        <Row icon={User} label="Cuenta" onPress={() => router.push('/settings/account')} />
        <Divider />
        <Row icon={Shield} label="Privacidad" onPress={() => router.push('/settings/privacy')} />
        <Divider />
        <Row icon={FileText} label="Acerca de" onPress={() => router.push('/settings/about')} />
      </View>

      <View style={{ marginTop: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
        <Row icon={LogOut} label="Cerrar sesión" tone="destructive" onPress={logout} loading={loading} />
      </View>
    </Screen>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.border, marginLeft: spacing.lg + 20 + spacing.md }} />;
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
    <Pressable
      onPress={loading ? undefined : onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, backgroundColor: colors.graphite }}>
      <Icon color={tone === 'destructive' ? colors.destructive : colors.foreground} size={20} />
      <AppText variant="bodyStrong" tone={tone} style={{ flex: 1 }}>
        {label}
      </AppText>
      {!loading && <ChevronRight color={colors.muted} size={18} />}
    </Pressable>
  );
}
