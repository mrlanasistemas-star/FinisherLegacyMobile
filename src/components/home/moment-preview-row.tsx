import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Heart, MessageCircle } from 'lucide-react-native';
import { memo } from 'react';
import { View } from 'react-native';

import { PressableScale } from '@/components/motion/pressable-scale';
import { AppText } from '@/components/app-text';
import { Avatar } from '@/components/ui/avatar';
import { MOMENT_TYPE_LABEL } from '@/features/social/moment-state';
import { colors, fontFamily, radius, spacing } from '@/theme/tokens';
import type { LegacyMoment } from '@/types/social';
import { relativeTime } from '@/utils/relative-time';

/** Compact community row for Inicio — a glance, not the full feed card. */
export const MomentPreviewRow = memo(function MomentPreviewRow({ moment }: { moment: LegacyMoment }) {
  const headline = moment.activity?.event ?? moment.metrics?.title ?? moment.medal?.title ?? moment.caption ?? MOMENT_TYPE_LABEL[moment.type];
  const thumb = moment.media.find((m) => m.type === 'image')?.url ?? moment.medal?.image_url ?? null;
  const time = moment.activity?.official_time ?? moment.metrics?.pace ?? null;

  return (
    <PressableScale
      dim
      scaleTo={0.98}
      onPress={() => router.push(`/moments/${moment.uuid}`)}
      accessibilityRole="button"
      accessibilityLabel={`${moment.author.name}: ${headline}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm }}>
      <Avatar uri={moment.author.photo_url} name={moment.author.name} size={40} />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText style={{ fontFamily: fontFamily.semibold, fontSize: 14 }} numberOfLines={1}>
          {moment.author.name}
          <AppText variant="caption" style={{ color: colors.subtle }}>
            {'  '}
            {relativeTime(moment.created_at)}
          </AppText>
        </AppText>
        <AppText variant="caption" tone="muted" numberOfLines={1}>
          {headline}
          {time ? <AppText variant="caption" tone="gold">{`  ${time}`}</AppText> : null}
        </AppText>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: 2 }}>
          <Stat icon={Heart} value={moment.reactions.like + moment.reactions.cheer} />
          <Stat icon={MessageCircle} value={moment.comments_count} />
        </View>
      </View>
      {thumb ? (
        <Image source={{ uri: thumb }} style={{ width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.surfaceMuted }} contentFit="cover" cachePolicy="memory-disk" recyclingKey={moment.uuid} />
      ) : null}
    </PressableScale>
  );
});

function Stat({ icon: Icon, value }: { icon: typeof Heart; value: number }) {
  if (value <= 0) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      <Icon size={12} color={colors.subtle} />
      <AppText style={{ fontSize: 12, color: colors.subtle }}>{value}</AppText>
    </View>
  );
}
