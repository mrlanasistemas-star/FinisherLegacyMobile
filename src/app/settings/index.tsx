import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Bell, Info, KeyRound, LifeBuoy, LogOut, Mail, Shield, UserPen } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ListGroup, ListRow } from '@/components/ui/list-row';
import { LargeTitleScroll } from '@/components/ui/top-bar';
import { useLogout } from '@/hooks/use-logout';
import { useProfile } from '@/hooks/use-profile';
import { useAuthStore } from '@/stores/authStore';
import { spacing } from '@/theme/tokens';

/**
 * Settings is just settings — identity, orders and gear live on the Profile
 * (no duplicates here). Grouped inset lists, iOS-style.
 */
export default function SettingsIndexScreen() {
  const { logout, loading } = useLogout();
  const user = useAuthStore((s) => s.user);
  const profile = useProfile();
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const isPrivate = profile.data?.profile?.profile_visibility === 'private';

  return (
    <View style={{ flex: 1 }}>
      <LargeTitleScroll title="Configuración" contentContainerStyle={{ gap: spacing.lg }}>
        <ListGroup title="Cuenta">
          <ListRow icon={UserPen} label="Editar perfil" description={user?.email} onPress={() => router.push('/settings/account')} />
          <ListRow icon={KeyRound} label="Contraseña y cuenta" description="Cambiar contraseña o eliminar tu cuenta" onPress={() => router.push('/settings/security')} />
          <ListRow icon={Shield} label="Privacidad y bloqueos" value={isPrivate ? 'Privado' : 'Público'} onPress={() => router.push('/settings/privacy')} />
        </ListGroup>

        <ListGroup title="Preferencias">
          <ListRow icon={Bell} label="Notificaciones" onPress={() => router.push('/settings/notifications')} />
          <ListRow icon={LifeBuoy} label="Mi equipo de apoyo" description="Mensajes de ánimo para tus carreras" onPress={() => router.push('/support')} />
        </ListGroup>

        <ListGroup title="Ayuda">
          <ListRow icon={Mail} label="Escríbenos" description="hola@finisherlegacy.com" onPress={() => Linking.openURL('mailto:hola@finisherlegacy.com')} />
          <ListRow icon={Info} label="Acerca de" value={`v${version}`} onPress={() => router.push('/settings/about')} />
        </ListGroup>

        <ListGroup>
          <ListRow icon={LogOut} label="Cerrar sesión" destructive onPress={() => setConfirmingLogout(true)} loading={loading} />
        </ListGroup>

        <AppText variant="caption" tone="subtle" align="center">
          Finisher Legacy · v{version}
        </AppText>
      </LargeTitleScroll>

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
    </View>
  );
}
