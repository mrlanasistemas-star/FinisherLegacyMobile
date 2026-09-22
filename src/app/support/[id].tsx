import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useVideoPlayer } from 'expo-video';
import { Pause, Play, Share2 } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Pressable, Share, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Card } from '@/components/card';
import { ErrorState } from '@/components/error-state';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { Badge } from '@/components/ui/badge';
import { useSupportSession } from '@/hooks/use-support';
import { colors, radius, spacing } from '@/theme/tokens';
import { formatDateTime } from '@/utils/dates';
import { describeSupportStatus } from '@/utils/support-status';
import type { SupportMessageOwnerView } from '@/types/models';

/**
 * `useVideoPlayer` can drive audio-only playback without a mounted
 * `VideoView` (confirmed against the SDK 57 docs — the player controls
 * sound independently of any view). Reused here instead of adding a
 * speculative audio-only dependency, since `expo-video` is already in the
 * project.
 */
function AudioMessageButton({ url }: { url: string }) {
  const player = useVideoPlayer(url);
  const [playing, setPlaying] = useState(false);

  // A message playing when the user navigates elsewhere (e.g. taps into
  // another support session) would otherwise keep playing indefinitely —
  // React Navigation's native stack freezes rather than unmounts a
  // backgrounded screen by default, so `useVideoPlayer`'s own unmount
  // cleanup never fires. Pausing on blur is the actual fix, not relying on
  // unmount.
  useFocusEffect(
    useCallback(() => {
      return () => {
        player.pause();
        setPlaying(false);
      };
    }, [player]),
  );

  function toggle() {
    if (playing) {
      player.pause();
      setPlaying(false);
    } else {
      player.play();
      setPlaying(true);
    }
  }

  return (
    <Pressable
      onPress={toggle}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        alignSelf: 'flex-start',
        paddingVertical: spacing.xxs,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.goldDim,
        backgroundColor: 'rgba(201,161,89,0.1)',
      }}
      accessibilityRole="button">
      {playing ? <Pause size={14} color={colors.gold} /> : <Play size={14} color={colors.gold} />}
      <AppText variant="caption" tone="gold">
        Mensaje de voz
      </AppText>
    </Pressable>
  );
}

function MessageRow({ message }: { message: SupportMessageOwnerView }) {
  return (
    <Card style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <AppText variant="bodyStrong">{message.contributor_name ?? 'Anónimo'}</AppText>
        <AppText variant="caption" tone="muted">
          {formatDateTime(message.created_at)}
        </AppText>
      </View>
      {message.is_surprise ? (
        <AppText variant="caption" tone="gold">
          🎁 Mensaje sorpresa — se revelará en el momento indicado.
        </AppText>
      ) : message.type === 'audio' && message.audio_url ? (
        <AudioMessageButton url={message.audio_url} />
      ) : (
        <AppText variant="body">{message.message_text}</AppText>
      )}
    </Card>
  );
}

export default function SupportSessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessionId = Number(id);
  const { data: session, isPending, isError, refetch } = useSupportSession(Number.isFinite(sessionId) ? sessionId : null);

  async function handleShare() {
    if (!session) return;
    try {
      await Share.share({ message: session.public_url, url: session.public_url });
    } catch {
      // User cancelled the share sheet — nothing to do.
    }
  }

  if (isPending) {
    return (
      <Screen scroll>
        <ScreenHeader title="Sesión de apoyo" />
        <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
          <Skeleton height={220} radius={16} />
          <Skeleton height={80} radius={12} />
        </View>
      </Screen>
    );
  }

  if (isError || !session) {
    return (
      <Screen>
        <ScreenHeader title="Sesión de apoyo" />
        <ErrorState message="No pudimos cargar esta sesión de apoyo." onRetry={refetch} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <ScreenHeader title={session.title} />

      <View style={{ gap: spacing.lg, marginTop: spacing.sm, paddingBottom: spacing.xl }}>
        <Card style={{ alignItems: 'center', gap: spacing.sm }}>
          <Badge label={describeSupportStatus(session.status).label} variant={describeSupportStatus(session.status).variant} />
          <Image source={{ uri: session.qr_url }} style={{ width: 180, height: 180 }} contentFit="contain" />
          <AppText variant="caption" tone="muted" align="center">
            Comparte este código o el enlace con las personas que te van a apoyar.
          </AppText>
          <Pressable
            onPress={handleShare}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs }}
            accessibilityRole="button">
            <Share2 size={16} color={colors.gold} />
            <AppText variant="bodyStrong" tone="gold">
              Compartir enlace
            </AppText>
          </Pressable>
        </Card>

        <View style={{ gap: spacing.sm }}>
          <AppText variant="label" tone="muted">
            MENSAJES
          </AppText>
          {session.messages.length === 0 ? (
            <AppText variant="body" tone="muted">
              Todavía no has recibido mensajes de apoyo.
            </AppText>
          ) : (
            session.messages.map((message) => <MessageRow key={message.id} message={message} />)
          )}
        </View>
      </View>
    </Screen>
  );
}
