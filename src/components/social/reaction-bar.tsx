import { HandHeart, Heart, MessageCircle, Share2 } from 'lucide-react-native';
import { View } from 'react-native';

import { PressableScale } from '@/components/motion/pressable-scale';
import { AppText } from '@/components/app-text';
import { useReaction } from '@/hooks/use-social';
import { colors, fontFamily, spacing } from '@/theme/tokens';
import type { LegacyMoment, ReactionType } from '@/types/social';
import { showToast } from '@/stores/toastStore';
import { AppError } from '@/api/errors';
import { useI18n } from '@/i18n';

interface ReactionBarProps {
  moment: LegacyMoment;
  onComment?: () => void;
  onShare?: () => void;
}

/**
 * ❤️ Me gusta · 👏 ¡Vamos! · 💬 Mensajes — two reactions on purpose, not an
 * emoji picker. Optimistic, idempotent on the server.
 */
export function ReactionBar({ moment, onComment, onShare }: ReactionBarProps) {
  const { t } = useI18n();
  const reaction = useReaction();

  function toggle(type: ReactionType) {
    const active = !moment.my_reactions.includes(type);
    reaction.mutate(
      { uuid: moment.uuid, type, active },
      {
        onError: (error) =>
          showToast(error instanceof AppError && error.kind === 'network' ? error.message : t('No pudimos guardar tu reacción.'), 'destructive'),
      },
    );
  }

  const liked = moment.my_reactions.includes('like');
  const cheered = moment.my_reactions.includes('cheer');

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, marginLeft: -10 }}>
      <ReactionButton
        label={liked ? t('Quitar me gusta') : t('Me gusta')}
        active={liked}
        count={moment.reactions.like}
        onPress={() => toggle('like')}
        icon={<Heart size={22} color={liked ? colors.destructive : colors.foreground} fill={liked ? colors.destructive : 'transparent'} strokeWidth={1.8} />}
      />
      <ReactionButton
        label={cheered ? t('Quitar ¡vamos!') : t('¡Vamos!')}
        active={cheered}
        count={moment.reactions.cheer}
        onPress={() => toggle('cheer')}
        icon={<HandHeart size={22} color={cheered ? colors.accent : colors.foreground} fill={cheered ? colors.gold : 'transparent'} strokeWidth={1.8} />}
      />
      {onComment ? (
        <ReactionButton
          label={t('Mensajes de apoyo')}
          count={moment.comments_count}
          onPress={onComment}
          icon={<MessageCircle size={21} color={colors.foreground} strokeWidth={1.8} />}
        />
      ) : null}
      {onShare ? (
        <PressableScale
          dim
          scaleTo={0.98}
          onPress={onShare}
          accessibilityRole="button"
          accessibilityLabel={t('Compartir momento')}
          style={{ marginLeft: 'auto', minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Share2 size={20} color={colors.foreground} strokeWidth={1.8} />
        </PressableScale>
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
    <PressableScale
      dim
      scaleTo={0.98}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${count}`}
      accessibilityState={{ selected: active }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        minHeight: 44,
        minWidth: 44,
        paddingHorizontal: 10,
      }}>
      {icon}
      {count > 0 ? <AppText style={{ fontFamily: fontFamily.medium, fontSize: 14, color: colors.foreground }}>{count}</AppText> : null}
    </PressableScale>
  );
}
