import { HandHeart, Heart, MessageCircle } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { useReaction } from '@/hooks/use-social';
import { colors, fontFamily, spacing } from '@/theme/tokens';
import type { LegacyMoment, ReactionType } from '@/types/social';
import { showToast } from '@/stores/toastStore';
import { AppError } from '@/api/errors';

interface ReactionBarProps {
  moment: LegacyMoment;
  onComment?: () => void;
}

/**
 * ❤️ Me gusta · 👏 ¡Vamos! · 💬 Mensajes — two reactions on purpose, not an
 * emoji picker. Optimistic, idempotent on the server.
 */
export function ReactionBar({ moment, onComment }: ReactionBarProps) {
  const reaction = useReaction();

  function toggle(type: ReactionType) {
    const active = !moment.my_reactions.includes(type);
    reaction.mutate(
      { uuid: moment.uuid, type, active },
      {
        onError: (error) =>
          showToast(error instanceof AppError && error.kind === 'network' ? error.message : 'No pudimos guardar tu reacción.', 'destructive'),
      },
    );
  }

  const liked = moment.my_reactions.includes('like');
  const cheered = moment.my_reactions.includes('cheer');

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, marginLeft: -10 }}>
      <ReactionButton
        label={liked ? 'Quitar me gusta' : 'Me gusta'}
        active={liked}
        count={moment.reactions.like}
        onPress={() => toggle('like')}
        icon={<Heart size={22} color={liked ? colors.destructive : colors.foreground} fill={liked ? colors.destructive : 'transparent'} strokeWidth={1.8} />}
      />
      <ReactionButton
        label={cheered ? 'Quitar ¡vamos!' : '¡Vamos!'}
        active={cheered}
        count={moment.reactions.cheer}
        onPress={() => toggle('cheer')}
        icon={<HandHeart size={22} color={cheered ? colors.gold : colors.foreground} fill={cheered ? colors.goldWash : 'transparent'} strokeWidth={1.8} />}
      />
      {onComment ? (
        <ReactionButton
          label="Mensajes de apoyo"
          count={moment.comments_count}
          onPress={onComment}
          icon={<MessageCircle size={21} color={colors.foreground} strokeWidth={1.8} />}
        />
      ) : null}
    </View>
  );
}

function ReactionButton({
  icon,
  count,
  label,
  onPress,
  active = false,
}: {
  icon: React.ReactNode;
  count: number;
  label: string;
  onPress: () => void;
  active?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${count}`}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        minHeight: 44,
        minWidth: 44,
        paddingHorizontal: 10,
        opacity: pressed ? 0.6 : 1,
      })}>
      {icon}
      {count > 0 ? <AppText style={{ fontFamily: fontFamily.medium, fontSize: 14, color: colors.foreground }}>{count}</AppText> : null}
    </Pressable>
  );
}
