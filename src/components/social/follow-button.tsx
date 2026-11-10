import { useState } from 'react';

import { AppError } from '@/api/errors';
import { AppButton } from '@/components/app-button';
import { useFollow } from '@/hooks/use-social';
import { showToast } from '@/stores/toastStore';
import { useI18n } from '@/i18n';

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
  const { t } = useI18n();
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
        if (next) showToast(firstName ? t('Listo. Ya sigues a {name}.', { name: firstName }) : t('Listo. Ya lo sigues.'), 'success');
      },
      onError: (error) => {
        setFollowing(!next);
        showToast(error instanceof AppError ? error.message : t('No pudimos completar esta acción. Intenta otra vez.'), 'destructive');
      },
    });
  }

  return (
    <AppButton
      label={following ? t('Siguiendo') : t('Seguir')}
      variant={following ? 'secondary' : 'primary'}
      size={size}
      fullWidth={fullWidth}
      haptic={false}
      onPress={toggle}
      accessibilityLabel={following ? t('Dejar de seguir a {username}', { username }) : t('Seguir a {username}', { username })}
    />
  );
}
