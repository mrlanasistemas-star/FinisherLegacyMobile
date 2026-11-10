import { router } from 'expo-router';
import { Flag, Trash2 } from 'lucide-react-native';
import { memo } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Avatar } from '@/components/ui/avatar';
import { IconButton } from '@/components/ui/icon-button';
import { colors, fontFamily, spacing } from '@/theme/tokens';
import type { MomentComment } from '@/types/social';
import { relativeTime } from '@/utils/relative-time';
import { useI18n } from '@/i18n';

/** One "mensaje de apoyo" — shared by the moment detail and the comments sheet. */
export const CommentRow = memo(function CommentRow({
  comment,
  onDelete,
  onReport,
  deleting,
}: {
  comment: MomentComment;
  onDelete: () => void;
  onReport: () => void;
  deleting: boolean;
}) {
  const { t } = useI18n();

  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, opacity: deleting ? 0.4 : 1 }}>
      <Pressable
        onPress={() => comment.author.username && router.push(`/athlete/${comment.author.username}`)}
        accessibilityRole="button"
        accessibilityLabel={t('Ver perfil de {name}', { name: comment.author.name })}>
        <Avatar uri={comment.author.photo_url} name={comment.author.name} size={34} />
      </Pressable>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <AppText style={{ fontFamily: fontFamily.semibold, fontSize: 14, flexShrink: 1 }} numberOfLines={1}>
            {comment.author.username ? `@${comment.author.username}` : comment.author.name}
          </AppText>
          <AppText variant="caption" style={{ color: colors.subtle, fontSize: 12 }}>
            {relativeTime(comment.created_at)}
          </AppText>
        </View>
        <AppText variant="body" style={{ fontSize: 15 }}>
          {comment.body}
        </AppText>
      </View>
      {comment.can_delete ? (
        <IconButton icon={Trash2} label={t('Borrar mensaje')} onPress={onDelete} size={16} color={colors.subtle} disabled={deleting} />
      ) : (
        <IconButton icon={Flag} label={t('Reportar mensaje')} onPress={onReport} size={16} color={colors.subtle} />
      )}
    </View>
  );
});
