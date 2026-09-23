import { useState } from 'react';

import { AppError } from '@/api/errors';
import { AppButton } from '@/components/app-button';
import { useFollow } from '@/hooks/use-social';
import { showToast } from '@/stores/toastStore';

interface FollowButtonProps {
  username: string;
  isFollowing: boolean;
  /** Name for the confirmation toast ("Listo. Ya sigues a Ana."). */
  firstName?: string;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
}

/** Seguir / Siguiendo — optimistic, reverts with a human message if the server says no. */
export function FollowButton({ username, isFollowing, firstName, size = 'sm', fullWidth = false }: FollowButtonProps) {
  const follow = useFollow(username);
  const [following, setFollowing] = useState(isFollowing);
  const [synced, setSynced] = useState(isFollowing);

  // A refetch upstream (e.g. pull-to-refresh) wins over local state.
  if (isFollowing !== synced) {
    setSynced(isFollowing);
    setFollowing(isFollowing);
  }

  function toggle() {
    const next = !following;
    setFollowing(next);
    follow.mutate(next, {
      onSuccess: () => {
        if (next) showToast(firstName ? `Listo. Ya sigues a ${firstName}.` : 'Listo. Ya lo sigues.', 'success');
      },
      onError: (error) => {
        setFollowing(!next);
        showToast(error instanceof AppError ? error.message : 'No pudimos completar esta acción. Intenta otra vez.', 'destructive');
      },
    });
  }

  return (
    <AppButton
      label={following ? 'Siguiendo' : 'Seguir'}
      variant={following ? 'secondary' : 'primary'}
      size={size}
      fullWidth={fullWidth}
      haptic={false}
      onPress={toggle}
      accessibilityLabel={following ? `Dejar de seguir a ${username}` : `Seguir a ${username}`}
    />
  );
}
