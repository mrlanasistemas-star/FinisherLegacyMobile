import { useState } from 'react';
import { View } from 'react-native';

import { AppError } from '@/api/errors';
import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { FormInput } from '@/components/form-input';
import { InlineError } from '@/components/ui/inline-error';
import { ListRow } from '@/components/ui/list-row';
import { Sheet } from '@/components/ui/sheet';
import { useReport } from '@/hooks/use-social';
import { showToast } from '@/stores/toastStore';
import { colors, spacing } from '@/theme/tokens';
import type { ReportReason, ReportTargetType } from '@/types/social';
import { useI18n, type Translate } from '@/i18n';

/** Built with the sheet's translator so the labels follow the language. */
function reasons(t: Translate): { value: ReportReason; label: string }[] {
  return [
    { value: 'spam', label: t('Spam o publicidad') },
    { value: 'harassment', label: t('Acoso o lenguaje ofensivo') },
    { value: 'inappropriate', label: t('Contenido inapropiado') },
    { value: 'impersonation', label: t('Se hace pasar por otra persona') },
    { value: 'other', label: t('Otro motivo') },
  ];
}

function title(targetType: ReportTargetType, t: Translate): string {
  switch (targetType) {
    case 'profile':
      return t('Reportar perfil');
    case 'moment':
      return t('Reportar momento');
    default:
      return t('Reportar mensaje');
  }
}

interface ReportSheetProps {
  visible: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  /** username (profile) or uuid (moment / comment). */
  target: string;
}

export function ReportSheet({ visible, onClose, targetType, target }: ReportSheetProps) {
  const { t } = useI18n();
  const REASONS = reasons(t);
  const report = useReport();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [error, setError] = useState<string | null>(null);

  function close() {
    setReason(null);
    setDetails('');
    setError(null);
    onClose();
  }

  async function submit() {
    if (!reason) return;
    setError(null);
    try {
      await report.mutateAsync({ target_type: targetType, target, reason, details: details.trim() || undefined });
      close();
      showToast(t('Gracias. Nuestro equipo revisará tu reporte.'), 'success');
    } catch (caught) {
      setError(caught instanceof AppError ? caught.message : t('No pudimos enviar tu reporte. Intenta otra vez.'));
    }
  }

  return (
    <Sheet visible={visible} onClose={close}>
      <View style={{ gap: spacing.sm, paddingBottom: spacing.sm }}>
        <AppText variant="subtitle">{title(targetType, t)}</AppText>
        <AppText variant="caption" tone="muted">
          {t('Tu reporte es anónimo para la otra persona.')}
        </AppText>
        <View>
          {REASONS.map((item, index) => (
            <ListRow
              key={item.value}
              label={item.label}
              onPress={() => setReason(item.value)}
              divider={index < REASONS.length - 1}
              trailing={
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: reason === item.value ? colors.gold : colors.inputBorder,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  {reason === item.value ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.gold }} /> : null}
                </View>
              }
            />
          ))}
        </View>
        {reason === 'other' ? (
          <FormInput placeholder={t('Cuéntanos qué pasó (opcional)')} value={details} onChangeText={setDetails} multiline maxLength={1000} />
        ) : null}
        <InlineError message={error} />
        <AppButton label={t('Enviar reporte')} size="md" onPress={submit} disabled={!reason} loading={report.isPending} />
      </View>
    </Sheet>
  );
}
