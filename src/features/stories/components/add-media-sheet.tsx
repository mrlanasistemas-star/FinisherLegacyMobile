/**
 * "Agregar" action sheet of the story editor: photos from the phone, a
 * video from the phone, photos bought from the event photographers, and
 * the voice message. Each row says how much room is left for it, so the
 * limit is known before picking. The voice message is added on the web
 * for now (the app does not record, and no audio file picker ships in
 * this build) — the row says so instead of pretending.
 */

import { ChevronRight, Globe, Image as ImageIcon, Mic, ShoppingBag, Video, type LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { PressableScale } from '@/components/motion/pressable-scale';
import { Sheet } from '@/components/ui/sheet';
import { useI18n, type Translate } from '@/i18n';
import type { MediaQuota } from '@/schemas/story';
import { colors, spacing } from '@/theme/tokens';

import { humanDuration, remainingShort } from '../quota';

export type AddAction = 'photos' | 'video' | 'purchased';

interface AddMediaSheetProps {
  visible: boolean;
  onClose: () => void;
  quota: MediaQuota;
  /** Photos / videos already waiting in the upload queue. */
  pendingPhotos: number;
  pendingVideos: number;
  hasVoiceMessage: boolean;
  onPick: (action: AddAction) => void;
}

interface RowProps {
  icon: LucideIcon;
  label: string;
  detail: string;
  onPress?: () => void;
  divider?: boolean;
  trailing?: LucideIcon;
}

function Row({ icon: Icon, label, detail, onPress, divider = true, trailing: Trailing = ChevronRight }: RowProps) {
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 60 }}>
      <View style={{ width: 36, height: 36, borderRadius: 10, borderCurve: 'continuous', backgroundColor: colors.goldWash, alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={19} color={colors.accent} strokeWidth={1.9} />
      </View>
      <View
        style={{
          flex: 1,
          alignSelf: 'stretch',
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          paddingVertical: spacing.sm,
          borderBottomWidth: divider ? 1 : 0,
          borderBottomColor: colors.hairline,
        }}>
        <View style={{ flex: 1, gap: 1 }}>
          <AppText variant="bodyStrong" style={{ color: onPress ? colors.foreground : colors.muted }}>
            {label}
          </AppText>
          <AppText variant="caption" tone="subtle" style={{ fontSize: 13 }}>
            {detail}
          </AppText>
        </View>
        <Trailing size={18} color={colors.subtle} />
      </View>
    </View>
  );

  if (!onPress) {
    return (
      <View accessible accessibilityLabel={`${label}. ${detail}`}>
        {body}
      </View>
    );
  }
  return (
    <PressableScale onPress={onPress} scaleTo={0.985} dim haptic="selection" accessibilityRole="button" accessibilityLabel={label} accessibilityHint={detail}>
      {body}
    </PressableScale>
  );
}

function roomLabel(t: Translate, remaining: number, kind: 'photos' | 'videos'): string {
  if (remaining <= 0) return kind === 'photos' ? t('Llegaste al límite de fotos') : t('Llegaste al límite de videos');
  return remainingShort(kind, remaining);
}

export function AddMediaSheet({ visible, onClose, quota, pendingPhotos, pendingVideos, hasVoiceMessage, onPick }: AddMediaSheetProps) {
  const photosLeft = Math.max(0, quota.photos.remaining - pendingPhotos);
  const videosLeft = Math.max(0, quota.videos.remaining - pendingVideos);
  const { t } = useI18n();
  const videoRoom = roomLabel(t, videosLeft, 'videos');
  const videoDetail =
    videosLeft > 0 && quota.videos.max_seconds
      ? t('{room} · hasta {duration}', { room: videoRoom, duration: humanDuration(quota.videos.max_seconds) })
      : videoRoom;

  return (
    <Sheet visible={visible} onClose={onClose}>
      <AppText variant="subtitle" accessibilityRole="header" style={{ marginBottom: spacing.xxs }}>
        {t('Agregar a mi recuerdo')}
      </AppText>
      <Row icon={ImageIcon} label={t('Fotos de mi teléfono')} detail={roomLabel(t, photosLeft, 'photos')} onPress={() => onPick('photos')} />
      <Row icon={Video} label={t('Video de mi teléfono')} detail={videoDetail} onPress={() => onPick('video')} />
      <Row icon={ShoppingBag} label={t('Fotos que compré')} detail={t('Las que compraste a los fotógrafos del evento')} onPress={() => onPick('purchased')} />
      <Row
        icon={Mic}
        label={t('Mensaje de voz')}
        detail={hasVoiceMessage ? t('Ya tienes uno. Para cambiarlo, entra a finisherlegacy.com') : t('Por ahora se agrega desde finisherlegacy.com')}
        divider={false}
        trailing={Globe}
      />
    </Sheet>
  );
}
