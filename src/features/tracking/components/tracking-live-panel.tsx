import { useVideoPlayer } from 'expo-video';
import { CloudOff, HeartHandshake, Link2, Pause, Play, Share2, Square, TriangleAlert } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Share, View } from 'react-native';
import Animated, { Easing, FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { InlineError } from '@/components/ui/inline-error';
import { StickyFooter } from '@/components/ui/sticky-footer';
import { showToast } from '@/stores/toastStore';
import { colors, fontFamily, radius, spacing } from '@/theme/tokens';
import type { SupportTriggeredMessage } from '@/types/models';
import { formatDateTime } from '@/utils/dates';
import { haptics } from '@/utils/haptics';

import { formatAgo, formatDistance, formatElapsed } from '../format';
import { resumeLiveTracking, stopLiveTracking } from '../tracking-controller';
import type { TrackingRecord } from '../tracking-storage';
import { useCreateTrackingShare, useNow, useRevokeTrackingShare, useTrackingSupportMessages } from '../use-live-tracking';

/**
 * What the athlete sees while sharing: it's live, how far, since when,
 * whether points are waiting for signal, who it's shared with — and a stop
 * button that never scrolls away.
 */
export function TrackingLivePanel({ record, eventName, onStopped }: { record: TrackingRecord; eventName: string | null; onStopped: () => void }) {
  const now = useNow(1000);
  const [confirmStop, setConfirmStop] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const createShare = useCreateTrackingShare();
  const revokeShare = useRevokeTrackingShare();
  const stopRequested = !!record.stopRequested;
  const support = useTrackingSupportMessages(record.participantId, record.distanceM, !stopRequested);

  async function share() {
    setShareError(null);
    try {
      const created = record.shares[0] ?? (await createShare.mutateAsync(record.sessionUuid));
      await Share.share({ message: `Sígueme en vivo${eventName ? ` en ${eventName}` : ''}: ${created.url}`, url: created.url });
    } catch (error) {
      const appError = error as { status?: number; kind?: string };
      setShareError(
        appError.status === 404
          ? 'Compartir todavía no está disponible.'
          : appError.kind === 'network'
            ? 'Sin conexión. Intenta de nuevo cuando tengas señal.'
            : 'No pudimos crear el enlace. Intenta otra vez.',
      );
    }
  }

  async function stop() {
    setStopping(true);
    try {
      const result = await stopLiveTracking();
      haptics.success();
      showToast(result === 'stopped' ? 'Seguimiento detenido.' : 'GPS detenido. Enviaremos tus últimos puntos al reconectar.', 'success');
      setConfirmStop(false);
      if (result === 'stopped') onStopped();
    } finally {
      setStopping(false);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xl }}>
        <Animated.View entering={FadeInDown.duration(320)} style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            {stopRequested ? <CloudOff size={14} color={colors.accent} /> : <LivePulse />}
            <AppText variant="label" tone="gold" accessibilityLiveRegion="polite">
              {stopRequested ? 'ENVIANDO TUS ÚLTIMOS PUNTOS' : 'EN VIVO'}
            </AppText>
          </View>
          {eventName ? (
            <AppText variant="title" accessibilityRole="header">
              {eventName}
            </AppText>
          ) : null}
        </Animated.View>

        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Metric label="Distancia" value={formatDistance(record.distanceM)} />
          <Metric label="Tiempo" value={formatElapsed(record.startedAt, now)} />
        </View>

        <View style={{ gap: 6 }}>
          <StatusLine label="Última actualización enviada" value={formatAgo(record.lastSyncAt, now)} />
          {record.pending.length > 0 ? (
            <StatusLine
              label={record.lastError === 'offline' ? 'Sin señal · guardados en tu teléfono' : 'Puntos por enviar'}
              value={String(record.pending.length)}
              tone={record.lastError ? 'warn' : 'default'}
            />
          ) : null}
          {record.lastError === 'login' ? <InlineError message="Tu sesión expiró. Inicia sesión para seguir enviando tu recorrido." /> : null}
        </View>

        {record.mode === 'foreground' && !stopRequested ? (
          <Notice icon={TriangleAlert} text="En este dispositivo el seguimiento solo funciona con la app abierta. Mantén esta pantalla visible." />
        ) : null}
        {!stopRequested ? <Notice icon={TriangleAlert} text="El GPS consume batería. Si tu teléfono entra en ahorro de energía, el seguimiento puede pausarse." subtle /> : null}
        {record.mode === 'foreground' && !stopRequested ? (
          <AppButton label="Reanudar GPS" variant="secondary" size="md" onPress={() => resumeLiveTracking().catch(() => {})} />
        ) : null}

        {!stopRequested ? (
          <View style={{ gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.hairline }}>
            <AppText style={{ fontFamily: fontFamily.semibold, fontSize: 16 }}>Compartir seguimiento</AppText>
            <AppText variant="caption" tone="muted">
              Quien abra el enlace verá tu avance en un mapa. No necesita cuenta.
            </AppText>
            <AppButton label={record.shares.length > 0 ? 'Compartir enlace' : 'Crear enlace y compartir'} icon={Share2} loading={createShare.isPending} onPress={share} />
            <InlineError message={shareError} />
            {record.shares.map((item) => (
              <View key={item.uuid} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xs, borderTopWidth: 1, borderTopColor: colors.hairline }}>
                <Link2 size={16} color={colors.muted} />
                <View style={{ flex: 1 }}>
                  <AppText variant="caption" numberOfLines={1}>
                    {item.url.replace(/^https?:\/\//, '')}
                  </AppText>
                  {item.expires_at ? (
                    <AppText variant="caption" tone="muted">
                      Vence {formatDateTime(item.expires_at)}
                    </AppText>
                  ) : null}
                </View>
                <Pressable
                  onPress={() => setRevoking(item.uuid)}
                  accessibilityRole="button"
                  accessibilityLabel="Revocar este enlace"
                  style={{ minHeight: 44, paddingHorizontal: spacing.sm, justifyContent: 'center' }}>
                  <AppText variant="caption" tone="destructive">
                    Revocar
                  </AppText>
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        {support.messages.length > 0 ? (
          <View style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <HeartHandshake size={18} color={colors.accent} />
              <AppText style={{ fontFamily: fontFamily.semibold, fontSize: 16 }}>Mensajes de tu equipo de apoyo</AppText>
            </View>
            {support.messages.map((message) => (
              <SupportMessageCard key={message.id} message={message} onSeen={() => support.consume(message.id)} />
            ))}
          </View>
        ) : null}
      </ScrollView>

      <StickyFooter>
        <AppButton label={stopRequested ? 'Reintentar envío' : 'Detener seguimiento'} icon={Square} variant={stopRequested ? 'secondary' : 'destructive'} loading={stopping} onPress={() => (stopRequested ? stop() : setConfirmStop(true))} />
      </StickyFooter>

      <ConfirmDialog
        visible={confirmStop}
        title="¿Detener el seguimiento?"
        description="Tu GPS se apagará y quienes te siguen verán tu último punto. Los enlaces dejan de actualizarse."
        confirmLabel="Detener"
        loading={stopping}
        onConfirm={stop}
        onCancel={() => setConfirmStop(false)}
      />
      <ConfirmDialog
        visible={revoking !== null}
        title="¿Revocar este enlace?"
        description="Quien lo tenga dejará de ver tu ubicación de inmediato."
        confirmLabel="Revocar"
        loading={revokeShare.isPending}
        onConfirm={() => {
          if (!revoking) return;
          revokeShare.mutate(revoking, {
            onSuccess: () => showToast('Enlace revocado.', 'success'),
            onError: () => showToast('No pudimos revocarlo. Intenta otra vez.', 'destructive'),
            onSettled: () => setRevoking(null),
          });
        }}
        onCancel={() => setRevoking(null)}
      />
    </View>
  );
}

function LivePulse() {
  const reduced = useReducedMotion();
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    pulse.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), -1, false);
  }, [pulse, reduced]);
  const ring = useAnimatedStyle(() => ({ opacity: 0.6 * (1 - pulse.value), transform: [{ scale: 1 + pulse.value * 1.6 }] }));

  return (
    <View style={{ width: 14, height: 14, alignItems: 'center', justifyContent: 'center' }} accessibilityElementsHidden importantForAccessibility="no">
      <Animated.View style={[{ position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: colors.gold }, ring]} />
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.gold }} />
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.hairline, gap: 2 }} accessible accessibilityLabel={`${label}: ${value}`}>
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
      <AppText style={{ fontFamily: fontFamily.heading, fontSize: 28, color: colors.foreground, fontVariant: ['tabular-nums'] }}>{value}</AppText>
    </View>
  );
}

function StatusLine({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'warn' }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
      <AppText variant="caption" style={{ color: tone === 'warn' ? colors.accent : colors.foreground, fontFamily: fontFamily.medium }}>
        {value}
      </AppText>
    </View>
  );
}

function Notice({ icon: Icon, text, subtle = false }: { icon: typeof TriangleAlert; text: string; subtle?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', padding: subtle ? 0 : spacing.md, borderRadius: radius.lg, backgroundColor: subtle ? 'transparent' : colors.goldWash }}>
      <Icon size={16} color={subtle ? colors.subtle : colors.accent} />
      <AppText variant="caption" style={{ flex: 1, color: subtle ? colors.subtle : colors.foreground }}>
        {text}
      </AppText>
    </View>
  );
}

function SupportMessageCard({ message, onSeen }: { message: SupportTriggeredMessage; onSeen: () => void }) {
  return (
    <Animated.View entering={FadeInDown.duration(280)} style={{ gap: spacing.xs, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.goldDim, backgroundColor: colors.goldWash }}>
      <AppText style={{ fontFamily: fontFamily.semibold }}>{message.contributor_name ?? 'Alguien que te apoya'}</AppText>
      {message.type === 'audio' && message.audio_url ? <AudioButton url={message.audio_url} /> : <AppText variant="body">{message.message_text}</AppText>}
      <Pressable onPress={onSeen} accessibilityRole="button" style={{ alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm }}>
        <AppText variant="caption" tone="gold">
          Listo, gracias
        </AppText>
      </Pressable>
    </Animated.View>
  );
}

function AudioButton({ url }: { url: string }) {
  const player = useVideoPlayer(url);
  const [playing, setPlaying] = useState(false);
  return (
    <Pressable
      onPress={() => {
        if (playing) player.pause();
        else player.play();
        setPlaying(!playing);
      }}
      accessibilityRole="button"
      accessibilityLabel={playing ? 'Pausar mensaje de voz' : 'Escuchar mensaje de voz'}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start', minHeight: 44, paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.goldDim }}>
      {playing ? <Pause size={14} color={colors.accent} /> : <Play size={14} color={colors.accent} />}
      <AppText variant="caption" tone="gold">
        Mensaje de voz
      </AppText>
    </Pressable>
  );
}
