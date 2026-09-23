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

const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'spam', label: 'Spam o publicidad' },
  { value: 'harassment', label: 'Acoso o lenguaje ofensivo' },
  { value: 'inappropriate', label: 'Contenido inapropiado' },
  { value: 'impersonation', label: 'Se hace pasar por otra persona' },
  { value: 'other', label: 'Otro motivo' },
];

const TITLES: Record<ReportTargetType, string> = {
  profile: 'Reportar perfil',
  moment: 'Reportar momento',
  comment: 'Reportar mensaje',
};

interface ReportSheetProps {
  visible: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  /** username (profile) or uuid (moment / comment). */
  target: string;
}

export function ReportSheet({ visible, onClose, targetType, target }: ReportSheetProps) {
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
      showToast('Gracias. Nuestro equipo revisará tu reporte.', 'success');
    } catch (caught) {
      setError(caught instanceof AppError ? caught.message : 'No pudimos enviar tu reporte. Intenta otra vez.');
    }
  }

  return (
    <Sheet visible={visible} onClose={close}>
      <View style={{ gap: spacing.sm, paddingBottom: spacing.sm }}>
        <AppText variant="subtitle">{TITLES[targetType]}</AppText>
        <AppText variant="caption" tone="muted">
          Tu reporte es anónimo para la otra persona.
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
          <FormInput placeholder="Cuéntanos qué pasó (opcional)" value={details} onChangeText={setDetails} multiline maxLength={1000} />
        ) : null}
        <InlineError message={error} />
        <AppButton label="Enviar reporte" size="md" onPress={submit} disabled={!reason} loading={report.isPending} />
      </View>
    </Sheet>
  );
}
