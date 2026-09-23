import { router } from 'expo-router';
import { Award, Flag, Lock, MoreHorizontal, Trash2, Trophy, Users } from 'lucide-react-native';
import { memo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppError } from '@/api/errors';
import { AppText } from '@/components/app-text';
import { MomentMediaPager } from '@/components/social/moment-media';
import { ReactionBar } from '@/components/social/reaction-bar';
import { ReportSheet } from '@/components/social/report-sheet';
import { Avatar } from '@/components/ui/avatar';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { IconButton } from '@/components/ui/icon-button';
import { Sheet } from '@/components/ui/sheet';
import { SheetActionRow } from '@/components/ui/sheet-action-row';
import { MOMENT_TYPE_LABEL, VISIBILITY_LABEL, momentMetricLine } from '@/features/social/moment-state';
import { useDeleteMoment } from '@/hooks/use-social';
import { showToast } from '@/stores/toastStore';
import { colors, fontFamily, spacing } from '@/theme/tokens';
import type { LegacyMoment } from '@/types/social';
import { relativeTime } from '@/utils/relative-time';

interface MomentCardProps {
  moment: LegacyMoment;
  /** Detail screen: full caption, inline video player, no "open" tap. */
  detail?: boolean;
}

/**
 * A Legacy Moment in the feed: who, when, what they did (the numbers),
 * the media, the caption, and support. No box around it — cards are
 * separated by whitespace and a hairline, media runs full-bleed.
 */
export const MomentCard = memo(function MomentCard({ moment, detail = false }: MomentCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deleteMoment = useDeleteMoment();

  const metrics = momentMetricLine(moment);
  const open = () => (detail ? undefined : router.push(`/moments/${moment.uuid}`));
  const openAuthor = () => moment.author.username && router.push(`/athlete/${moment.author.username}`);
  const isPr = moment.type === 'personal_record' || moment.metrics?.is_personal_record;
  const headline =
    moment.activity?.event ?? moment.metrics?.title ?? moment.medal?.title ?? moment.gear?.product_name ?? null;

  return (
    <View style={{ paddingBottom: spacing.md, borderBottomWidth: detail ? 0 : 1, borderBottomColor: colors.hairline }}>
      {/* Author row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }}>
        <Pressable onPress={openAuthor} accessibilityRole="button" accessibilityLabel={`Ver perfil de ${moment.author.name}`} hitSlop={6}>
          <Avatar uri={moment.author.photo_url} name={moment.author.name} size={40} />
        </Pressable>
        <Pressable onPress={openAuthor} style={{ flex: 1 }} accessibilityRole="button">
          <AppText style={{ fontFamily: fontFamily.semibold, fontSize: 15 }} numberOfLines={1}>
            {moment.author.name}
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <AppText variant="caption" tone="muted" numberOfLines={1}>
              {MOMENT_TYPE_LABEL[moment.type]} · {relativeTime(moment.created_at)}
            </AppText>
            {moment.is_owner && moment.visibility !== 'public' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }} accessibilityLabel={`Visible para: ${VISIBILITY_LABEL[moment.visibility]}`}>
                {moment.visibility === 'private' ? <Lock size={11} color={colors.subtle} /> : <Users size={11} color={colors.subtle} />}
                <AppText variant="caption" style={{ color: colors.subtle, fontSize: 12 }}>
                  {VISIBILITY_LABEL[moment.visibility]}
                </AppText>
              </View>
            ) : null}
          </View>
        </Pressable>
        <IconButton icon={MoreHorizontal} label="Más opciones" onPress={() => setMenuOpen(true)} size={20} color={colors.muted} />
      </View>

      {/* Activity: the sporting fact, big and clear */}
      {headline || metrics.length > 0 ? (
        <Pressable onPress={open} disabled={detail} style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, gap: 4 }}>
          {headline ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {moment.medal ? <Award size={16} color={colors.gold} /> : moment.activity ? <Trophy size={16} color={colors.gold} /> : null}
              <AppText style={{ fontFamily: fontFamily.semibold, fontSize: 17, flexShrink: 1 }} numberOfLines={2}>
                {headline}
                {moment.activity?.race ? <AppText style={{ color: colors.muted, fontFamily: fontFamily.regular, fontSize: 17 }}> · {moment.activity.race}</AppText> : null}
              </AppText>
            </View>
          ) : null}
          {metrics.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: spacing.md, rowGap: 2 }}>
              {metrics.map((value, i) => (
                <AppText key={`${value}-${i}`} style={{ fontFamily: fontFamily.bold, fontSize: i === 0 ? 24 : 18, color: i === 0 ? colors.goldSoft : colors.foreground }}>
                  {value}
                </AppText>
              ))}
              {isPr ? (
                <View style={{ backgroundColor: colors.gold, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                  <AppText style={{ fontFamily: fontFamily.bold, fontSize: 11, color: colors.black }}>PR</AppText>
                </View>
              ) : null}
            </View>
          ) : null}
        </Pressable>
      ) : null}

      {moment.media.length > 0 ? <MomentMediaPager media={moment.media} interactiveVideo={detail} onOpen={detail ? undefined : open} /> : null}

      {moment.caption ? (
        <Pressable onPress={open} disabled={detail} style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
          <AppText variant="body" numberOfLines={detail ? undefined : 4}>
            {moment.caption}
          </AppText>
        </Pressable>
      ) : null}

      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xxs }}>
        <ReactionBar moment={moment} onComment={() => router.push(`/moments/${moment.uuid}?focus=comment`)} />
      </View>

      {menuOpen ? (
      <Sheet visible onClose={() => setMenuOpen(false)}>
        {moment.is_owner ? (
          <SheetActionRow
            icon={Trash2}
            label="Eliminar momento"
            destructive
            onPress={() => {
              setMenuOpen(false);
              setConfirmDelete(true);
            }}
          />
        ) : (
          <SheetActionRow
            icon={Flag}
            label="Reportar momento"
            onPress={() => {
              setMenuOpen(false);
              setReporting(true);
            }}
          />
        )}
      </Sheet>
      ) : null}

      {!moment.is_owner && reporting ? <ReportSheet visible onClose={() => setReporting(false)} targetType="moment" target={moment.uuid} /> : null}

      <ConfirmDialog
        visible={confirmDelete}
        title="¿Eliminar este momento?"
        description="Se quitará de tu perfil y del feed, junto con sus reacciones y mensajes. Tus fotos de evento no se borran."
        confirmLabel="Eliminar"
        loading={deleteMoment.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          try {
            await deleteMoment.mutateAsync(moment.uuid);
            setConfirmDelete(false);
            showToast('Momento eliminado.', 'default');
            if (detail) router.back();
          } catch (error) {
            setConfirmDelete(false);
            showToast(error instanceof AppError ? error.message : 'No pudimos eliminarlo. Intenta otra vez.', 'destructive');
          }
        }}
      />
    </View>
  );
});
