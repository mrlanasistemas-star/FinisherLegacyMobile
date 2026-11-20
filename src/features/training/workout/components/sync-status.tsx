import * as Network from 'expo-network';
import { Cloud, CloudOff, LogIn, RefreshCw } from 'lucide-react-native';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { useI18n } from '@/i18n';
import { colors, fontFamily, radius, spacing } from '@/theme/tokens';

import { useWorkoutOutbox } from '../workout-outbox';

/**
 * Connection + sync line for Modo entrenamiento: online and up to date,
 * offline (everything is saved on the phone and sent later), syncing N
 * pending items, or waiting for login. Honest status, never a fake "saved".
 */
export function SyncStatus({ compact = false }: { compact?: boolean }) {
  const { t, tc } = useI18n();
  const network = Network.useNetworkState();
  const pending = useWorkoutOutbox((s) => s.ops.length);
  const blocked = useWorkoutOutbox((s) => s.blocked);
  const offline = network.isConnected === false || network.isInternetReachable === false;

  let Icon = Cloud;
  let tone: string = colors.success;
  let label = t('En línea · todo guardado');
  if (blocked === 'login') {
    Icon = LogIn;
    tone = colors.destructive;
    label = t('Inicia sesión de nuevo para sincronizar tus entrenamientos');
  } else if (offline) {
    Icon = CloudOff;
    tone = colors.muted;
    label = pending > 0 ? tc('Sin conexión · {count} pendiente se enviará al volver la señal|Sin conexión · {count} pendientes se enviarán al volver la señal', pending) : t('Sin conexión · tu entrenamiento se guarda en el teléfono');
  } else if (pending > 0) {
    Icon = RefreshCw;
    tone = colors.accent;
    label = tc('Sincronizando {count} entrenamiento…|Sincronizando {count} entrenamientos…', pending);
  }

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLiveRegion="polite"
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        alignSelf: compact ? 'center' : 'flex-start',
        paddingHorizontal: spacing.sm,
        paddingVertical: 5,
        borderRadius: radius.pill,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.hairline,
      }}>
      <Icon size={14} color={tone} />
      <AppText variant="caption" style={{ color: tone === colors.success ? colors.success : colors.muted, fontFamily: fontFamily.medium }} numberOfLines={2}>
        {label}
      </AppText>
    </View>
  );
}
