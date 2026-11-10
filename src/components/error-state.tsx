import { CloudOff, TriangleAlert } from 'lucide-react-native';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { AppButton } from './app-button';
import { AppText } from './app-text';

import { AppError } from '@/api/errors';
import { colors, spacing } from '@/theme/tokens';
import { useI18n } from '@/i18n';

interface ErrorStateProps {
  message?: string;
  /** Pass the query error to get the right icon/copy for offline vs. server. */
  error?: unknown;
  onRetry?: () => void;
  /** Overrides the default title (e.g. "Perfil no disponible" for a 404). */
  title?: string;
  /** Adds a "Volver" action — use it whenever retrying makes no sense (not found / private). */
  onBack?: () => void;
}

/** Full-area error with a retry. Never shows codes, stack traces or "AxiosError". */
export function ErrorState({ message, error, onRetry, title: customTitle, onBack }: ErrorStateProps) {
  const { t } = useI18n();
  const offline = error instanceof AppError && (error.kind === 'network' || error.kind === 'timeout');
  const Icon = offline ? CloudOff : TriangleAlert;
  const title = offline ? t('Sin conexión') : (customTitle ?? t('Algo no salió bien'));
  const text = offline ? t('Revisa tu red y vuelve a intentarlo.') : (message ?? t('No pudimos cargar esta información.'));

  return (
    <Animated.View entering={FadeIn.duration(220)} style={{ alignItems: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg, gap: spacing.sm }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: offline ? colors.surfaceMuted : colors.destructiveWash,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.xxs,
        }}>
        <Icon size={30} color={offline ? colors.muted : colors.destructive} strokeWidth={1.6} />
      </View>
      <AppText variant="subtitle" align="center" accessibilityRole="header">
        {title}
      </AppText>
      <AppText variant="body" tone="muted" align="center" style={{ maxWidth: 300 }} accessibilityRole="alert">
        {text}
      </AppText>
      {onRetry ? (
        <AppButton label={t('Reintentar')} variant="secondary" size="md" onPress={onRetry} fullWidth={false} style={{ minWidth: 160, alignSelf: 'center', marginTop: spacing.xs }} />
      ) : null}
      {onBack ? (
        <AppButton label={t('Volver')} variant={onRetry ? 'ghost' : 'secondary'} size="md" onPress={onBack} fullWidth={false} style={{ minWidth: 160, alignSelf: 'center', marginTop: onRetry ? 0 : spacing.xs }} />
      ) : null}
    </Animated.View>
  );
}
