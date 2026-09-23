import { router } from 'expo-router';
import { memo } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { FollowButton } from '@/components/social/follow-button';
import { Avatar } from '@/components/ui/avatar';
import { useProfile } from '@/hooks/use-profile';
import { colors, fontFamily, spacing } from '@/theme/tokens';
import type { AthleteSummary } from '@/types/social';

interface AthleteRowProps {
  athlete: AthleteSummary;
  showFollow?: boolean;
  trailing?: React.ReactNode;
}

/** Avatar + name + @username (+ city) + Seguir — followers, following, search, explore. */
export const AthleteRow = memo(function AthleteRow({ athlete, showFollow = true, trailing }: AthleteRowProps) {
  const myUsername = useProfile().data?.profile?.username;
  const username = athlete.username;
  const isMe = !!username && username === myUsername;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 10 }}>
      <Pressable
        onPress={() => username && router.push(`/athlete/${username}`)}
        disabled={!username}
        accessibilityRole="button"
        accessibilityLabel={`Ver perfil de ${athlete.name}`}
        style={({ pressed }) => ({ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, opacity: pressed ? 0.7 : 1 })}>
        <Avatar uri={athlete.photo_url} name={athlete.name} size={44} />
        <View style={{ flex: 1 }}>
          <AppText style={{ fontFamily: fontFamily.semibold, fontSize: 15 }} numberOfLines={1}>
            {athlete.name}
          </AppText>
          <AppText variant="caption" numberOfLines={1} style={{ color: colors.subtle }}>
            {username ? `@${username}` : ''}
            {athlete.city ? ` · ${athlete.city}` : ''}
          </AppText>
        </View>
      </Pressable>
      {trailing ??
        (showFollow && username && !isMe && athlete.is_following !== undefined ? (
          <FollowButton username={username} isFollowing={athlete.is_following} firstName={athlete.name.split(' ')[0]} />
        ) : null)}
    </View>
  );
});
