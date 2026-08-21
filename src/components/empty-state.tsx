import type { LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { AppButton } from './app-button';
import { AppText } from './app-text';

import { colors, spacing } from '@/theme/tokens';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg, gap: spacing.sm }}>
      <Icon size={40} color={colors.gold} strokeWidth={1.5} />
      <AppText variant="subtitle" align="center" style={{ marginTop: spacing.xs }}>
        {title}
      </AppText>
      <AppText variant="body" tone="muted" align="center">
        {message}
      </AppText>
      {actionLabel && onAction ? (
        <AppButton label={actionLabel} onPress={onAction} fullWidth={false} style={{ marginTop: spacing.sm, paddingHorizontal: spacing.xl }} />
      ) : null}
    </View>
  );
}
