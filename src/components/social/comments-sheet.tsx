import { router } from 'expo-router';
import { Maximize2, MessageCircleHeart, SendHorizontal } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, TextInput, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppError } from '@/api/errors';
import { AppText } from '@/components/app-text';
import { Skeleton } from '@/components/skeleton';
import { CommentRow } from '@/components/social/comment-row';
import { ReportSheet } from '@/components/social/report-sheet';
import { IconButton } from '@/components/ui/icon-button';
import { useComments, useDeleteComment, usePostComment } from '@/hooks/use-social';
import { showToast } from '@/stores/toastStore';
import { colors, control, fontFamily, radius, spacing } from '@/theme/tokens';
import type { MomentComment } from '@/types/social';
import { useI18n } from '@/i18n';

const MAX_COMMENT = 500;
const DISMISS_THRESHOLD = 110;

interface CommentsSheetProps {
  momentUuid: string;
  commentsCount: number;
  onClose: () => void;
}

/**
 * "Mensajes de apoyo" without leaving the feed. Only the header drags the
 * sheet down — the list keeps its own native scroll. Optimistic count bump
 * and idempotent posting come from `usePostComment`.
 */
export function CommentsSheet({ momentUuid, commentsCount, onClose }: CommentsSheetProps) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const sheetHeight = Math.round(height * 0.74);
  const translateY = useSharedValue(sheetHeight);
  const backdrop = useSharedValue(0);

  const comments = useComments(momentUuid);
  const postComment = usePostComment(momentUuid);
  const deleteComment = useDeleteComment(momentUuid);
  const [draft, setDraft] = useState('');
  const [reporting, setReporting] = useState<string | null>(null);

  const list = useMemo<MomentComment[]>(() => comments.data?.pages.flatMap((p) => p.data) ?? [], [comments.data]);
  const canSend = draft.trim().length > 0 && !postComment.isPending;

  useEffect(() => {
    translateY.value = withSpring(0, { damping: 24, stiffness: 230 });
    backdrop.value = withTiming(1, { duration: 200 });
  }, [translateY, backdrop]);

  function close() {
    // eslint-disable-next-line react-hooks/immutability
    translateY.value = withTiming(sheetHeight, { duration: 190 });
    // eslint-disable-next-line react-hooks/immutability
    backdrop.value = withTiming(0, { duration: 190 }, (finished) => {
      if (finished) runOnJS(onClose)();
    });
  }

  const drag = Gesture.Pan()
    .onUpdate((event) => {
      // eslint-disable-next-line react-hooks/immutability
      if (event.translationY > 0) translateY.value = event.translationY;
    })
    .onEnd((event) => {
      if (event.translationY > DISMISS_THRESHOLD || event.velocityY > 900) runOnJS(close)();
      // eslint-disable-next-line react-hooks/immutability
      else translateY.value = withSpring(0, { damping: 24, stiffness: 230 });
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));

  async function send() {
    const body = draft.trim();
    if (!body) return;
    try {
      await postComment.mutateAsync(body);
      setDraft('');
    } catch (error) {
      showToast(error instanceof AppError && error.kind !== 'server' ? error.message : t('No pudimos publicar tu mensaje. Intenta otra vez.'), 'destructive');
    }
  }

  async function remove(uuid: string) {
    try {
      await deleteComment.mutateAsync(uuid);
    } catch {
      showToast(t('No pudimos borrar el mensaje. Intenta otra vez.'), 'destructive');
    }
  }

  function openFull() {
    close();
    router.push(`/moments/${momentUuid}`);
  }

  return (
    <Modal visible transparent animationType="none" onRequestClose={close} statusBarTranslucent>
      {/* A Modal is a new native root: gestures need their own root view. */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.backdrop }, backdropStyle]}>
            <Pressable style={{ flex: 1 }} onPress={close} accessibilityRole="button" accessibilityLabel={t('Cerrar mensajes')} />
          </Animated.View>

          <Animated.View
            accessibilityViewIsModal
            style={[
              {
                height: sheetHeight,
                backgroundColor: colors.card,
                borderTopLeftRadius: radius.xl,
                borderTopRightRadius: radius.xl,
                borderWidth: 1,
                borderColor: colors.border,
                overflow: 'hidden',
              },
              sheetStyle,
            ]}>
            <GestureDetector gesture={drag}>
              <View style={{ paddingTop: spacing.xs, paddingBottom: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
                <View style={{ alignItems: 'center', paddingVertical: spacing.xs }}>
                  <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.surfaceMuted }} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg }}>
                  <AppText style={{ flex: 1, fontFamily: fontFamily.semibold, fontSize: 16 }} accessibilityRole="header">
                    {commentsCount > 0 ? t('Mensajes de apoyo · {count}', { count: commentsCount }) : t('Mensajes de apoyo')}
                  </AppText>
                  <IconButton icon={Maximize2} label={t('Ver momento completo')} onPress={openFull} size={18} color={colors.muted} />
                </View>
              </View>
            </GestureDetector>

            <FlatList
              data={list}
              keyExtractor={(item) => item.uuid}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              contentContainerStyle={{ paddingVertical: spacing.xs, flexGrow: 1 }}
              renderItem={({ item }) => (
                <CommentRow
                  comment={item}
                  onDelete={() => remove(item.uuid)}
                  onReport={() => setReporting(item.uuid)}
                  deleting={deleteComment.isPending && deleteComment.variables === item.uuid}
                />
              )}
              onEndReachedThreshold={0.4}
              onEndReached={() => comments.hasNextPage && !comments.isFetchingNextPage && comments.fetchNextPage()}
              ListFooterComponent={comments.isFetchingNextPage ? <ActivityIndicator color={colors.accent} style={{ marginVertical: spacing.sm }} /> : null}
              ListEmptyComponent={
                comments.isPending ? (
                  <View style={{ padding: spacing.lg, gap: spacing.sm }}>
                    <Skeleton height={40} />
                    <Skeleton height={40} />
                  </View>
                ) : comments.isError ? (
                  <View style={{ alignItems: 'center', padding: spacing.xl, gap: spacing.xs }}>
                    <AppText variant="body" tone="muted" align="center">
                      {t('No pudimos cargar los mensajes.')}
                    </AppText>
                    <Pressable onPress={() => comments.refetch()} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}>
                      <AppText variant="bodyStrong" tone="gold">
                        {t('Reintentar')}
                      </AppText>
                    </Pressable>
                  </View>
                ) : (
                  <View style={{ alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.xs }}>
                    <MessageCircleHeart size={28} color={colors.accent} />
                    <AppText variant="body" tone="muted" align="center">
                      {t('Sé el primero en dejar un mensaje de apoyo.')}
                    </AppText>
                  </View>
                )
              }
            />

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
              }}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder={t('Escribe un mensaje de apoyo…')}
                placeholderTextColor={colors.subtle}
                multiline
                maxLength={MAX_COMMENT}
                selectionColor={colors.accent}
                accessibilityLabel={t('Escribe un mensaje de apoyo')}
                style={{
                  flex: 1,
                  minHeight: control.compactHeight,
                  maxHeight: 110,
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
                accessibilityLabel={t('Enviar mensaje')}
                style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: canSend ? colors.black : colors.surfaceMuted }}>
                {postComment.isPending ? <ActivityIndicator color={colors.onDark} size="small" /> : <SendHorizontal size={20} color={canSend ? colors.onDark : colors.subtle} />}
              </Pressable>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>

      {reporting ? <ReportSheet visible targetType="comment" target={reporting} onClose={() => setReporting(null)} /> : null}
    </Modal>
  );
}
