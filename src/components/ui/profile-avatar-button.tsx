import { router } from 'expo-router';

import { PressableScale } from '@/components/motion/pressable-scale';
import { Avatar } from '@/components/ui/avatar';
import { useProfile } from '@/hooks/use-profile';
import { useI18n } from '@/i18n';
import { useAuthStore } from '@/stores/authStore';

/**
 * The avatar every root tab header ends with — Perfil left the tab bar and
 * lives one tap away from here (Inicio · Recuerdos · Comunidad · Colecciones).
 */
export function ProfileAvatarButton() {
  const { t } = useI18n();
  const profile = useProfile();
  const userName = useAuthStore((s) => s.user?.name);

  return (
    <PressableScale
      onPress={() => router.push('/profile')}
      accessibilityRole="button"
      accessibilityLabel={t('Mi perfil')}
      scaleTo={0.92}
      hitSlop={6}
      style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -6 }}>
      <Avatar uri={profile.data?.profile?.profile_photo_url} name={profile.data?.athlete.full_name ?? userName} size={32} />
    </PressableScale>
  );
}
