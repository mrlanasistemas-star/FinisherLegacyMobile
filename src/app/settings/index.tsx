import Constants from 'expo-constants';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Bell, CircleHelp, Info, KeyRound, LifeBuoy, LogOut, Mail, Receipt, Shield, UserPen } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ListRow } from '@/components/ui/list-row';
import { TopBar } from '@/components/ui/top-bar';
import { useLogout } from '@/hooks/use-logout';
import { useProfile } from '@/hooks/use-profile';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing } from '@/theme/tokens';

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: spacing.lg }}>
      <AppText variant="label" tone="muted" style={{ marginBottom: spacing.xxs }}>
        {title.toUpperCase()}
      </AppText>
      {children}
    </View>
  );
}

/** Settings is just settings — identity lives on the Profile. */
export default function SettingsIndexScreen() {
  const { logout, loading } = useLogout();
  const user = useAuthStore((s) => s.user);
  const profile = useProfile();
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const isPrivate = profile.data?.profile?.profile_visibility === 'private';

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.black }}>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <TopBar title="Configuración" />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }}>
        <Group title="Cuenta">
          <ListRow icon={UserPen} label="Editar perfil" description={user?.email} onPress={() => router.push('/settings/account')} />
          <ListRow icon={Receipt} label="Mis pedidos" onPress={() => router.push('/orders')} />
          <ListRow icon={LifeBuoy} label="Mi equipo de apoyo" description="Mensajes de ánimo para tus carreras" onPress={() => router.push('/support')} divider={false} />
        </Group>

        <Group title="Privacidad">
          <ListRow icon={Shield} label="Privacidad y bloqueos" value={isPrivate ? 'Perfil privado' : 'Perfil público'} onPress={() => router.push('/settings/privacy')} divider={false} />
        </Group>

        <Group title="Notificaciones">
          <ListRow icon={Bell} label="Notificaciones push" onPress={() => router.push('/settings/notifications')} divider={false} />
        </Group>

        <Group title="Seguridad">
          <ListRow icon={KeyRound} label="Contraseña y cuenta" description="Cambiar contraseña o eliminar tu cuenta" onPress={() => router.push('/settings/security')} divider={false} />
        </Group>

        <Group title="Ayuda">
          <ListRow icon={CircleHelp} label="Centro de ayuda" onPress={() => WebBrowser.openBrowserAsync('https://finisherlegacy.com/ayuda')} />
          <ListRow icon={Mail} label="Escríbenos" value="hola@finisherlegacy.com" onPress={() => Linking.openURL('mailto:hola@finisherlegacy.com')} divider={false} />
        </Group>

        <Group title="Acerca de">
          <ListRow icon={Info} label="Acerca de Finisher Legacy" value={`v${version}`} onPress={() => router.push('/settings/about')} divider={false} />
        </Group>

        <View style={{ marginTop: spacing.xl }}>
          <ListRow icon={LogOut} label="Cerrar sesión" destructive onPress={() => setConfirmingLogout(true)} loading={loading} divider={false} />
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={confirmingLogout}
        title="¿Cerrar sesión?"
        description="Tendrás que iniciar sesión otra vez para ver tu Legacy."
        confirmLabel="Cerrar sesión"
        loading={loading}
        onConfirm={async () => {
          await logout();
          setConfirmingLogout(false);
        }}
        onCancel={() => setConfirmingLogout(false)}
      />
    </SafeAreaView>
  );
}
