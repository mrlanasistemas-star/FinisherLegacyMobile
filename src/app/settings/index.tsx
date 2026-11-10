import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Bell, Info, KeyRound, LifeBuoy, LogOut, Mail, Shield, UserPen } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { LanguagePicker } from '@/components/i18n/language-picker';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ListGroup, ListRow } from '@/components/ui/list-row';
import { LargeTitleScroll } from '@/components/ui/top-bar';
import { useLogout } from '@/hooks/use-logout';
import { useProfile } from '@/hooks/use-profile';
import { useI18n } from '@/i18n';
import { useAuthStore } from '@/stores/authStore';
import { spacing } from '@/theme/tokens';

/**
 * Settings is just settings — identity, orders and gear live on the Profile
 * (no duplicates here). Grouped inset lists, iOS-style.
 */
export default function SettingsIndexScreen() {
  const { t } = useI18n();
  const { logout, loading } = useLogout();
  const user = useAuthStore((s) => s.user);
  const profile = useProfile();
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const isPrivate = profile.data?.profile?.profile_visibility === 'private';

  return (
    <View style={{ flex: 1 }}>
      <LargeTitleScroll title={t('Configuración')} contentContainerStyle={{ gap: spacing.lg }}>
        <ListGroup title={t('Cuenta')}>
          <ListRow icon={UserPen} label={t('Editar perfil')} description={user?.email} onPress={() => router.push('/settings/account')} />
          <ListRow icon={KeyRound} label={t('Contraseña y cuenta')} description={t('Cambiar contraseña o eliminar tu cuenta')} onPress={() => router.push('/settings/security')} />
          <ListRow icon={Shield} label={t('Privacidad y bloqueos')} value={isPrivate ? t('Privado') : t('Público')} onPress={() => router.push('/settings/privacy')} />
        </ListGroup>

        <ListGroup title={t('Preferencias')}>
          <ListRow icon={Bell} label={t('Notificaciones')} onPress={() => router.push('/settings/notifications')} />
          <ListRow icon={LifeBuoy} label={t('Mi equipo de apoyo')} description={t('Mensajes de ánimo para tus carreras')} onPress={() => router.push('/support')} />
        </ListGroup>

        {/* Idioma: one row per language the server offers; hidden while there is only one. */}
        <LanguagePicker />

        <ListGroup title={t('Ayuda')}>
          <ListRow icon={Mail} label={t('Escríbenos')} description="hola@finisherlegacy.com" onPress={() => Linking.openURL('mailto:hola@finisherlegacy.com')} />
          <ListRow icon={Info} label={t('Acerca de')} value={`v${version}`} onPress={() => router.push('/settings/about')} />
        </ListGroup>

        <ListGroup>
          <ListRow icon={LogOut} label={t('Cerrar sesión')} destructive onPress={() => setConfirmingLogout(true)} loading={loading} />
        </ListGroup>

        <AppText variant="caption" tone="subtle" align="center">
          Finisher Legacy · v{version}
        </AppText>
      </LargeTitleScroll>

      <ConfirmDialog
        visible={confirmingLogout}
        title={t('¿Cerrar sesión?')}
        description={t('Tendrás que iniciar sesión otra vez para ver tu Legacy.')}
        confirmLabel={t('Cerrar sesión')}
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
