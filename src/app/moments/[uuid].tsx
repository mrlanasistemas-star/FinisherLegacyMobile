import { router, useLocalSearchParams } from 'expo-router';
import { Flag, MessageCircleHeart, SendHorizontal, Share2, Trash2 } from 'lucide-react-native';
import { memo, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, Share, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppError } from '@/api/errors';
import { AppText } from '@/components/app-text';
import { ErrorState } from '@/components/error-state';
import { Skeleton } from '@/components/skeleton';
import { MomentCard } from '@/components/social/moment-card';
import { ReportSheet } from '@/components/social/report-sheet';
import { Avatar } from '@/components/ui/avatar';
import { IconButton } from '@/components/ui/icon-button';
import { TopBar } from '@/components/ui/top-bar';
import { useComments, useDeleteComment, useMoment, usePostComment } from '@/hooks/use-social';
import { showToast } from '@/stores/toastStore';
import { colors, control, fontFamily, spacing } from '@/theme/tokens';
import type { MomentComment } from '@/types/social';
import { relativeTime } from '@/utils/relative-time';

const MAX_COMMENT = 500;

export default function MomentDetailScreen() {
  const { uuid, focus } = useLocalSearchParams<{ uuid: string; focus?: string }>();
  const insets = useSafeAreaInsets();
  const moment = useMoment(uuid);
  const comments = useComments(uuid);
  const postComment = usePostComment(uuid);
  const deleteComment = useDeleteComment(uuid);
  const [draft, setDraft] = useState('');
  const [reportingComment, setReportingComment] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  const list = useMemo<MomentComment[]>(() => comments.data?.pages.flatMap((p) => p.data) ?? [], [comments.data]);
  const canSend = draft.trim().length > 0 && !postComment.isPending;

  async function send() {
    const body = draft.trim();
    if (!body) return;
    try {
      await postComment.mutateAsync(body);
      setDraft('');
    } catch (error) {
      showToast(error instanceof AppError && error.kind !== 'server' ? error.message : 'No pudimos publicar tu mensaje. Intenta otra vez.', 'destructive');
    }
  }

  async function remove(commentUuid: string) {
    try {
      await deleteComment.mutateAsync(commentUuid);
    } catch {
      showToast('No pudimos borrar el mensaje. Intenta otra vez.', 'destructive');
    }
  }

  const shareUrl = `https://finisherlegacy.com/moments/${uuid}`;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.black }}>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <TopBar title="Momento" right={<IconButton icon={Share2} label="Compartir momento" onPress={() => Share.share({ message: shareUrl, url: shareUrl })} />} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={insets.top + 52}>
        {moment.isPending && !moment.data ? (
          <View style={{ padding: spacing.lg, gap: spacing.md }}>
            <Skeleton height={48} width="70%" />
            <Skeleton height={300} radius={0} />
          </View>
        ) : moment.isError || !moment.data ? (
          <ErrorState
            error={moment.error}
            message="Este momento ya no está disponible o no tienes acceso a él."
            onRetry={moment.error instanceof AppError && moment.error.kind === 'not_found' ? undefined : moment.refetch}
          />
        ) : (
          <FlatList
            data={list}
            keyExtractor={(item) => item.uuid}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            contentContainerStyle={{ paddingBottom: spacing.lg }}
            ListHeaderComponent={
              <View>
                <MomentCard moment={moment.data} detail />
                <View style={{ height: 1, backgroundColor: colors.hairline, marginHorizontal: spacing.lg }} />
                <AppText style={{ fontFamily: fontFamily.semibold, fontSize: 16, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xs }}>
                  Mensajes de apoyo{moment.data.comments_count > 0 ? ` · ${moment.data.comments_count}` : ''}
                </AppText>
              </View>
            }
            renderItem={({ item }) => (
              <CommentRow
                comment={item}
                onDelete={() => remove(item.uuid)}
                onReport={() => setReportingComment(item.uuid)}
                deleting={deleteComment.isPending && deleteComment.variables === item.uuid}
              />
            )}
            onEndReachedThreshold={0.4}
            onEndReached={() => comments.hasNextPage && !comments.isFetchingNextPage && comments.fetchNextPage()}
            ListFooterComponent={comments.isFetchingNextPage ? <ActivityIndicator color={colors.gold} style={{ marginTop: spacing.sm }} /> : null}
            ListEmptyComponent={
              comments.isPending ? (
                <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
                  <Skeleton height={40} />
                </View>
              ) : (
                <View style={{ alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.xs }}>
                  <MessageCircleHeart size={28} color={colors.goldDim} />
                  <AppText variant="body" tone="muted" align="center">
                    Sé el primero en dejar un mensaje de apoyo.
                  </AppText>
                </View>
              )
            }
          />
        )}

        {moment.data ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              gap: spacing.xs,
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.xs,
              paddingBottom: Math.max(insets.bottom, spacing.sm),
              borderTopWidth: 1,
              borderTopColor: colors.hairline,
              backgroundColor: colors.black,
            }}>
            <TextInput
              ref={inputRef}
              value={draft}
              onChangeText={setDraft}
              placeholder="Escribe un mensaje de apoyo…"
              placeholderTextColor={colors.subtle}
              autoFocus={focus === 'comment'}
              multiline
              maxLength={MAX_COMMENT}
              selectionColor={colors.gold}
              accessibilityLabel="Escribe un mensaje de apoyo"
              style={{
                flex: 1,
                minHeight: control.compactHeight,
                maxHeight: 120,
                paddingHorizontal: control.paddingX,
                paddingTop: 12,
                paddingBottom: 12,
                borderRadius: 22,
                borderWidth: 1,
                borderColor: colors.inputBorder,
                backgroundColor: colors.input,
                color: colors.foreground,
                fontFamily: fontFamily.regular,
                fontSize: 15,
              }}
            />
            <Pressable
              onPress={send}
              disabled={!canSend}
              accessibilityRole="button"
              accessibilityLabel="Enviar mensaje"
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: canSend ? colors.gold : colors.graphite,
              }}>
              {postComment.isPending ? (
                <ActivityIndicator color={colors.black} size="small" />
              ) : (
                <SendHorizontal size={20} color={canSend ? colors.black : colors.subtle} />
              )}
            </Pressable>
          </View>
        ) : null}
      </KeyboardAvoidingView>

      {reportingComment ? (
        <ReportSheet visible targetType="comment" target={reportingComment} onClose={() => setReportingComment(null)} />
      ) : null}
    </SafeAreaView>
  );
}

const CommentRow = memo(function CommentRow({
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
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, opacity: deleting ? 0.4 : 1 }}>
      <Pressable
        onPress={() => comment.author.username && router.push(`/athlete/${comment.author.username}`)}
        accessibilityRole="button"
        accessibilityLabel={`Ver perfil de ${comment.author.name}`}>
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
        <IconButton icon={Trash2} label="Borrar mensaje" onPress={onDelete} size={16} color={colors.subtle} disabled={deleting} />
      ) : (
        <IconButton icon={Flag} label="Reportar mensaje" onPress={onReport} size={16} color={colors.subtle} />
      )}
    </View>
  );
});
