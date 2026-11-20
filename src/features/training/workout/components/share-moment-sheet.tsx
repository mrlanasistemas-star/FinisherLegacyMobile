import { useState } from 'react';
import { View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { FormInput } from '@/components/form-input';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Sheet } from '@/components/ui/sheet';
import { useI18n } from '@/i18n';
import { showToast } from '@/stores/toastStore';
import { spacing } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';

import { useShareWorkout } from '../use-workouts';

type Visibility = 'private' | 'followers' | 'public';

/**
 * "Compartir como Legacy Moment" — the athlete's explicit choice, private by
 * default ("Solo yo"). Creates the Moment on the server (POST
 * training/workouts/{uuid}/share); nothing is ever published automatically.
 */
export function ShareMomentSheet({ uuid, visible, onClose, onShared }: { uuid: string; visible: boolean; onClose: () => void; onShared?: (momentUuid: string) => void }) {
  const { t } = useI18n();
  const [visibility, setVisibility] = useState<Visibility>('private');
  const [caption, setCaption] = useState('');
  const share = useShareWorkout(uuid);

  const options: { value: Visibility; label: string }[] = [
    { value: 'private', label: t('Solo yo') },
    { value: 'followers', label: t('Seguidores') },
    { value: 'public', label: t('Público') },
  ];

  const submit = () => {
    share.mutate(
      { visibility, caption: caption.trim() || null },
      {
        onSuccess: (result) => {
          haptics.success();
          showToast(t('Tu momento ya es parte de tu Legacy.'), 'success');
          onShared?.(result.moment.uuid);
          onClose();
        },
        onError: (error) => showToast(error.message, 'destructive'),
      },
    );
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={{ gap: spacing.md }}>
        <AppText variant="subtitle">{t('Compartir como Legacy Moment')}</AppText>
        <AppText variant="caption" tone="muted">
          {t('Se crea un momento con tu actividad, tiempo y distancia. Tú eliges quién lo ve.')}
        </AppText>
        <SegmentedControl options={options} value={visibility} onChange={setVisibility} />
        <FormInput label={t('Texto (opcional)')} value={caption} onChangeText={setCaption} maxLength={500} multiline placeholder={t('¿Cómo te sentiste hoy?')} />
        <AppButton label={t('Compartir')} onPress={submit} loading={share.isPending} />
      </View>
    </Sheet>
  );
}
