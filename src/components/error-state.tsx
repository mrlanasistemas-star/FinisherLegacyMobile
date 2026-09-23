import { CloudOff, TriangleAlert } from 'lucide-react-native';
import { View } from 'react-native';

import { AppButton } from './app-button';
import { AppText } from './app-text';

import { AppError } from '@/api/errors';
import { colors, spacing } from '@/theme/tokens';

interface ErrorStateProps {
  message?: string;
  /** Pass the query error to get the right icon/copy for offline vs. server. */
  error?: unknown;
  onRetry?: () => void;
}

/** Full-area error with a retry. Never shows codes, stack traces or "AxiosError". */
export function ErrorState({ message, error, onRetry }: ErrorStateProps) {
  const offline = error instanceof AppError && (error.kind === 'network' || error.kind === 'timeout');
  const Icon = offline ? CloudOff : TriangleAlert;
  const text = offline
    ? 'Sin conexión. Revisa tu red y vuelve a intentarlo.'
    : (message ?? 'No pudimos cargar esta información.');

  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg, gap: spacing.sm }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.graphite, alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={28} color={offline ? colors.muted : colors.destructive} strokeWidth={1.6} />
      </View>
      <AppText variant="body" tone="muted" align="center" style={{ maxWidth: 300 }} accessibilityRole="alert">
        {text}
      </AppText>
      {onRetry ? <AppButton label="Reintentar" variant="secondary" size="md" onPress={onRetry} fullWidth={false} style={{ minWidth: 160 }} /> : null}
    </View>
  );
}
