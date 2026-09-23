import { Redirect, useLocalSearchParams } from 'expo-router';

import { ProfileView } from '@/components/profile/profile-view';
import { useProfile } from '@/hooks/use-profile';

/** Another athlete's public Legacy — or your own tab if the link points to you. */
export default function PublicAthleteScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const myUsername = useProfile().data?.profile?.username;

  if (myUsername && username && myUsername.toLowerCase() === username.toLowerCase()) {
    return <Redirect href="/profile" />;
  }

  return <ProfileView username={username ?? null} own={false} />;
}
