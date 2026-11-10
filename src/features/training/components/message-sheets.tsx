import { Ban, CloudCheck, CloudDownload, EyeOff, Play, Star } from 'lucide-react-native';
import { Platform, Switch, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { ListGroup, ListRow } from '@/components/ui/list-row';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Sheet } from '@/components/ui/sheet';
import { SheetActionRow } from '@/components/ui/sheet-action-row';
import { useI18n } from '@/i18n';
import type { TrainingMessage } from '@/schemas/training';
import { colors, spacing } from '@/theme/tokens';

import type { MixMode } from '../audio-driver';
import { mixModeCaption, type Os } from '../audio-session';
import { isOfflineAvailable } from '../offline-cache';
import { useTrainingSettings } from '../settings-store';
import { SenderAvatar } from './message-visuals';

/**
 * Bottom sheets of Entrenamientos:
 * - `MessageActionsSheet` — long-press menu of a message (play, favorite,
 *   offline, hide, block the sender).
 * - `AudioSettingsSheet` — "Mezclar con mi música" vs "Pausar mi música"
 *   (with one line on what that means for the lock-screen controls on this
 *   platform) and "Mantener pantalla encendida".
 */

interface MessageActionsSheetProps {
  message: TrainingMessage | null;
  offline: boolean;
  onClose: () => void;
  onPlay: (message: TrainingMessage) => void;
  onToggleFavorite: (message: TrainingMessage) => void;
  onToggleOffline: (message: TrainingMessage) => void;
  onHide: (message: TrainingMessage) => void;
  onBlock: (message: TrainingMessage) => void;
}

export function MessageActionsSheet({ message, offline, onClose, onPlay, onToggleFavorite, onToggleOffline, onHide, onBlock }: MessageActionsSheetProps) {
  const { t } = useI18n();
  if (!message) return null;
  const run = (action: (m: TrainingMessage) => void) => () => {
    onClose();
    action(message);
  };
  return (
    <Sheet visible onClose={onClose}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs }}>
        <SenderAvatar name={message.sender_name} icon={message.icon} size={40} />
        <View style={{ flex: 1 }}>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {message.sender_name}
          </AppText>
          {message.relationship ? (
            <AppText variant="caption" tone="subtle" numberOfLines={1}>
              {message.relationship}
            </AppText>
          ) : null}
        </View>
      </View>
      <SheetActionRow icon={Play} label={t('Escuchar')} onPress={run(onPlay)} />
      <SheetActionRow icon={Star} label={message.favorite ? t('Quitar de favoritos') : t('Marcar como favorito')} onPress={run(onToggleFavorite)} />
      {message.audio_url && isOfflineAvailable() ? (
        <SheetActionRow
          icon={offline ? CloudCheck : CloudDownload}
          label={offline ? t('Quitar descarga') : t('Disponible sin conexión')}
          onPress={run(onToggleOffline)}
        />
      ) : null}
      <SheetActionRow icon={EyeOff} label={t('Ocultar mensaje')} onPress={run(onHide)} />
      <SheetActionRow icon={Ban} label={t('Bloquear a {name}', { name: message.sender_name })} destructive onPress={run(onBlock)} />
    </Sheet>
  );
}


export function AudioSettingsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const mixOptions: { value: MixMode; label: string }[] = [
    { value: 'mix', label: t('Mezclar con mi música') },
    { value: 'pause', label: t('Pausar mi música') },
  ];
  const mixMode = useTrainingSettings((s) => s.mixMode);
  const setMixMode = useTrainingSettings((s) => s.setMixMode);
  const keepAwake = useTrainingSettings((s) => s.keepAwake);
  const setKeepAwake = useTrainingSettings((s) => s.setKeepAwake);
  if (!visible) return null;
  return (
    <Sheet visible onClose={onClose}>
      <View style={{ gap: spacing.md }}>
        <AppText variant="subtitle">{t('Audio del entrenamiento')}</AppText>
        <View style={{ gap: spacing.xs }}>
          <SegmentedControl options={mixOptions} value={mixMode} onChange={setMixMode} />
          <AppText variant="caption" tone="muted">
            {mixModeCaption(Platform.OS as Os, mixMode)}
          </AppText>
        </View>
        <ListGroup>
          <ListRow
            label={t('Mantener pantalla encendida')}
            description={t('Solo durante el Modo entrenamiento')}
            divider={false}
            trailing={
              <Switch
                value={keepAwake}
                onValueChange={setKeepAwake}
                trackColor={{ false: colors.surfaceMuted, true: colors.gold }}
                thumbColor={colors.white}
                ios_backgroundColor={colors.surfaceMuted}
                accessibilityLabel={t('Mantener pantalla encendida')}
              />
            }
          />
        </ListGroup>
      </View>
    </Sheet>
  );
}
