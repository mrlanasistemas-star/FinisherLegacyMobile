import { CircleCheck } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { AppError } from '@/api/errors';
import { preregister } from '@/api/preregistrations';
import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { FormInput } from '@/components/form-input';
import { Chip } from '@/components/ui/chip';
import { InlineError } from '@/components/ui/inline-error';
import { Sheet } from '@/components/ui/sheet';
import { useAuthStore } from '@/stores/authStore';
import { colors, fontFamily, spacing } from '@/theme/tokens';
import type { EventRace } from '@/types/models';
import { haptics } from '@/utils/haptics';
import { ensureOnline } from '@/utils/network';
import { useI18n } from '@/i18n';

interface PreregistrationSheetProps {
  visible: boolean;
  onClose: () => void;
  editionId: number;
  eventName: string;
  races: EventRace[];
}

/** Preregister for an edition — prefilled from the account, race picked by its public uuid. */
export function PreregistrationSheet({ visible, onClose, editionId, eventName, races }: PreregistrationSheetProps) {
  const { t } = useI18n();
  const user = useAuthStore((s) => s.user);
  const [raceUuid, setRaceUuid] = useState<string | null>(races.length === 1 ? races[0].uuid : null);
  const [firstName, setFirstName] = useState(user?.first_name ?? '');
  const [lastName, setLastName] = useState(user?.last_name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    setError(null);
    setFieldErrors({});
    if (!raceUuid) {
      setError(t('Elige tu distancia.'));
      return;
    }
    setSaving(true);
    try {
      await ensureOnline();
      await preregister(editionId, {
        event_race_uuid: raceUuid,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
      });
      haptics.success();
      setDone(true);
    } catch (caught) {
      if (caught instanceof AppError && caught.fieldErrors) {
        const mapped: Record<string, string> = {};
        for (const [field, messages] of Object.entries(caught.fieldErrors)) mapped[field] = messages[0];
        setFieldErrors(mapped);
      } else if (caught instanceof AppError && caught.kind === 'forbidden') {
        setError(t('El prerregistro para este evento ya cerró.'));
      } else {
        setError(caught instanceof AppError ? caught.message : t('No pudimos completar tu prerregistro. Intenta otra vez.'));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose}>
      {done ? (
        <View style={{ alignItems: 'center', gap: spacing.md, paddingBottom: spacing.lg }}>
          <CircleCheck size={44} color={colors.accent} />
          <AppText variant="subtitle" align="center">
            {t('¡Listo! Ya estás prerregistrado')}
          </AppText>
          <AppText variant="body" tone="muted" align="center">
            {t('Te enviaremos la confirmación de {event} a {email}. Nos vemos en la salida.', { event: eventName, email: email.trim() })}
          </AppText>
          <AppButton label={t('Cerrar')} size="md" onPress={onClose} />
        </View>
      ) : (
        <ScrollView style={{ maxHeight: 560 }} keyboardShouldPersistTaps="handled">
          <View style={{ gap: spacing.md, paddingBottom: spacing.md }}>
            <AppText style={{ fontFamily: fontFamily.semibold, fontSize: 18 }}>{t('Prerregistro · {event}', { event: eventName })}</AppText>
            <View style={{ gap: spacing.xs }}>
              <AppText variant="caption" tone="muted">
                {t('Distancia')}
              </AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                {races.map((race) => (
                  <Chip key={race.uuid} label={race.name} selected={raceUuid === race.uuid} onPress={() => setRaceUuid(race.uuid)} />
                ))}
              </View>
              {fieldErrors.event_race_uuid ? (
                <AppText variant="caption" tone="destructive">
                  {fieldErrors.event_race_uuid}
                </AppText>
              ) : null}
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <FormInput containerStyle={{ flex: 1 }} label={t('Nombre||nombre de pila')} kind="name" value={firstName} onChangeText={setFirstName} error={fieldErrors.first_name} />
              <FormInput containerStyle={{ flex: 1 }} label={t('Apellido')} kind="name" value={lastName} onChangeText={setLastName} error={fieldErrors.last_name} />
            </View>
            <FormInput label={t('Correo')} kind="email" value={email} onChangeText={setEmail} error={fieldErrors.email} />
            <FormInput label={t('Teléfono (opcional)')} kind="phone" value={phone} onChangeText={setPhone} error={fieldErrors.phone} />
            <InlineError message={error} />
            <AppButton label={t('Confirmar prerregistro')} size="md" onPress={submit} loading={saving} />
          </View>
        </ScrollView>
      )}
    </Sheet>
  );
}
