import { CircleAlert } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { colors, spacing } from '@/theme/tokens';

interface InlineErrorProps {
  message: string | null | undefined;
  onRetry?: () => void;
}

/** A human, inline error with an optional retry — the alternative to an Alert. */
export function InlineError({ message, onRetry }: InlineErrorProps) {
  if (!message) return null;

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingVertical: 10,
        paddingHorizontal: spacing.sm,
        borderRadius: 12,
        backgroundColor: colors.destructiveWash,
      }}>
      <CircleAlert size={16} color={colors.destructive} />
      <AppText variant="caption" style={{ flex: 1, color: colors.foreground }}>
        {message}
      </AppText>
      {onRetry ? (
        <Pressable onPress={onRetry} hitSlop={12} accessibilityRole="button" style={{ minHeight: 32, justifyContent: 'center' }}>
          <AppText variant="caption" tone="gold">
            Reintentar
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}
