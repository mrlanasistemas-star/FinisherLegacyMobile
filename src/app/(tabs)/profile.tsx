import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ChevronRight, LogOut, Settings, User as UserIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { Skeleton } from '@/components/skeleton';
import { useLogout } from '@/hooks/use-logout';
import { useProfile } from '@/hooks/use-profile';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing } from '@/theme/tokens';

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const { data: profile, isPending } = useProfile();
  const { logout, loading } = useLogout();

  return (
    <Screen scroll>
      <View style={{ alignItems: 'center', marginTop: spacing.xl, gap: spacing.sm }}>
        <View
          style={{
            width: 88,
            height: 88,
            borderRadius: 44,
            backgroundColor: colors.graphite,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            borderWidth: 2,
            borderColor: colors.gold,
          }}>
          {profile?.profile_photo_url ? (
            <Image source={{ uri: profile.profile_photo_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          ) : (
            <UserIcon color={colors.muted} size={36} />
          )}
        </View>

        <AppText variant="title">
          {user?.first_name} {user?.last_name}
        </AppText>
        {isPending ? (
          <Skeleton width={120} height={14} />
        ) : profile?.username ? (
          <AppText variant="body" tone="muted">
            @{profile.username}
          </AppText>
        ) : (
          <AppText variant="caption" tone="muted">
            Aún no configuras tu perfil público
          </AppText>
        )}
        {user?.legacy_id ? (
          <AppText variant="caption" tone="gold">
            Legacy ID · {user.legacy_id}
          </AppText>
        ) : null}
      </View>

      <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
        <MenuRow icon={UserIcon} label="Editar perfil" onPress={() => router.push('/settings/account')} />
        <MenuRow icon={Settings} label="Configuración" onPress={() => router.push('/settings')} />
        <MenuRow icon={LogOut} label="Cerrar sesión" tone="destructive" onPress={logout} loading={loading} />
      </View>
    </Screen>
  );
}

function MenuRow({
  icon: Icon,
  label,
  onPress,
  tone = 'default',
  loading = false,
}: {
  icon: typeof UserIcon;
  label: string;
  onPress: () => void;
  tone?: 'default' | 'destructive';
  loading?: boolean;
}) {
  return (
    <Card onPress={loading ? undefined : onPress} style={{ paddingVertical: spacing.md }}>
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
