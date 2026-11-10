import * as Device from 'expo-device';
import { Bell, BellOff, CircleAlert } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Linking, Switch, View } from 'react-native';

import { AppError } from '@/api/errors';
import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { Card } from '@/components/card';
import { ListGroup, ListRow } from '@/components/ui/list-row';
import { LargeTitleScroll } from '@/components/ui/top-bar';
import { useNotificationPreferences, useUpdateNotificationPreferences } from '@/hooks/use-notifications';
import { useUnregisterPushDevice } from '@/hooks/use-push-devices';
import { usePushPermission } from '@/hooks/use-push';
import { useUiStore } from '@/stores/uiStore';
import { colors, spacing } from '@/theme/tokens';
import type { NotificationPreferenceRow } from '@/types/models';

/**
 * Push on this phone. Registration logic lives in
 * `features/push/push-registration.ts` (shared with the contextual prompt
 * on Inicio/Notificaciones); this screen is the explicit on/off switch for
 * this phone, plus "Qué te avisamos": per category, push and/or in the app
 * (stored server-side, same switches as the web; the server enforces them).
 */
export default function NotificationSettingsScreen() {
  const { available, permission, pending, enable } = usePushPermission();
  const registeredUuid = useUiStore((state) => state.pushDeviceUuid);
  const setPushDeviceUuid = useUiStore((state) => state.setPushDeviceUuid);
  const unregisterDevice = useUnregisterPushDevice();
  const [error, setError] = useState<string | null>(null);

  async function handleEnable() {
    setError(null);
    const result = await enable();
    if (!result.ok) setError(result.message);
  }

  async function handleDisable() {
    if (!registeredUuid) return;
    setError(null);
    try {
      await unregisterDevice.mutateAsync(registeredUuid);
      setPushDeviceUuid(null);
    } catch (caught) {
      setError(caught instanceof AppError ? caught.message : 'No pudimos desactivar las notificaciones. Intenta de nuevo.');
    }
  }

  const enabledHere = !!registeredUuid && permission === 'granted';

  return (
    <LargeTitleScroll title="Notificaciones">

      <View style={{ gap: spacing.md, marginTop: spacing.sm, paddingBottom: spacing.xl }}>
        <AppText variant="body" tone="muted">
          Recibe un aviso cuando alguien de tu equipo de apoyo te escriba, cuando tu pedido cambie de estado, o cuando haya novedades sobre tus eventos.
        </AppText>

        {!available ? (
          <Card style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <CircleAlert size={18} color={colors.accent} />
              <AppText variant="bodyStrong">No disponible en este teléfono</AppText>
            </View>
            <AppText variant="caption" tone="muted">
              {!Device.isDevice
                ? 'Las notificaciones push sólo funcionan en un teléfono físico, no en un simulador.'
                : 'Esta versión de la app todavía no puede recibir avisos. Llegarán con la próxima actualización.'}
            </AppText>
          </Card>
        ) : enabledHere ? (
          <Card style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Bell size={18} color={colors.accent} />
              <AppText variant="bodyStrong">Notificaciones activadas en este teléfono</AppText>
            </View>
            <AppButton label="Desactivar en este teléfono" variant="secondary" onPress={handleDisable} loading={unregisterDevice.isPending} />
          </Card>
        ) : (
          <Card style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <BellOff size={18} color={colors.muted} />
              <AppText variant="bodyStrong">Notificaciones desactivadas</AppText>
            </View>
            {permission === 'denied' ? (
              <>
                <AppText variant="caption" tone="muted">
                  Las bloqueaste en los ajustes del teléfono. Actívalas ahí y vuelve aquí.
                </AppText>
                <AppButton label="Abrir ajustes del teléfono" variant="secondary" onPress={() => Linking.openSettings()} />
              </>
            ) : (
              <AppButton label="Activar notificaciones" onPress={handleEnable} loading={pending} />
            )}
          </Card>
        )}

        {error ? (
          <AppText variant="caption" tone="destructive">
            {error}
          </AppText>
        ) : null}

        <CategoryPreferences />
      </View>
    </LargeTitleScroll>
  );
}

function CategoryPreferences() {
  const { data, isPending, isError, refetch } = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();

  function toggle(row: NotificationPreferenceRow, channel: 'push' | 'in_app', value: boolean) {
    update.mutate({ [row.key]: { [channel]: value } });
  }

  if (isPending) return <ActivityIndicator color={colors.accent} style={{ marginVertical: spacing.md }} />;
  if (isError || !data) {
    return (
      <View style={{ gap: spacing.xs }}>
        <AppText variant="caption" tone="destructive">
          No pudimos cargar tus preferencias.
        </AppText>
        <AppButton label="Reintentar" variant="secondary" onPress={() => refetch()} />
      </View>
    );
  }

  return (
    <View style={{ gap: spacing.md }}>
      <AppText variant="eyebrow" tone="subtle" style={{ marginLeft: spacing.md }}>
        Qué te avisamos
      </AppText>
      {data.categories.map((row) => (
        <ListGroup key={row.key} title={row.label} footer={row.description}>
          <ListRow
            label="En tu teléfono (push)"
            trailing={
              <PreferenceSwitch value={row.push} disabled={update.isPending} label={`${row.label}: push`} onChange={(value) => toggle(row, 'push', value)} />
            }
          />
          <ListRow
            label="En la app y la web"
            divider={false}
            trailing={
              <PreferenceSwitch value={row.in_app} disabled={update.isPending} label={`${row.label}: en la app`} onChange={(value) => toggle(row, 'in_app', value)} />
            }
          />
        </ListGroup>
      ))}
      {update.isError ? (
        <AppText variant="caption" tone="destructive">
          No pudimos guardar el cambio. Intenta de nuevo.
        </AppText>
      ) : null}
    </View>
  );
}

function PreferenceSwitch({ value, disabled, label, onChange }: { value: boolean; disabled: boolean; label: string; onChange: (value: boolean) => void }) {
  return (
    <Switch
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      trackColor={{ false: colors.surfaceMuted, true: colors.gold }}
      thumbColor={colors.white}
      ios_backgroundColor={colors.surfaceMuted}
      accessibilityLabel={label}
    />
  );
}
