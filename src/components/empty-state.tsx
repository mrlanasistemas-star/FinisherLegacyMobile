import type { LucideIcon } from 'lucide-react-native';
import { View, type ViewStyle } from 'react-native';

import { AppButton } from './app-button';
import { AppText } from './app-text';

import { colors, spacing } from '@/theme/tokens';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Tighter vertical rhythm for inline sections (not full screens). */
  compact?: boolean;
  style?: ViewStyle;
}

/**
 * Every empty screen says what this place is for and offers the next useful
 * step — never a bare "no data".
 */
export function EmptyState({
  icon: Icon,
  title,
  message,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  compact = false,
  style,
}: EmptyStateProps) {
  return (
    <View
      style={[
        { alignItems: 'center', paddingVertical: compact ? spacing.lg : spacing.xxl, paddingHorizontal: spacing.lg, gap: spacing.sm },
        style,
      ]}>
      <View
        style={{
          width: compact ? 56 : 72,
          height: compact ? 56 : 72,
          borderRadius: compact ? 28 : 36,
          backgroundColor: colors.goldWash,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.xxs,
        }}>
        <Icon size={compact ? 24 : 30} color={colors.gold} strokeWidth={1.6} />
      </View>
      <AppText variant="subtitle" align="center" accessibilityRole="header">
        {title}
      </AppText>
      <AppText variant="body" tone="muted" align="center" style={{ maxWidth: 320 }}>
        {message}
      </AppText>
      {actionLabel && onAction ? (
        <AppButton label={actionLabel} onPress={onAction} size="md" fullWidth={false} style={{ marginTop: spacing.xs, minWidth: 200 }} />
      ) : null}
      {secondaryLabel && onSecondary ? (
        <AppButton label={secondaryLabel} onPress={onSecondary} size="md" variant="ghost" fullWidth={false} />
      ) : null}
    </View>
  );
}
