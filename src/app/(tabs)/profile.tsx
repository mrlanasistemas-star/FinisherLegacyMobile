import { ProfileView } from '@/components/profile/profile-view';
import { useProfile } from '@/hooks/use-profile';

/**
 * Your sporting identity — not a settings menu. Settings live behind the
 * gear icon; orders, notifications and support are reachable from there
 * and from their natural entry points (store, bell, event).
 */
export default function ProfileScreen() {
  const profile = useProfile();
  return <ProfileView username={profile.data?.profile?.username ?? null} own />;
}
