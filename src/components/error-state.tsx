import { TriangleAlert } from 'lucide-react-native';
import { View } from 'react-native';

import { AppButton } from './app-button';
import { AppText } from './app-text';

import { colors, spacing } from '@/theme/tokens';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = 'No pudimos cargar esta información.', onRetry }: ErrorStateProps) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg, gap: spacing.sm }}>
      <TriangleAlert size={36} color={colors.destructive} strokeWidth={1.5} />
      <AppText variant="body" tone="muted" align="center">
        {message}
      </AppText>
      {onRetry ? (
        <AppButton label="Reintentar" variant="secondary" onPress={onRetry} fullWidth={false} style={{ paddingHorizontal: spacing.xl }} />
      ) : null}
    </View>
  );
}
